// GET /api/domain — Get domain info
// POST /api/domain — Add domain
// DELETE /api/domain — Remove domain
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { DomainService } from "@/lib/services/domain.service";
import { validateInput, addDomainSchema } from "@/lib/validation";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const domain = await DomainService.getDomain(ctx.orgId);
    return apiSuccess(domain);
  } catch (error) { return handleApiError(error); }
});

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    const validation = validateInput(addDomainSchema, body);
    if (!validation.success) return apiError(400, validation.error);
    const result = await DomainService.add(ctx.orgId, validation.data.domain);
    if (!result.success) return apiError(400, result.error!);
    return apiSuccess(result.data, 201);
  } catch (error) { return handleApiError(error); }
});

export const DELETE = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const result = await DomainService.remove(ctx.orgId);
    if (!result.success) return apiError(400, result.error!);
    return apiSuccess({ removed: true });
  } catch (error) { return handleApiError(error); }
});
