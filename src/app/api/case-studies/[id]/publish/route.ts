// POST /api/case-studies/[id]/publish — Publish case study
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const POST = withOrg(async (_req: NextRequest, ctx: OrgContext, params?: Record<string, string>) => {
  try {
    const id = params?.id;
    if (!id) return apiError(400, "ID required");
    const result = await CaseStudyService.publish(ctx.orgId, id);
    if (!result.success) return apiError(400, result.error!, result.code);
    return apiSuccess(result.data);
  } catch (error) { return handleApiError(error); }
});

export const PATCH = POST;
