// ═══════════════════════════════════════════════════════════
// CaseFlow — withOrg Middleware
// HOF wrapping API routes with auth + org resolution.
// ═══════════════════════════════════════════════════════════

import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { apiError, handleApiError } from "@/lib/errors";
import type { TeamRole } from "@/types";

export interface OrgContext {
  userId: string;
  orgId: string;
  role: TeamRole;
  memberId: string;
}

type OrgHandler = (
  req: NextRequest,
  ctx: OrgContext,
  params?: Record<string, string>
) => Promise<Response>;

/**
 * Wrap an API route handler with auth + org resolution.
 * Returns 401 if no auth, 403 if no org membership.
 */
export function withOrg(handler: OrgHandler) {
  return async (req: NextRequest, routeCtx?: { params?: Promise<Record<string, string>> }) => {
    try {
      const { userId } = await auth();
      if (!userId) {
        return apiError(401, "Authentication required", "AUTH_REQUIRED");
      }

      const orgData = await AuthService.requireOrg(userId);
      const orgCtx: OrgContext = { userId, ...orgData };

      // ENFORCEMENT: Ensure org stays within seat limits (handled via DB RPC)
      const { SubscriptionService } = await import("@/lib/services/subscription.service");
      await SubscriptionService.enforceSeatLimits(orgCtx.orgId);

      const params = routeCtx?.params ? await routeCtx.params : undefined;
      return await handler(req, orgCtx, params);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Wrap with auth + org + role check.
 */
export function withRole(roles: TeamRole[], handler: OrgHandler) {
  return withOrg(async (req, ctx, params) => {
    if (!roles.includes(ctx.role)) {
      return apiError(403, `Required role: ${roles.join(" or ")}`, "INSUFFICIENT_ROLE");
    }
    return handler(req, ctx, params);
  });
}
