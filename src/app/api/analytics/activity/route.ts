// GET /api/analytics/activity — Activity feed
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { apiSuccess, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const feed = await AnalyticsService.getActivityFeed(ctx.orgId, limit);
    return apiSuccess(feed);
  } catch (error) { return handleApiError(error); }
});
