// ═══════════════════════════════════════════════════════════
// CaseFlow — Subscription Usage API
// ═══════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { SubscriptionService } from "@/lib/services/subscription.service";
import { handleApiError, apiSuccess, AuthRequiredError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Subscription } from "@/types";

export async function GET() {
  try {
    const { orgId } = await auth();
    if (!orgId) throw new AuthRequiredError();

    const subscription = await SubscriptionService.getSubscription(orgId);
    
    if (!subscription) {
      return apiSuccess({
        plan: "free",
        interviews_used: 0,
        interviews_limit: 2,
        is_lifetime: true,
        trial_end: null,
      });
    }

    let sub = subscription;
    const now = new Date();

    // ─── LAZY SYNC: Deferred Downgrades (Requirement 14) ────────
    // If a next_plan is scheduled and the period has expired, apply it now.
    if (sub.next_plan && sub.current_period_end && now > new Date(sub.current_period_end)) {
      const { PLAN_LIMITS } = await import("@/lib/plans");
      const nextPlan = sub.next_plan as keyof typeof PLAN_LIMITS;
      const limits = PLAN_LIMITS[nextPlan] || PLAN_LIMITS.free;

      const { data: updatedSub } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_name: nextPlan,
          next_plan: null,
          interviews_limit: limits.interviews === -1 ? 999999 : limits.interviews,
          team_seat_limit: limits.teamSeats,
          updated_at: now.toISOString(),
        })
        .eq("org_id", orgId)
        .select()
        .single();
      
      if (updatedSub) sub = updatedSub as Subscription;
    }

    // ─── LAZY SYNC: Trial Expiry (Requirement 4) ───────────────
    if (sub.plan_name === "trial" && sub.trial_end && now > new Date(sub.trial_end)) {
      const { data: updatedSub } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_name: "free",
          interviews_limit: 2,
          updated_at: now.toISOString(),
        })
        .eq("org_id", orgId)
        .select()
        .single();
      
      if (updatedSub) sub = updatedSub as Subscription;
    }

    const isFree = sub.plan_name === "free";
    const displayUsed = isFree ? sub.lifetime_interviews_used : sub.interviews_used;

    // Requirement 11 Strict Contract
    return apiSuccess({
      plan: sub.plan_name,
      interviews_used: displayUsed,
      interviews_limit: sub.interviews_limit,
      is_lifetime: isFree,
      trial_end: sub.trial_end,
      trial_consumed: !!sub.trial_consumed,
      // Metadata for UI
      plan_label: isFree ? "Free (2 interviews)" : sub.plan_name === "trial" ? "Trial (7 days)" : sub.plan_name.charAt(0).toUpperCase() + sub.plan_name.slice(1),
      payment_status: sub.payment_status,
      next_plan: sub.next_plan,
      period_end: sub.current_period_end,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
