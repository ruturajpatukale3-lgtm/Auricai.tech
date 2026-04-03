// ═══════════════════════════════════════════════════════════
// GET  /api/deals — List deals for org
// POST /api/deals — Create a new deal
// ═══════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { DealService } from "@/lib/services/deal.service";
import { validateInput, createDealSchema } from "@/lib/validation";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";
import type { DealStatus } from "@/types";

export const GET = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as DealStatus | null;
    const limit = parseInt(searchParams.get("limit") || "50");

    const deals = await DealService.getByOrg(ctx.orgId, {
      status: status || undefined,
      limit,
    });

    return apiSuccess(deals);
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    const validation = validateInput(createDealSchema, body);
    if (!validation.success) {
      return apiError(400, validation.error, "VALIDATION_ERROR");
    }

    const result = await DealService.create(ctx.orgId, validation.data);

    if (!result.success) {
      return apiError(400, result.error!, result.code);
    }

    return apiSuccess(result.data, 201);
  } catch (error) {
    return handleApiError(error);
  }
});
