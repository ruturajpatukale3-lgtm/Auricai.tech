import { NextRequest, NextResponse } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { HubSpotService } from "@/lib/services/hubspot.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const result = await HubSpotService.syncDeals(ctx.orgId);
    if (!result.success) {
      return apiError(400, result.error!);
    }
    return apiSuccess(result.data, 200);
  } catch (error) {
    return handleApiError(error);
  }
});

export const GET = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const { HubSpotRepository } = await import("@/lib/repositories/hubspot.repository");
    const deals = await HubSpotRepository.getExternalDeals(ctx.orgId);
    return apiSuccess(deals, 200);
  } catch (error) {
    return handleApiError(error);
  }
});
