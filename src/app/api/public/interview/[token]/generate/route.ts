// ═══════════════════════════════════════════════════════════
// POST /api/public/interview/[token]/generate
// Triggers the Layer 8 Case Study Generation
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { InterviewAnswerRepository } from "@/lib/repositories/interview-answer.repository";
import { OrgProfileRepository } from "@/lib/repositories/org-profile.repository";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { CaseStudyGenerator } from "@/lib/ai/case-study-generator";
import { StateEngine } from "@/lib/ai/state-engine";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // ─── Rate Limit ─────────────────────────
    const limit = await checkRateLimit(`ai_generate_${ip}`, 5, "1 m");
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please wait a moment." },
        { status: 429 }
      );
    }

    // ─── Load Data ────────────────────────────────────
    const interview = await InterviewRepository.findByToken(token).catch(() => null);
    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    const [orgProfile, organization, rawAnswers] = await Promise.all([
      OrgProfileRepository.findByOrgId(interview.org_id).catch(() => null),
      OrganizationRepository.findById(interview.org_id).catch(() => null),
      InterviewAnswerRepository.findByInterview(interview.id).catch(() => []),
    ]);

    const state = StateEngine.calculateState(rawAnswers);

    // ─── Layer 8 Validation ──────────────────────────
    // Hard bounce removed to handle edge cases where users skip all metric questions.
    // The CaseStudyGenerator handles missing data via strict AI output rules.

    // ─── Generate ─────────────────────────────────────
    console.log("[generate] Generating Case Study for interview:", interview.id);
    const caseStudyData = await CaseStudyGenerator.generate(rawAnswers, orgProfile || {
      industry: "other",
      industry_raw: "General Business",
      service_category: "Professional Services",
      service_type: "Business services",
      target_customer: "Businesses",
    } as any, organization?.plan_type || "starter");

    // ─── HARD VALIDATION (Parts 1, 9) ──────────────────
    if (!caseStudyData.headline) {
      console.error("[generate] FATAL: Missing headline");
      return NextResponse.json({ success: false, error: "Missing headline" }, { status: 500 });
    }

    if (!caseStudyData.story || caseStudyData.story.length < 100) {
      console.error("[generate] FATAL: Story too short or missing. Length:", caseStudyData.story?.length || 0);
      return NextResponse.json({ success: false, error: "Invalid story — too short or missing" }, { status: 500 });
    }

    // ─── Generate Slug (GUARANTEED) ───────────────────
    const slug = caseStudyData.headline
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60)
      + "-" + Date.now().toString().slice(-4);

    if (!slug || slug.length < 5) {
      console.error("[generate] FATAL: Slug generation failed");
      return NextResponse.json({ success: false, error: "Slug generation failed" }, { status: 500 });
    }

    console.log("[generate] Saving:", { headline: caseStudyData.headline, slug, company: caseStudyData.company });

    // ─── Persist to DB (MUST NOT FAIL SILENTLY) ──────
    const finalCaseStudy = await CaseStudyRepository.create(
      interview.org_id,
      {
        interview_id: interview.id,
        company_name: caseStudyData.company || interview.client_name || "Client",
        headline: caseStudyData.headline,
        slug,
        metric_type: caseStudyData.primary_metric || null,
        before_value: caseStudyData.before,
        after_value: caseStudyData.after,
        metrics: caseStudyData.metrics,
        summary: caseStudyData.impact,
        story: caseStudyData.story,
        quote: caseStudyData.quote,
        client_name: caseStudyData.client_name,
        delta_percent: undefined,
        timeframe: caseStudyData.timeframe || undefined,
      }
    );

    console.log("[generate] Saved slug:", finalCaseStudy.slug, "id:", finalCaseStudy.id);

    return NextResponse.json({
      success: true,
      data: { ...caseStudyData, slug: finalCaseStudy.slug, id: finalCaseStudy.id }
    });

  } catch (error: any) {
    console.error("[generate] CATASTROPHIC FAILURE:", error);
    return NextResponse.json({ success: false, error: "Failed to generate case study." }, { status: 500 });
  }
}
