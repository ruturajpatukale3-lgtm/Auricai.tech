// GET /api/case-studies — List case studies
// POST /api/case-studies — Generate from interview
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const caseStudies = await CaseStudyService.getByOrg(ctx.orgId);
    return apiSuccess(caseStudies);
  } catch (error) {
    console.error("[API:CaseStudies] Error fetching studies:", error);
    // STABILITY FIRST: Return an empty array so the dashboard can still load
    return apiSuccess([]);
  }
});

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    // AI generation from interview
    if (body.interview_id) {
      const result = await CaseStudyService.generateFromInterview(ctx.orgId, body.interview_id);
      if (!result.success) return apiError(400, result.error!, result.code);
      return apiSuccess(result.data, 201);
    }
    
    return apiError(400, "Manual case study creation is disabled. Please generate from an interview.");
  } catch (error) { return handleApiError(error); }
});
