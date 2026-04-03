// POST /api/danger/reset — Reset org data
import { NextRequest } from "next/server";
import { withRole } from "@/lib/middleware/withOrg";
import { DangerService } from "@/lib/services/danger.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";
import type { OrgContext } from "@/lib/middleware/withOrg";

export const POST = withRole(["owner"], async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    const result = await DangerService.reset(ctx.orgId, body.confirmation);
    if (!result.success) return apiError(400, result.error!);
    return apiSuccess({ reset: true });
  } catch (error) { return handleApiError(error); }
});
