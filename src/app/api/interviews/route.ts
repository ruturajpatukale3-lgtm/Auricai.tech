// ═══════════════════════════════════════════════════════════
// POST /api/interviews — Create interview
// GET  /api/interviews — List interviews
// ═══════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { InterviewService } from "@/lib/services/interview.service";
import { validateInput, createInterviewSchema } from "@/lib/validation";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const interviews = await InterviewService.getByOrg(ctx.orgId);
    return apiSuccess(interviews);
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    const validation = validateInput(createInterviewSchema, body);
    if (!validation.success) {
      return apiError(400, validation.error, "VALIDATION_ERROR");
    }

    const result = await InterviewService.create(
      ctx.orgId,
      validation.data.client_email,
      validation.data.client_name,
      undefined,   // idempotencyKey
      ctx.userId   // passed for cross-org free plan enforcement
    );

    if (!result.success) {
      return apiError(400, result.error!, result.code);
    }

    return apiSuccess(result.data, 201);
  } catch (error) {
    return handleApiError(error);
  }
});
