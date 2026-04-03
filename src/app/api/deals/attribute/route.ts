// ═══════════════════════════════════════════════════════════
// POST /api/deals/attribute — Link a case study to a deal
// ═══════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { DealService } from "@/lib/services/deal.service";
import { validateInput, attributeDealSchema } from "@/lib/validation";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    const validation = validateInput(attributeDealSchema, body);
    if (!validation.success) {
      return apiError(400, validation.error, "VALIDATION_ERROR");
    }

    const result = await DealService.attribute(
      ctx.orgId,
      validation.data.deal_id,
      validation.data.case_study_id
    );

    if (!result.success) {
      return apiError(400, result.error!, result.code);
    }

    return apiSuccess(result.data, 201);
  } catch (error) {
    return handleApiError(error);
  }
});
