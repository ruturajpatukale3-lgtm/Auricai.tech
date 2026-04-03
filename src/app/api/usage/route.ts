// GET /api/usage — Get usage data
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { UsageRepository } from "@/lib/repositories/usage.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { getPlanLimits } from "@/lib/plans";
import { apiSuccess, handleApiError } from "@/lib/errors";
import type { PlanType } from "@/types";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const [usage, org] = await Promise.all([
      UsageRepository.getOrCreate(ctx.orgId),
      OrganizationRepository.findById(ctx.orgId),
    ]);
    const limits = getPlanLimits((org?.plan_type || "free") as PlanType);
    return apiSuccess({ usage, limits, plan_type: org?.plan_type });
  } catch (error) { return handleApiError(error); }
});
