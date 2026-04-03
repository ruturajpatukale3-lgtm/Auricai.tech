import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

/**
 * POST /api/case-studies/bulk-publish
 * 
 * Atomically publishes multiple draft case studies.
 * Used for the "Publish Now → bulk approval" dashboard action.
 */
export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return apiError(400, "Array of case study IDs required");
    }

    // Process all updates
    const results = await Promise.all(
      ids.map(id => CaseStudyService.update(ctx.orgId, id, { status: "live" }))
    );

    const successCount = results.filter(r => r.success).length;

    return apiSuccess({
      message: `Successfully published ${successCount} case studies`,
      count: successCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
