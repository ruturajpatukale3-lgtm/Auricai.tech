// GET /api/analytics/insights — Smart insights
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { apiSuccess, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const insights = await AnalyticsService.getInsights(ctx.orgId);
    return apiSuccess(insights);
  } catch (error) { return handleApiError(error); }
});
