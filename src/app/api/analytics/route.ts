// GET /api/analytics — Dashboard metrics
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { apiSuccess, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const metrics = await AnalyticsService.getDashboard(ctx.orgId);
    return apiSuccess(metrics);
  } catch (error) { return handleApiError(error); }
});
