import { NextRequest, NextResponse } from "next/server";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // 1. Find interview
    const interview = await InterviewRepository.findByToken(token);
    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    // 2. Load associated case study if it exists
    let caseStudy = null;
    if (interview.status === "review_ready" || interview.status === "approved" || interview.status === "published") {
      caseStudy = await CaseStudyRepository.findByInterviewId(interview.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        status: interview.status,
        caseStudy: caseStudy ? {
          id: caseStudy.id,
          headline: caseStudy.headline,
          metricType: caseStudy.metric_type,
          before: caseStudy.before_value,
          after: caseStudy.after_value,
          deltaPercent: caseStudy.delta_percent,
          timeframe: caseStudy.timeframe,
        } : null
      }
    });
  } catch (error) {
    console.error("[GET interview status] Error:", error);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
