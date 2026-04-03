// POST /api/team/accept — Accept team invite
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { TeamRepository } from "@/lib/repositories/team.repository";
import { TeamService } from "@/lib/services/team.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError(401, "Auth required");

    const body = await req.json();
    const { org_id, member_id } = body;
    if (!org_id || !member_id) return apiError(400, "org_id and member_id required");

    const result = await TeamService.acceptInvite(org_id, member_id, userId);
    if (!result.success) return apiError(400, result.error!);
    return apiSuccess(result.data);
  } catch (error) { return handleApiError(error); }
}
