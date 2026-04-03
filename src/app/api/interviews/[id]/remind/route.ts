// ═══════════════════════════════════════════════════════════
// POST /api/interviews/[id]/remind — Send email reminder
// Email-only. No SMS/WhatsApp/Twilio.
// ═══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { InterviewService } from "@/lib/services/interview.service";
import { apiSuccess, handleApiError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext, params?: Record<string, string>) => {
  try {
    const id = params?.id;
    if (!id) return new Response("Missing ID", { status: 400 });

    const limit = await checkRateLimit(`remind_${id}`, 1, "6 h");
    if (!limit.success) {
      return new Response("Rate limit exceeded. Try again later.", { status: 429 });
    }

    // Send email reminder only
    const result = await InterviewService.sendReminder(ctx.orgId, id);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
});
