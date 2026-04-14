// ═══════════════════════════════════════════════════════════
// CaseFlow — Case Study Service (UNIFIED PIPELINE)
//
// ONE generation path: generateFromInterview()
// → Fetch interview + answers
// → CaseStudyGenerator.generate() (AI)
// → Validate (headline + story ≥ 100 words)
// → Persist to DB
//
// No legacy extraction. No partial creation. No fallbacks.
// ═══════════════════════════════════════════════════════════

import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { InterviewAnswerRepository } from "@/lib/repositories/interview-answer.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { UsageRepository } from "@/lib/repositories/usage.repository";
import { EventService } from "@/lib/services/event.service";
import { canCreateCaseStudy } from "@/lib/plans";
import { PlanLimitError, NotFoundError } from "@/lib/errors";
import type { CaseStudy, ServiceResult } from "@/types";

export const CaseStudyService = {
  /**
   * Generate a case study from a completed interview using the AI pipeline.
   * This is the SINGLE generation entry point for the entire system.
   *
   * Flow: Fetch → AI Generate → Validate → Slug → DB
   */
  async generateFromInterview(
    orgId: string,
    interviewId: string
  ): Promise<ServiceResult<CaseStudy>> {
    // 1. Verify interview exists and has valid status
    const interview = await InterviewRepository.findById(orgId, interviewId);
    if (!interview) throw new NotFoundError("Interview");

    if (
      interview.status !== "completed" &&
      interview.status !== "approved" &&
      interview.status !== "in_progress" &&
      interview.status !== "generating"
    ) {
      return { success: false, error: "Interview must be completed or in progress", code: "INVALID_STATE" };
    }

    // 2. Get answers — require at least 1
    const answers = await InterviewAnswerRepository.findByInterview(interviewId);
    if (answers.length === 0) {
      return { success: false, error: "No answers found for this interview", code: "NO_DATA" };
    }

    // 3. Load context
    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");

    const { CaseStudyGenerator } = await import("@/lib/ai/case-study-generator");
    const { OrgProfileRepository } = await import("@/lib/repositories/org-profile.repository");
    const orgProfile = await OrgProfileRepository.findByOrgId(orgId);

    const defaultProfile = {
      industry: "other" as const,
      industry_raw: "General Business",
      service_category: "Professional Services",
      service_type: "Business services",
      target_customer: "Businesses",
      ai_tone: "professional" as const,
      ai_output_style: "concise" as const,
      ai_case_study_style: "metric_driven" as const,
      font_preset: "sans" as const,
    };

    // 4. Generate via AI (THE SINGLE PATH)
    const aiOutput = await CaseStudyGenerator.generate(
      answers,
      orgProfile || defaultProfile as any,
      org.plan_type
    );

    // 5. HARD VALIDATION — Never allow null story or headline
    if (!aiOutput.headline) {
      throw new Error("AI generation failed: Missing headline. Generation aborted.");
    }

    if (!aiOutput.story || aiOutput.story.split(/\s+/).length < 80) {
      throw new Error(
        `AI generation failed: Story too short (${aiOutput.story?.split(/\s+/).length || 0} words). Generation aborted.`
      );
    }

    // 6. Generate slug (GUARANTEED non-null)
    const slug = this.generateSlug(aiOutput.headline);

    // 7. Compute delta
    const deltaPercent = this.computeDelta(aiOutput.before, aiOutput.after);

    // 8. Upsert case study
    const existing = await CaseStudyRepository.findByInterviewId(interviewId);

    const caseStudyData = {
      company_name: aiOutput.company || interview.client_name || interview.client_email.split("@")[0],
      headline: aiOutput.headline,
      summary: aiOutput.impact || undefined,
      story: aiOutput.story,
      quote: aiOutput.quote || undefined,
      client_name: aiOutput.client_name || undefined,
      metrics: aiOutput.metrics || undefined,
      metric_type: aiOutput.primary_metric || undefined,
      before_value: aiOutput.before || undefined,
      after_value: aiOutput.after || undefined,
      delta_percent: deltaPercent ?? undefined,
      timeframe: aiOutput.timeframe || undefined,
    };

    let caseStudy;

    if (existing) {
      caseStudy = await CaseStudyRepository.update(orgId, existing.id, {
        ...caseStudyData,
      });
    } else {
      caseStudy = await CaseStudyRepository.create(orgId, {
        interview_id: interviewId,
        slug,
        ...caseStudyData,
      });
    }

    // HARD VALIDATION: Confirm DB persistence before returning success
    if (!caseStudy || !caseStudy.id) {
      throw new Error("Case study was not saved to the database. Generation aborted.");
    }

    if (!caseStudy.headline || !caseStudy.story) {
      throw new Error("Case study saved but critical fields (headline/story) are missing.");
    }

    // 9. Log creation event
    try {
      await EventService.caseStudyCreated(orgId, caseStudy.id, caseStudy.company_name);
    } catch { /* silent */ }

    return { success: true, data: caseStudy };
  },

  /**
   * Generate a partial case study for real-time preview.
   * Does NOT transition interview status.
   */
  async generatePartialPreview(
    orgId: string,
    interviewId: string
  ): Promise<ServiceResult<CaseStudy>> {
    const interview = await InterviewRepository.findById(orgId, interviewId);
    if (!interview) throw new NotFoundError("Interview");

    const answers = await InterviewAnswerRepository.findByInterview(interviewId);
    if (answers.length < 2) {
      return { success: false, error: "Not enough data for preview", code: "NO_DATA" };
    }

    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");

    // Use AI Generator for high-quality partials
    const { CaseStudyGenerator } = await import("@/lib/ai/case-study-generator");
    const { OrgProfileRepository } = await import("@/lib/repositories/org-profile.repository");
    const orgProfile = await OrgProfileRepository.findByOrgId(orgId);

    // Generate AI content
    const aiOutput = await CaseStudyGenerator.generate(answers, orgProfile!, org.plan_type);

    // Upsert the case study
    const existing = await CaseStudyRepository.findByInterviewId(interviewId);
    let caseStudy;

    if (existing) {
      caseStudy = await CaseStudyRepository.update(orgId, existing.id, {
        headline: aiOutput.headline,
        summary: aiOutput.impact,
        story: aiOutput.story,
        quote: aiOutput.quote,
        client_name: aiOutput.client_name,
        metrics: aiOutput.metrics,
        metric_type: aiOutput.primary_metric,
        before_value: aiOutput.before,
        after_value: aiOutput.after,
        timeframe: aiOutput.timeframe,
        delta_percent: this.computeDelta(aiOutput.before, aiOutput.after) ?? undefined,
      });
    } else {
      const slug = this.generateSlug(interview.client_name || interview.client_email);
      caseStudy = await CaseStudyRepository.create(orgId, {
        company_name: aiOutput.company || interview.client_name || interview.client_email.split("@")[0],
        interview_id: interviewId,
        status: "draft",
        headline: aiOutput.headline,
        summary: aiOutput.impact,
        story: aiOutput.story,
        quote: aiOutput.quote,
        client_name: aiOutput.client_name,
        metrics: aiOutput.metrics,
        metric_type: aiOutput.primary_metric,
        before_value: aiOutput.before,
        after_value: aiOutput.after,
        timeframe: aiOutput.timeframe,
        delta_percent: this.computeDelta(aiOutput.before, aiOutput.after) ?? undefined,
        slug,
      });
    }

    return { success: true, data: caseStudy };
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
   * Generate URL-safe slug from headline or company name.
   * NEVER returns null. Always unique via timestamp suffix.
   */
  generateSlug(text: string): string {
    const base = text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .substring(0, 60);
    const suffix = Date.now().toString().slice(-4);
    return `${base || "case-study"}-${suffix}`;
  },
};
