// GET /api/public/interview/[token] — Public interview fetch (no auth)
import { NextRequest, NextResponse } from "next/server";
import { InterviewService } from "@/lib/services/interview.service";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  try {
    // Rate limit: 20 lookups per minute per IP (prevents token brute-force)
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const limit = await checkRateLimit(`public_interview:${ip}`, 20, "1 m");
    if (!limit.success) {
      return NextResponse.json({ success: false, error: "Too many requests." }, { status: 429 });
    }

    const { token } = await props.params;

    // 1. Prospect context for tracking (reuse ip from rate limit above)
    const ua = req.headers.get("user-agent") || "unknown";

    // 2. Lookup by token (Services checks 30-day expiry)
    const interview = await InterviewService.getByToken(token, { ip, ua });
    
    if (!interview) {
      // Security: We don't distinguish between "Not Found" and "Expired" via status code 
      // to avoid leaking metadata about existing vs non-existing tokens.
      return NextResponse.json({ 
        success: false, 
        error: "Interview link is invalid or has expired." 
      }, { status: 404 });
    }

    // 3. Status validation
    if (interview.status === "completed" || interview.status === "approved" || interview.status === "published") {
      return NextResponse.json({ 
        success: false, 
        error: "This interview has already been completed.",
        code: "ALREADY_COMPLETED",
        isComplete: true
      }, { status: 400 });
    }

    // 4. Scrub sensitive fields before sending to client
    const safeInterview = {
      id: interview.id,
      client_name: interview.client_name,
      status: interview.status,
      created_at: interview.created_at,
      plan_name: (interview as any).plan_name,
      // org_id, client_email etc. are EXCLUDED for security
    };

    const answers = await InterviewService.getAnswers(interview.id);
    
    return NextResponse.json({ 
      success: true, 
      data: { ...safeInterview, answers } 
    });
  } catch (error) {
    console.error("[GET public interview] Error:", error);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
