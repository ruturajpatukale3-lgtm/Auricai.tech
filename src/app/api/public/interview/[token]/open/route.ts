import { NextRequest, NextResponse } from "next/server";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { InterviewAnswerRepository } from "@/lib/repositories/interview-answer.repository";
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

    // 2. State Fallback: If status is 'sent' but answers exist, it's actually 'in_progress'
    if (interview.status === "sent") {
      const answerCount = await InterviewAnswerRepository.countByInterview(interview.id);
      
      if (answerCount > 0) {
        // Fallback repair: set to in_progress
        await InterviewRepository.updateStatus(interview.org_id, interview.id, "in_progress");
        await EventService.interviewStarted(interview.org_id, interview.id);
        return NextResponse.json({ success: true, repaired: true, state: "in_progress" });
      }

      // Standard path: set to opened
      await InterviewRepository.updateStatus(interview.org_id, interview.id, "opened");
      
      // 3. Log event for real-time dashboard refresh
      const ip = req.headers.get("x-forwarded-for") || "0.0.0.0";
      const ua = req.headers.get("user-agent") || "unknown";
      
      await EventService.interviewOpened(interview.org_id, interview.id, {
        ip,
        user_agent: ua,
        client_email: interview.client_email
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST interview open] Error:", error);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
