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

    // 1. Find interview
    const interview = await InterviewRepository.findByToken(token);
    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    // 2. Status check — ensure it's ready for approval
    // (Using type assertion to bypass stale Next.js compiler cache for union types)
    if ((interview.status as string) !== "review_ready") {
      return NextResponse.json({ success: false, error: "Interview is not ready for approval" }, { status: 400 });
    }

    // 2. Update status: review_ready -> approved
    await InterviewRepository.updateStatus(interview.org_id, interview.id, "approved");

    // 3. Update associated case study status to 'pending' (ready for dashboard publish)
    const caseStudy = await CaseStudyRepository.findByInterviewId(interview.id);
    if (caseStudy) {
      await CaseStudyRepository.update(interview.org_id, caseStudy.id, { status: "pending" });
    }

    // 4. Log event
    await EventService.track({
      orgId: interview.org_id,
      type: "case_study_published", // Using this to signal it's ready for final live push
      entityId: interview.id,
      metadata: { approved_by: "client" }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST interview approve] Error:", error);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
