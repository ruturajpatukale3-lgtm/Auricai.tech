// POST /api/domain/verify — Verify domain DNS
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { DomainService } from "@/lib/services/domain.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export const POST = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const limit = await checkRateLimit(`domain_verify_${ctx.orgId}`, 5, "1 m");
    if (!limit.success) {
      return apiError(429, "Rate limit exceeded. Try again later.", "RATE_LIMIT_EXCEEDED");
    }

    const result = await DomainService.verify(ctx.orgId);
    if (!result.success) return apiError(400, result.error!, result.code);
    return apiSuccess(result.data);
  } catch (error) { return handleApiError(error); }
});
