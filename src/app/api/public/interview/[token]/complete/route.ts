// POST /api/public/interview/[token]/complete — Mark complete (no auth)
import { NextRequest, NextResponse } from "next/server";
import { InterviewService } from "@/lib/services/interview.service";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    
    const limit = await checkRateLimit(`public_interview_complete_${ip}`, 10, "1 m");
    if (!limit.success) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const result = await InterviewService.complete(token);
    if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });

    return NextResponse.json({ success: true, data: result.data });

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
