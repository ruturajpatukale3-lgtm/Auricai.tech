// GET/PATCH/DELETE /api/case-studies/[id]
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { validateInput, updateCaseStudySchema } from "@/lib/validation";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext, params?: Record<string, string>) => {
  try {
    const id = params?.id;
    if (!id) return apiError(400, "ID required");
    const cs = await CaseStudyService.getById(ctx.orgId, id);
    if (!cs) return apiError(404, "Case study not found");
    return apiSuccess(cs);
  } catch (error) { return handleApiError(error); }
});

export const PATCH = withOrg(async (req: NextRequest, ctx: OrgContext, params?: Record<string, string>) => {
  try {
    const id = params?.id;
    if (!id) return apiError(400, "ID required");
    const body = await req.json();
    const validation = validateInput(updateCaseStudySchema, body);
    if (!validation.success) return apiError(400, validation.error);
    const result = await CaseStudyService.update(ctx.orgId, id, validation.data);
    if (!result.success) return apiError(400, result.error!);
    return apiSuccess(result.data);
  } catch (error) { return handleApiError(error); }
});

export const DELETE = withOrg(async (_req: NextRequest, ctx: OrgContext, params?: Record<string, string>) => {
  try {
    const id = params?.id;
    if (!id) return apiError(400, "ID required");
    await CaseStudyService.delete(ctx.orgId, id);
    return apiSuccess({ deleted: true });
  } catch (error) { return handleApiError(error); }
});
