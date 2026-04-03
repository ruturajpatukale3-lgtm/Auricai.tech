// POST /api/public/interview/[token]/answer — Submit answer (no auth)
import { NextRequest, NextResponse } from "next/server";
import { InterviewService } from "@/lib/services/interview.service";
import { validateInput, submitAnswerSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    
    const limit = await checkRateLimit(`public_interview_${ip}`, 10, "1 m");
    if (!limit.success) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const validation = validateInput(submitAnswerSchema, body);
    if (!validation.success) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });

    const result = await InterviewService.submitAnswer(
      token, 
      validation.data.question, 
      validation.data.answer,
      validation.data.currentIndex !== undefined && validation.data.totalQuestions !== undefined
        ? { currentIndex: validation.data.currentIndex, totalQuestions: validation.data.totalQuestions }
        : undefined
    );
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
