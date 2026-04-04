// ═══════════════════════════════════════════════════════════
// CaseFlow — Billing Service (Paddle Webhooks)
// Frontend NEVER changes plan. Only Paddle webhooks do.
// ═══════════════════════════════════════════════════════════

import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { ProcessedWebhooksRepository } from "@/lib/repositories/processed-webhooks.repository";
import { resolvePlanFromPriceId } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PaddleWebhookEvent, PlanType } from "@/types";

export const BillingService = {
  async handleWebhook(event: PaddleWebhookEvent): Promise<void> {
    // 1. Idempotency check (Atomic Insert)
    const successfullyLogged = await ProcessedWebhooksRepository.processEvent(event.event_id);
    if (!successfullyLogged) {
      console.log(`[Billing] Duplicate webhook discarded atomically: ${event.event_id}`);
      return;
    }

    // Route to handler
    switch (event.event_type) {
      case "subscription.created":
      case "subscription.activated":
        await this.handleSubscriptionCreated(event);
        break;
      case "subscription.updated":
        await this.handleSubscriptionUpdated(event);
        break;
      case "subscription.canceled":
        await this.handleSubscriptionCancelled(event);
        break;
      case "subscription.past_due":
        await this.handleSubscriptionPastDue(event);
        break;
      case "subscription.payment_failed":
        await this.handleSubscriptionPaymentFailed(event);
        break;
      case "transaction.completed":
        await this.handleTransactionCompleted(event);
        break;
      case "transaction.refunded":
        await this.handleTransactionRefunded(event);
        break;
      default:
        console.log(`[Billing] Unhandled event: ${event.event_type}`);
    }
  },

  async handleTransactionCompleted(event: PaddleWebhookEvent): Promise<void> {
    // Transaction completed fires for one-time payments and initial subscription payments.
    // For subscriptions, subscription.created will also fire, so we only use this
    // as a fallback to persist customer data if subscription.created somehow missed it.
    const orgId = event.data.custom_data?.org_id;
    if (!orgId) return;

    const customerId = event.data.customer_id;
    if (customerId) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          paddle_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", orgId);
    }
    console.log(`[Billing] Transaction completed: org=${orgId}`);
  },

  async handleSubscriptionCreated(event: PaddleWebhookEvent): Promise<void> {
    const orgId = event.data.custom_data?.org_id;
    if (!orgId) { console.error("[Billing] No org_id in webhook"); return; }

    const priceId = event.data.items?.[0]?.price?.id;
    const resolvedPlan = priceId ? resolvePlanFromPriceId(priceId) : null;
    const incomingPlan = resolvedPlan || "starter";

    // 1. Fetch current subscription state for priority and trial lock
    const { data: currentSub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_name, trial_consumed")
      .eq("org_id", orgId)
      .single();

    const currentPlan = (currentSub?.plan_name || "free") as PlanType;
    const trialConsumed = !!currentSub?.trial_consumed;

    const { getPlanPriority, isUpgrade: isUpgradeFn } = await import("@/lib/plans");
    const currentPriority = getPlanPriority(currentPlan);

    // 2. TRIAL ACTIVATION LOCK (Requirement 5)
    // Trial ONLY activates if current plan is 'free' AND it hasn't been consumed.
    // Otherwise, go directly to the paid plan mapping.
    let targetPlan = incomingPlan;
    let trialEnd: string | null = null;
    let markTrialConsumed = false;

    if (currentPlan === "free" && !trialConsumed) {
      targetPlan = "trial";
      trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      markTrialConsumed = true;
      console.log(`[Billing] Trial activated for org=${orgId} (free → trial, consumption=locked)`);
    }

    const targetPriority = getPlanPriority(targetPlan);

    // 3. PRIORITY ENFORCEMENT (Requirement 7)
    // Never overwrite a higher priority plan with a lower one in sub.created
    if (targetPriority < currentPriority && currentPlan !== "free") {
      console.warn(`[Billing] Rejected status collision: sub.created tried to set ${targetPlan} (prio:${targetPriority}) but org=${orgId} is already on ${currentPlan} (prio:${currentPriority})`);

      // Still sync Paddle IDs for billing continuity
      await supabaseAdmin
        .from("subscriptions")
        .update({
          paddle_subscription_id: event.data.id,
          paddle_customer_id: event.data.customer_id,
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", orgId);
      return;
    }

    // Apply the transition
    await OrganizationRepository.updateSubscription(orgId, {
      plan_type: targetPlan,
      subscription_id: event.data.id,
      subscription_status: "active",
      payment_status: "active",
      current_period_end: event.data.current_billing_period?.ends_at
        || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      next_plan: null,
      paddle_subscription_id: event.data.id,
      paddle_customer_id: event.data.customer_id,
      trial_consumed: markTrialConsumed ? true : trialConsumed,
      ...(trialEnd && { trial_end: trialEnd }),
    });

    const { EventService } = await import("@/lib/services/event.service");
    await EventService.track({
      orgId,
      type: "plan_upgraded",
      metadata: { plan: targetPlan, subscription_id: event.data.id, from: currentPlan, trial_consumed: targetPlan === 'trial' }
    });

    console.log(`[Billing] Sub created: org=${orgId} ${currentPlan} → ${targetPlan}`);
  },

  async handleSubscriptionUpdated(event: PaddleWebhookEvent): Promise<void> {
    let orgId = event.data.custom_data?.org_id;
    if (!orgId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("subscription_id", event.data.id)
        .single();
      if (!data) { console.error("[Billing] Cannot resolve org for update"); return; }
      orgId = data.id as string;
    }

    const priceId = event.data.items?.[0]?.price?.id;
    const incomingPlan = (priceId ? resolvePlanFromPriceId(priceId) : "starter") || "starter";

    // Fetch current state
    const { data: currentSub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_name, interviews_limit")
      .eq("org_id", orgId)
      .single();

    const currentPlan = (currentSub?.plan_name || "free") as PlanType;

    const { getPlanPriority, isUpgrade: isUpgradeFn, isDowngrade: isDowngradeFn } = await import("@/lib/plans");
    const { EventService } = await import("@/lib/services/event.service");

    const currentPriority = getPlanPriority(currentPlan);
    const incomingPriority = getPlanPriority(incomingPlan);

    if (incomingPriority < currentPriority) {
      // ─── DEFERRED DOWNGRADE (Requirement 7 & 14) ─────────────
      // Priority check passed: it's a legitimate downgrade.
      // Use next_plan logic to keep current benefits until period end.
      await OrganizationRepository.updateSubscription(orgId, {
        next_plan: incomingPlan,
        subscription_status: event.data.status || "active",
        ...(event.data.current_billing_period?.ends_at && {
          current_period_end: event.data.current_billing_period.ends_at
        }),
      });
      await EventService.planDowngraded(orgId, incomingPlan);
      console.log(`[Billing] Downgrade deferred: org=${orgId} current=${currentPlan} next=${incomingPlan}`);
    } else if (incomingPriority > currentPriority) {
      // ─── IMMEDIATE UPGRADE ──────────────────────────────────
      await OrganizationRepository.updateSubscription(orgId, {
        plan_type: incomingPlan,
        next_plan: null,
        subscription_status: event.data.status || "active",
        payment_status: "active",
        trial_end: null, // Clear trial if upgrading to paid
        ...(event.data.current_billing_period?.ends_at && {
          current_period_end: event.data.current_billing_period.ends_at
        }),
      });
      await EventService.planUpgraded(orgId, incomingPlan, priceId!);
      console.log(`[Billing] Upgraded immediately: org=${orgId} ${currentPlan} → ${incomingPlan}`);
    } else {
      // RENEWAL / SYNC
      await OrganizationRepository.updateSubscription(orgId, {
        subscription_status: event.data.status || "active",
        payment_status: "active",
        ...(event.data.current_billing_period?.ends_at && {
          current_period_end: event.data.current_billing_period.ends_at
        }),
      });
      console.log(`[Billing] Sub synced/renewed: org=${orgId} plan=${incomingPlan}`);
    }
  },

  async handleSubscriptionCancelled(event: PaddleWebhookEvent): Promise<void> {
    const orgId = event.data.custom_data?.org_id;
    let resolvedId = orgId;
    if (!resolvedId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("subscription_id", event.data.id)
        .single();
      if (!data) { console.error("[Billing] Cannot resolve org for cancel"); return; }
      resolvedId = data.id;
    }

    // DEFERRED DOWNGRADE: Set next_plan to starter, but maintain status until period end
    await OrganizationRepository.updateSubscription(resolvedId!, {
      next_plan: "starter",
      subscription_status: "cancelled", // Paddle status
    });

    const { EventService } = await import("@/lib/services/event.service");
    await EventService.subscriptionCancelled(resolvedId!, event.data.id);
    console.log(`[Billing] Sub cancellation scheduled: org=${resolvedId}`);
  },

  async handleSubscriptionPastDue(event: PaddleWebhookEvent): Promise<void> {
    const orgId = event.data.custom_data?.org_id;
    let resolvedId = orgId;
    if (!resolvedId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("subscription_id", event.data.id)
        .single();
      if (!data) return;
      resolvedId = data.id;
    }

    // Mark as past_due but don't downgrade yet (RPC handles usage warning/block)
    await OrganizationRepository.updateSubscription(resolvedId!, {
      subscription_status: "past_due",
      payment_status: "past_due",
    });

    const { EventService } = await import("@/lib/services/event.service");
    await EventService.paymentFailed(resolvedId!, event.data.id);
    console.log(`[Billing] Sub past_due: org=${resolvedId}`);
  },

  async handleSubscriptionPaymentFailed(event: PaddleWebhookEvent): Promise<void> {
    const orgId = event.data.custom_data?.org_id;
    let resolvedId = orgId;
    if (!resolvedId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("subscription_id", event.data.id)
        .single();
      if (!data) return;
      resolvedId = data.id;
    }

    const { EventService } = await import("@/lib/services/event.service");
    await EventService.paymentFailed(resolvedId!, event.data.id);
    console.log(`[Billing] Sub payment_failed: org=${resolvedId}`);
  },

  async handleTransactionRefunded(event: PaddleWebhookEvent): Promise<void> {
    const orgId = event.data.custom_data?.org_id;
    let resolvedId = orgId;
    if (!resolvedId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("subscription_id", event.data.id)
        .single();
      if (!data) return;
      resolvedId = data.id;
    }

    // Hard block access and mark as refunded
    await OrganizationRepository.updateSubscription(resolvedId!, {
      payment_status: "refunded",
      access_blocked: true,
      refunded_at: new Date().toISOString(),
    });
    console.log(`[Billing] Sub refunded and blocked: org=${resolvedId}`);
  },

  async enforcePlanDowngrade(orgId: string, targetPlan: string): Promise<void> {
    if (targetPlan === "free" || targetPlan === "starter") {
      // 1. Deactivate extra team members (retain only owner or the first user)
      await supabaseAdmin.rpc("enforce_downgrade_team", { p_org: orgId });
      // 2. Deactivate domains
      await supabaseAdmin
        .from("domains")
        .update({ status: "inactive" })
        .eq("org_id", orgId);
    }
  }
};
