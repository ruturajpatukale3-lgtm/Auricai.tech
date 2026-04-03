// ═══════════════════════════════════════════════════════════
// GET   /api/interviews/[id] — Get interview details
// PATCH /api/interviews/[id] — Approve interview
// DELETE /api/interviews/[id] — Delete interview
// ═══════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { InterviewService } from "@/lib/services/interview.service";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext, params?: Record<string, string>) => {
  try {
    const id = params?.id;
    if (!id) return apiError(400, "Interview ID required");
    const interview = await InterviewService.getById(ctx.orgId, id);
    if (!interview) return apiError(404, "Interview not found");
    const answers = await InterviewService.getAnswers(id);
    return apiSuccess({ ...interview, answers });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withOrg(async (req: NextRequest, ctx: OrgContext, params?: Record<string, string>) => {
  try {
    const id = params?.id;
    if (!id) return apiError(400, "Interview ID required");
    const body = await req.json();
    if (body.action === "approve") {
      const result = await InterviewService.approve(ctx.orgId, id);
      if (!result.success) return apiError(400, result.error!, result.code);
      return apiSuccess(result.data);
    }
    return apiError(400, "Invalid action");
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withOrg(async (_req: NextRequest, ctx: OrgContext, params?: Record<string, string>) => {
  try {
    const id = params?.id;
    if (!id) return apiError(400, "Interview ID required");
    await InterviewRepository.delete(ctx.orgId, id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
});
