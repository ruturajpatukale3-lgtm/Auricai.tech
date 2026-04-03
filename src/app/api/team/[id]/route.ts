// DELETE /api/team/[id] — Remove team member
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { TeamService } from "@/lib/services/team.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const DELETE = withOrg(async (_req: NextRequest, ctx: OrgContext, params?: Record<string, string>) => {
  try {
    const id = params?.id;
    if (!id) return apiError(400, "Member ID required");
    const result = await TeamService.remove(ctx.orgId, id, ctx.userId);
    if (!result.success) return apiError(400, result.error!);
    return apiSuccess({ removed: true });
  } catch (error) { return handleApiError(error); }
});
