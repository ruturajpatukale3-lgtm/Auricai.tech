import { NextRequest, NextResponse } from "next/server";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
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

    // 2. Only update if status is 'sent' or 'opened'
    // If it's already 'in_progress', we don't need to do anything or fire another event.
    if (interview.status === "sent" || interview.status === "opened") {
      await InterviewRepository.updateStatus(interview.org_id, interview.id, "in_progress");
      
      // 3. Log event for real-time dashboard refresh
      await EventService.interviewStarted(interview.org_id, interview.id);
      return NextResponse.json({ success: true, updated: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST interview progress] Error:", error);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
