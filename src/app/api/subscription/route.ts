// ═══════════════════════════════════════════════════════════
// CaseFlow — Subscription Management API
// Returns current entitlement state for the current organization.
// ═══════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { SubscriptionService } from "@/lib/services/subscription.service";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError, AuthRequiredError } from "@/lib/errors";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) throw new AuthRequiredError();

    const orgId = await AuthService.getOrgIdForUser(userId);
    if (!orgId) throw new AuthRequiredError("No workspace found.");

    const sub = await SubscriptionService.getSubscription(orgId);
    
    if (!sub) {
      // Default for new or misconfigured orgs
      return NextResponse.json({
        plan: "starter",
        interviews_used: 0,
        interviews_limit: 25,
        team_seat_limit: 1
      });
    }

    const { PLAN_LIMITS } = await import("@/lib/plans");
    const limits = PLAN_LIMITS[sub.plan_name as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter;

    return NextResponse.json({
      plan: sub.plan_name,
      interviews_used: sub.interviews_used,
      interviews_limit: sub.plan_name === "enterprise" ? null : sub.interviews_limit,
      team_seat_limit: sub.team_seat_limit,
      is_soft_unlimited: !!limits.isSoftUnlimited
    });
  } catch (error) {
    return handleApiError(error);
  }
}
