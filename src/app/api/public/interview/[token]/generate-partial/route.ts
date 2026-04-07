import { NextRequest, NextResponse } from "next/server";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { CaseStudyService } from "@/lib/services/case-study.service";

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

    // 2. Generate partial preview in background
    // Note: We don't await this if we want it to be super fast for the caller,
    // but for reliability in this small app, we'll await it for now.
    const result = await CaseStudyService.generatePartialPreview(
      interview.org_id,
      interview.id
    );

    if (!result.success) {
       return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        caseStudyId: result.data!.id
      }
    });
  } catch (error) {
    console.error("[POST generate-partial] Error:", error);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
