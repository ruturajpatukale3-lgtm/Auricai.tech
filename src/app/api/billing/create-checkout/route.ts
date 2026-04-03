// ═══════════════════════════════════════════════════════════
// POST /api/billing/create-checkout — Create Paddle Checkout
// Frontend calls this → gets a checkout URL → redirects user
// ═══════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiSuccess, apiError, handleApiError, AuthRequiredError, AppError } from "@/lib/errors";

// ─── Plan → Paddle Price ID mapping ─────────────────────
const PLAN_PRICE_MAP: Record<string, { monthly: string; annual: string }> = {
  starter: {
    monthly: process.env.PADDLE_STARTER_PRICE_ID || "",
    annual: process.env.PADDLE_STARTER_PRICE_ID_ANNUAL || "",
  },
  growth: {
    monthly: process.env.PADDLE_GROWTH_PRICE_ID || "",
    annual: process.env.PADDLE_GROWTH_PRICE_ID_ANNUAL || "",
  },
  enterprise: {
    monthly: process.env.PADDLE_ENTERPRISE_PRICE_ID || "",
    annual: process.env.PADDLE_ENTERPRISE_PRICE_ID_ANNUAL || "",
  },
};

const PADDLE_API_KEY = process.env.PADDLE_API_KEY || "";
const PADDLE_API_URL = process.env.PADDLE_SANDBOX === "true"
  ? "https://sandbox-api.paddle.com"
  : "https://api.paddle.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    
    if (!userId) {
      throw new AuthRequiredError("Authentication required.");
    }

    // Resolve org from team_members (same logic as TeamRepository.findByUserId)
    let orgId: string | null = null;
    const { data: membership } = await supabaseAdmin
      .from("team_members")
      .select("org_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(1);
    
    if (membership && membership.length > 0) {
      orgId = membership[0].org_id;
    }

    const user = await currentUser();

    // Just-in-Time Workspace Creation: If a user clicked upgrade without finishing onboarding,
    // auto-create a default workspace for them so Paddle checkout succeeds frictionlessly.
    if (!orgId && userId && user) {
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (email) {
        const { AuthService } = await import("@/lib/services/auth.service");
        const newOrg = await AuthService.onboardUser(userId, email, user.firstName ? `${user.firstName}'s Workspace` : "My Workspace");
        orgId = newOrg.id;
      }
    }

    if (!orgId) throw new AuthRequiredError("Workspace context required. Please select or create a workspace first.");

    const body = await req.json();
    const plan = body.plan as string;
    const interval = (body.interval || "monthly") as "monthly" | "annual";

    if (!plan || !PLAN_PRICE_MAP[plan]) {
      return apiError(400, "Invalid plan. Must be 'starter', 'growth', or 'enterprise'.", "INVALID_PLAN");
    }

    const priceId = PLAN_PRICE_MAP[plan][interval];
    if (!priceId) {
      return apiError(500, `Paddle price ID not configured for ${plan} ${interval}.`, "MISSING_PRICE_ID");
    }

    // 3. Check if org already has a Paddle customer ID
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id")
      .eq("org_id", orgId)
      .limit(1)
      .single();

    let customerId = existingSub?.paddle_customer_id || null;

    // 4. If no existing customer, create one in Paddle
    if (!customerId) {
      if (!user) {
        throw new AuthRequiredError("User profile could not be resolved. Please log out and back in.");
      }
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (!email) {
        return apiError(400, "No email address found on your account.", "NO_EMAIL");
      }

      const customerRes = await fetch(`${PADDLE_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name: user.fullName || user.firstName || email,
          custom_data: { org_id: orgId, clerk_user_id: user.id },
        }),
      });

      if (!customerRes.ok) {
        // Customer might already exist with this email — try to list them
        const listRes = await fetch(`${PADDLE_API_URL}/customers?email=${encodeURIComponent(email)}`, {
          headers: { "Authorization": `Bearer ${PADDLE_API_KEY}` },
        });
        const listData = await listRes.json();
        const existing = listData?.data?.[0];

        if (existing?.id) {
          customerId = existing.id;
        } else {
          const errData = await customerRes.json().catch(() => ({}));
          console.error("[Checkout] Failed to create Paddle customer:", errData);
          throw new AppError("Failed to create billing customer.", 500);
        }
      } else {
        const customerData = await customerRes.json();
        customerId = customerData.data.id;
      }

      // Persist the Paddle customer ID
      await supabaseAdmin
        .from("subscriptions")
        .update({
          paddle_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", orgId);
    }

    // 5. If user already has an active subscription, update it (upgrade/downgrade)
    if (existingSub?.paddle_subscription_id) {
      // Fetch current subscription to check for downgrade
      const { data: currentSub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan_name, interviews_limit")
        .eq("org_id", orgId)
        .single();

      const { PLAN_PRIORITY } = await import("@/lib/plans");
      const currentPlan = (currentSub?.plan_name || "free") as keyof typeof PLAN_PRIORITY;
      const targetPlan = plan as keyof typeof PLAN_PRIORITY;

      const isDowngrade = PLAN_PRIORITY[targetPlan] < PLAN_PRIORITY[currentPlan];

      // Use Paddle's subscription update API for plan changes
      const updateRes = await fetch(
        `${PADDLE_API_URL}/subscriptions/${existingSub.paddle_subscription_id}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${PADDLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: [{ price_id: priceId, quantity: 1 }],
            // Upgrade -> Prorated immediately, Downgrade -> Deferred to next cycle
            proration_billing_mode: isDowngrade ? "full_next_period" : "prorated_immediately",
            custom_data: { org_id: orgId },
          }),
        }
      );

      if (updateRes.ok) {
        // Subscription updated via Paddle — webhook will handle the DB sync
        return apiSuccess({
          action: "subscription_updated",
          is_downgrade: isDowngrade,
          message: isDowngrade 
            ? "Your plan will be downgraded at the end of the current billing cycle." 
            : "Your plan is being upgraded. Changes will reflect shortly.",
          redirect_url: `${APP_URL}/dashboard?checkout=success`,
        });
      }

      // If update fails (e.g. subscription is cancelled), fall through to create new one
      console.warn("[Checkout] Subscription update failed, creating new checkout instead.");
    }

    const origin = req.headers.get("origin") || APP_URL;

    // 6. Create a new Paddle transaction (checkout)
    const transactionRes = await fetch(`${PADDLE_API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer_id: customerId,
        custom_data: { org_id: orgId },
        checkout: {
          success_url: `${origin}/dashboard?checkout=success`,
        },
        // Hardened: providing return_url directly can sometimes bypass "Default Payment Link" issues
        return_url: `${origin}/dashboard`,
      }),
    });

    if (!transactionRes.ok) {
      const errData = await transactionRes.json().catch(() => ({}));
      console.error("[Checkout] Failed to create Paddle transaction:", errData);
      
      const debugMsg = errData?.error?.detail || errData?.error?.message || "Failed to create checkout session.";
      throw new AppError(debugMsg, 500);
    }

    const transactionData = await transactionRes.json();
    const checkoutUrl = transactionData.data?.checkout?.url;

    if (!checkoutUrl) {
      throw new AppError("Paddle did not return a checkout URL.", 500);
    }

    return apiSuccess({
      action: "checkout_created",
      checkout_url: checkoutUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
