import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

/**
 * POST /api/events/deal-influenced
 * Records that a case study was used to successfully close a deal.
 * Increments deals_influenced and updates pipeline_value.
 */
export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    
    const { id, ids, deal_id, value = 0 } = body;
    const caseStudyIds = ids || (id ? [id] : []);
    
    if (caseStudyIds.length === 0) {
      return apiError(400, "At least one Case Study ID is required (id or ids)");
    }

    if (!deal_id) {
      return apiError(400, "deal_id is required for idempotency");
    }

    const result = await CaseStudyService.recordDeal(
      ctx.orgId, 
      caseStudyIds, 
      deal_id, 
      Number(value)
    );
    
    if (!result.success) {
      return apiError(400, result.error || "Failed to record deal");
    }

    return apiSuccess({
      message: "Deal influence recorded successfully",
      idempotency: "processed"
    });

  } catch (error) {
    return handleApiError(error);
  }
});
