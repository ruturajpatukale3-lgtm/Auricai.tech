import { NextRequest, NextResponse } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { HubSpotRepository } from "@/lib/repositories/hubspot.repository";
import { apiSuccess, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const connection = await HubSpotRepository.getConnection(ctx.orgId);

    if (!connection) {
      return apiSuccess({ connected: false, lastSync: null }, 200);
    }

    return apiSuccess({
      connected: true,
      lastSync: connection.updated_at,
    }, 200);
  } catch (error) {
    return handleApiError(error);
  }
});
