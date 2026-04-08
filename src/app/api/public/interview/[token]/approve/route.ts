import { NextRequest, NextResponse } from "next/server";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { EventService } from "@/lib/services/event.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const interview = await InterviewRepository.findByToken(token);
    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    // Official State Transition: Must be completed or review_ready to be approved
    if ((interview.status as string) !== "review_ready" && interview.status !== "completed") {
      return NextResponse.json({ success: false, error: "Interview is not ready for approval" }, { status: 400 });
    }

    await InterviewRepository.updateStatus(interview.org_id, interview.id, "approved");

    const caseStudy = await CaseStudyRepository.findByInterviewId(interview.id);
    if (caseStudy) {
      await CaseStudyRepository.update(interview.org_id, caseStudy.id, { status: "pending" });
    }

    await EventService.track({
      orgId: interview.org_id,
      type: "case_study_published",
      entityId: interview.id,
      metadata: { approved_by: "client" }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST interview approve] Error:", error);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
