// ═══════════════════════════════════════════════════════════
// CaseFlow — Case Study Service
// Auto-generates case studies from completed interviews.
// ═══════════════════════════════════════════════════════════

import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { InterviewAnswerRepository } from "@/lib/repositories/interview-answer.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { UsageRepository } from "@/lib/repositories/usage.repository";
import { EventService } from "@/lib/services/event.service";
import { canCreateCaseStudy } from "@/lib/plans";
import { PlanLimitError, NotFoundError } from "@/lib/errors";
import type { CaseStudy, ServiceResult, InterviewAnswer } from "@/types";

export const CaseStudyService = {
  /**
   * Generate a case study from a completed interview.
   * Extracts structured data, computes metrics, saves as draft.
   */
  async generateFromInterview(
    orgId: string,
    interviewId: string
  ): Promise<ServiceResult<CaseStudy>> {
    // 1. Verify interview exists and is completed
    const interview = await InterviewRepository.findById(orgId, interviewId);
    if (!interview) throw new NotFoundError("Interview");

    if (interview.status !== "completed" && interview.status !== "approved") {
      return { success: false, error: "Interview must be completed first", code: "INVALID_STATE" };
    }

    // 2. Get answers
    const answers = await InterviewAnswerRepository.findByInterview(interviewId);
    if (answers.length === 0) {
      return { success: false, error: "No answers found for this interview", code: "NO_DATA" };
    }

    // 3. Extract structured data from answers
    const extracted = this.extractCaseStudyData(answers);

    // 4. Compute delta_percent
    const deltaPercent = this.computeDelta(extracted.before, extracted.after);

    // 5. Generate slug
    const slug = this.generateSlug(extracted.companyName || interview.client_email);

    // 6. Create case study as draft
    const caseStudy = await CaseStudyRepository.create(orgId, {
      company_name: extracted.companyName || interview.client_name || interview.client_email.split("@")[0],
      interview_id: interviewId,
      headline: extracted.headline,
      metric_type: extracted.metricType,
      before_value: extracted.before,
      after_value: extracted.after,
      delta_percent: deltaPercent ?? undefined,
      timeframe: extracted.timeframe,
      slug,
    });



    return { success: true, data: caseStudy };
  },

  /**
   * Raw creation of a case study (used by AI engine)
   */
  async create(
    orgId: string,
    interviewId: string,
    data: {
      metricType: string;
      before: string | null;
      after: string | null;
      timeframe: string;
      deltaPercent: number | null;
    }
  ): Promise<CaseStudy> {
    const interview = await InterviewRepository.findById(orgId, interviewId);
    const slug = this.generateSlug(interview?.client_name || interview?.client_email || "case-study");

    const caseStudy = await CaseStudyRepository.create(orgId, {
      company_name: interview?.client_name || interview?.client_email.split("@")[0] || "Client",
      interview_id: interviewId,
      headline: `${interview?.client_name || "Client"} achieved ${data.metricType} results`,
      metric_type: data.metricType,
      before_value: data.before || undefined,
      after_value: data.after || undefined,
      delta_percent: data.deltaPercent ?? undefined,
      timeframe: data.timeframe,
      slug,
    });

    try {
      await EventService.caseStudyCreated(orgId, caseStudy.id, caseStudy.company_name);
    } catch { /* silent */ }
    return caseStudy;
  },

  /**
   * List all case studies for an org
   */
  async getByOrg(orgId: string): Promise<CaseStudy[]> {
    return CaseStudyRepository.findByOrg(orgId);
  },

  /**
   * Get single case study (org-scoped)
   */
  async getById(orgId: string, id: string): Promise<CaseStudy | null> {
    return CaseStudyRepository.findById(orgId, id);
  },

  /**
   * Get public case study + increment views + log event
   */
  async getPublic(id: string, metadata?: Record<string, unknown>): Promise<ServiceResult<CaseStudy>> {
    const caseStudy = await CaseStudyRepository.findPublicById(id);
    if (!caseStudy) throw new NotFoundError("Case study");

    // Increment views
    await CaseStudyRepository.incrementViews(id);

    // Log view event
    await EventService.caseStudyViewed(
      caseStudy.org_id,
      caseStudy.id,
      metadata
    );

    return { success: true, data: caseStudy };
  },

  /**
   * Get public case study by slug
   */
  async getPublicBySlug(slug: string, metadata?: Record<string, unknown>): Promise<ServiceResult<CaseStudy>> {
    const caseStudy = await CaseStudyRepository.findPublicBySlug(slug);
    if (!caseStudy) throw new NotFoundError("Case study");

    await CaseStudyRepository.incrementViews(caseStudy.id);
    await EventService.caseStudyViewed(
      caseStudy.org_id,
      caseStudy.id,
      metadata
    );

    return { success: true, data: caseStudy };
  },

  /**
   * Approve case study: draft → pending
   */
  async approve(orgId: string, id: string): Promise<ServiceResult<CaseStudy>> {
    const cs = await CaseStudyRepository.findById(orgId, id);
    if (!cs) throw new NotFoundError("Case study");

    if (cs.status !== "draft") {
      return { success: false, error: "Only drafts can be approved", code: "INVALID_STATE" };
    }

    const updated = await CaseStudyRepository.update(orgId, id, { status: "pending" });
    return { success: true, data: updated };
  },

  /**
   * Publish case study: pending → live + increment usage + log event
   */
  async publish(orgId: string, id: string): Promise<ServiceResult<CaseStudy>> {
    const cs = await CaseStudyRepository.findById(orgId, id);
    if (!cs) throw new NotFoundError("Case study");

    if (cs.status !== "pending" && cs.status !== "draft") {
      return { success: false, error: "Only pending or draft case studies can be published", code: "INVALID_STATE" };
    }

    // Check plan limit
    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");

    const usage = await UsageRepository.getOrCreate(orgId);
    const limitCheck = canCreateCaseStudy(org, usage);
    if (!limitCheck.allowed) {
      throw new PlanLimitError(limitCheck.reason!);
    }

    const updated = await CaseStudyRepository.update(orgId, id, { status: "live" });

    // Increment usage
    await UsageRepository.incrementCaseStudies(orgId);

    // Log event
    await EventService.caseStudyPublished(orgId, id, cs.company_name);

    return { success: true, data: updated };
  },

  /**
   * Update case study fields
   */
  async update(
    orgId: string,
    id: string,
    updates: Partial<CaseStudy>
  ): Promise<ServiceResult<CaseStudy>> {
    const cs = await CaseStudyRepository.findById(orgId, id);
    if (!cs) throw new NotFoundError("Case study");

    const updated = await CaseStudyRepository.update(orgId, id, updates);

    // If status transitioned to live, sync usage and log event
    if (updates.status === 'live' && cs.status !== 'live') {
      const { UsageRepository } = await import("@/lib/repositories/usage.repository");
      await UsageRepository.sync(orgId);
      await EventService.caseStudyPublished(orgId, id, updated.company_name);
    }

    return { success: true, data: updated };
  },



  /**
   * Delete case study
   */
  async delete(orgId: string, id: string): Promise<void> {
    await CaseStudyRepository.delete(orgId, id);
  },

  // ─── Private Helpers ─────────────────────────────────────

  /**
   * Extract structured case study data from interview answers
   */
  extractCaseStudyData(answers: InterviewAnswer[]): {
    companyName?: string;
    headline?: string;
    metricType?: string;
    before?: string;
    after?: string;
    timeframe?: string;
  } {
    const result: Record<string, unknown> = {};

    for (const answer of answers) {
      const lowerQ = answer.question.toLowerCase();
      const extracted = answer.extracted as Record<string, unknown> | null;

      if (lowerQ.includes("company") || lowerQ.includes("name") || lowerQ.includes("organization")) {
        result.companyName = answer.answer.trim();
      }

      if (lowerQ.includes("improve") || lowerQ.includes("result") || lowerQ.includes("metric") || lowerQ.includes("what changed")) {
        result.metricType = answer.answer.trim();
        if (answer.answer.length < 100) {
          result.headline = `${result.companyName || "Client"} achieved ${answer.answer.trim()}`;
        }
      }

      if (lowerQ.includes("before") || lowerQ.includes("prior") || lowerQ.includes("starting")) {
        result.before = answer.answer.trim();
      }

      if (lowerQ.includes("after") || lowerQ.includes("now") || lowerQ.includes("current") || lowerQ.includes("result")) {
        if (!result.metricType) result.after = answer.answer.trim();
        else if (!result.after) result.after = answer.answer.trim();
      }

      if (lowerQ.includes("time") || lowerQ.includes("how long") || lowerQ.includes("period")) {
        result.timeframe = answer.answer.trim();
        if (extracted?.timeframe) result.timeframe = extracted.timeframe as string;
      }


    }

    return result as ReturnType<typeof CaseStudyService.extractCaseStudyData>;
  },

  /**
   * Compute delta percentage between before and after values
   */
  computeDelta(before?: string, after?: string): number | null {
    if (!before || !after) return null;

    const parseMagnitude = (val: string): number | null => {
      const cleaned = val.replace(/[,$%\s]/g, "").toLowerCase();
      const match = cleaned.match(/([\d.]+)(k|m|b)?/);
      if (!match) return null;
      let num = parseFloat(match[1]);
      if (match[2] === "k") num *= 1000;
      if (match[2] === "m") num *= 1000000;
      if (match[2] === "b") num *= 1000000000;
      return num;
    };

    const beforeNum = parseMagnitude(before);
    const afterNum = parseMagnitude(after);

    if (beforeNum === null || afterNum === null || beforeNum === 0) return null;

    return Math.round(((afterNum - beforeNum) / beforeNum) * 100);
  },

  /**
   * Generate URL-safe slug from company name
   */
  generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${base}-${suffix}`;
  },
};
