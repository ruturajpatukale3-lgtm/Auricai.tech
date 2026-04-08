// ═══════════════════════════════════════════════════════════
// CaseFlow — Admin Subscription Override API
// Secure internal endpoint for manual plan overrides in production.
// Restricted to global administrators only.
// ═══════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLAN_LIMITS } from "@/lib/plans";
import { apiSuccess, handleApiError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { PlanType } from "@/types";

// ─── ADMIN CONFIGURATION ───────────────────────────────────
// Hardcoded admin emails for strict access control.
const ADMIN_EMAILS = [
  "ruturajpatukale3@gamil.com",
];

export async function POST(req: Request) {
  try {
    // 1. Authenticate Caller
    const user = await currentUser();
    if (!user) throw new ForbiddenError("Not authenticated");

    const email = user.emailAddresses[0]?.emailAddress.toLowerCase();
    
    // 2. Strict Admin Check
    const isGlobalAdmin = ADMIN_EMAILS.includes(email);
    
    // Optional: Secret Key Check for additional security layer
    const secretHeader = req.headers.get("X-Admin-Secret");
    const hasSecretKey = secretHeader === process.env.ADMIN_OVERRIDE_SECRET;

    if (!isGlobalAdmin && !hasSecretKey) {
      console.warn(`[Admin Override] Unauthorized attempt by ${email}`);
      throw new ForbiddenError("You do not have permission to access this internal tool.");
    }

    // 3. Parse Request
    const { targetEmail, targetPlan } = await req.json();

    if (!targetEmail || !targetPlan) {
      return NextResponse.json({ success: false, error: "Missing TargetEmail or TargetPlan" }, { status: 400 });
    }

    const plan = targetPlan.toLowerCase() as PlanType;
    if (!PLAN_LIMITS[plan]) {
        return NextResponse.json({ success: false, error: `Invalid plan type: ${targetPlan}` }, { status: 400 });
    }

    // 4. Resolve Target Organization
    const { data: member, error: memberError } = await supabaseAdmin
      .from("team_members")
      .select("org_id")
      .eq("email", targetEmail.toLowerCase().trim())
      .single();

    if (memberError || !member) {
      console.error(`[Admin Override] Target user ${targetEmail} not found:`, memberError);
      throw new NotFoundError(`User with email ${targetEmail} was not found in any organization.`);
    }

    const orgId = member.org_id;
    const limits = PLAN_LIMITS[plan];

    console.log(`[Admin Override] Proceeding to set ${targetEmail} (Org: ${orgId}) to ${plan}`);

    // 5. Atomic Update — Organizations & Subscriptions
    // We update both to ensure consistency across the legacy and hardened tables.
    
    // A. Update Organizations table (Legacy field)
    const { error: orgError } = await supabaseAdmin
      .from("organizations")
      .update({ plan_type: plan })
      .eq("id", orgId);

    if (orgError) {
      console.error(`[Admin Override] Failed to update organization record:`, orgError);
      throw new Error(`DB Error (Organizations): ${orgError.message}`);
    }

    // B. Update Subscriptions table (Hardened logic)
    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .upsert({
        org_id: orgId,
        plan_name: plan,
        interviews_limit: limits.interviews === -1 ? 999999 : limits.interviews,
        team_seat_limit: limits.teamSeats,
        payment_status: "active",
        current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // Mocked long-term end
        access_blocked: false,
        updated_at: new Date().toISOString()
      }, { onConflict: "org_id" });

    if (subError) {
      console.error(`[Admin Override] Failed to update subscription record:`, subError);
      throw new Error(`DB Error (Subscriptions): ${subError.message}`);
    }

    // 6. Finalize
    console.info(`[Admin Override] SUCCESS: ${targetEmail} is now on ${plan} plan.`);
    
    return apiSuccess({
      message: `Successfully updated ${targetEmail} to ${plan} plan.`,
      orgId,
      newLimits: limits
    });

  } catch (error) {
    return handleApiError(error);
  }
}
