// GET /api/analytics — Dashboard metrics
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { apiSuccess, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const data = await AnalyticsService.getDashboard(ctx.orgId);
    
    return apiSuccess({
      success: true,
      data: data || AnalyticsService.defaultAnalytics(),
      fallback: false
    });
  } catch (error) {
    console.error("[api/analytics] CRITICAL ERROR:", error);
    
    return apiSuccess({
      success: true, 
      data: AnalyticsService.defaultAnalytics(),
      fallback: true
    });
  }
});
