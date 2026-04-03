// GET /api/team — List team members
// POST /api/team — Invite team member
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { TeamService } from "@/lib/services/team.service";
import { validateInput, teamInviteSchema } from "@/lib/validation";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const members = await TeamService.getMembers(ctx.orgId);
    return apiSuccess(members);
  } catch (error) { return handleApiError(error); }
});

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    const validation = validateInput(teamInviteSchema, body);
    if (!validation.success) return apiError(400, validation.error);
    const result = await TeamService.invite(ctx.orgId, validation.data.email, validation.data.role);
    if (!result.success) return apiError(400, result.error!);
    return apiSuccess(result.data, 201);
  } catch (error) { return handleApiError(error); }
});
