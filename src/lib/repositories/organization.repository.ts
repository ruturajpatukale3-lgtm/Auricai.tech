// ═══════════════════════════════════════════════════════════
// CaseFlow — Organization Repository
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Organization } from "@/types";

const TABLE = "organizations";

export const OrganizationRepository = {
  async findById(orgId: string): Promise<Organization | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("id", orgId)
      .single();
    if (error || !data) return null;
    return data as Organization;
  },

  async findByDomain(domain: string): Promise<Organization | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("domain", domain)
      .single();
    if (error || !data) return null;
    return data as Organization;
  },

  async create(input: {
    name: string;
    plan_type?: string;
  }): Promise<Organization> {
    const planType = input.plan_type || "free";
    // 1. Create Organization (Base)
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        name: input.name,
        plan_type: planType,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create organization: ${error.message}`);

    // 2. Initialize Hardened Subscription Record
    const { PLAN_LIMITS } = await import("@/lib/plans");
    const plan = (planType as keyof typeof PLAN_LIMITS) || "free";
    const limits = PLAN_LIMITS[plan];

    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .upsert({
        org_id: data.id,
        plan_name: plan,
        interviews_limit: limits.interviews === -1 ? 999999 : limits.interviews,
        team_seat_limit: limits.teamSeats,
        current_period_start: new Date().toISOString(),
        // Free plan: no billing cycle. Paid plans will get a real period end from Paddle.
        current_period_end: plan === "free"
          ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        // trial_end is NULL for free — only set when trial is explicitly activated
        trial_end: null,
      }, { onConflict: "org_id" });
    
    if (subError) {
      console.error(`[OrganizationRepository] Failed to initialize subscription for ${data.id}:`, subError);
    }

    return data as Organization;
  },

  async update(
    orgId: string,
    updates: Partial<Pick<Organization, "name" | "domain" | "logo_url" | "brand_color" | "ga4_measurement_id">>
  ): Promise<Organization> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(updates)
      .eq("id", orgId)
      .select()
      .single();
    if (error) throw new Error(`Failed to update organization: ${error.message}`);
    return data as Organization;
  },

  async updateSubscription(
    orgId: string,
    subData: {
      plan_type?: string;
      subscription_id?: string;
      subscription_status?: string;
      current_period_end?: string;
      next_plan?: string | null;
      trial_end?: string | null;
      trial_consumed?: boolean;
      payment_status?: "active" | "past_due" | "cancelled" | "refunded" | "inactive";
      access_blocked?: boolean;
      refunded_at?: string | null;
      last_synced_at?: string | null;
      paddle_subscription_id?: string;
      paddle_customer_id?: string;
    }
  ): Promise<Organization> {
    // 1. Update Organization (Base) — exclude Paddle and new Subscription-only fields
    // 1. Update Organization (Base) — exclude Paddle and new Subscription-only fields
    const { 
      paddle_subscription_id, 
      paddle_customer_id, 
      next_plan,
      trial_end,
      trial_consumed,
      payment_status,
      access_blocked,
      refunded_at,
      last_synced_at,
      plan_type, // Also exclude plan_type from base org table
      ...orgFields 
    } = subData;
    
    // Only update organizations if there are remaining valid legacy fields
    let data = null;
    if (Object.keys(orgFields).length > 0) {
      const { data: orgData, error } = await supabaseAdmin
        .from(TABLE)
        .update(orgFields)
        .eq("id", orgId)
        .select()
        .single();
      if (error) throw new Error(`Failed to update organization subscription metadata: ${error.message}`);
      data = orgData;
    }

    // 2. Sync to Hardened Subscriptions Table
    const subUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (subData.current_period_end) subUpdates.current_period_end = subData.current_period_end;
    if (subData.next_plan !== undefined) subUpdates.next_plan = subData.next_plan;
    if (subData.trial_end !== undefined) subUpdates.trial_end = subData.trial_end;
    if (subData.trial_consumed !== undefined) subUpdates.trial_consumed = subData.trial_consumed;
    if (subData.payment_status) subUpdates.payment_status = subData.payment_status;
    if (subData.access_blocked !== undefined) subUpdates.access_blocked = subData.access_blocked;
    if (subData.refunded_at !== undefined) subUpdates.refunded_at = subData.refunded_at;
    if (subData.last_synced_at !== undefined) subUpdates.last_synced_at = subData.last_synced_at;
    if (paddle_subscription_id) subUpdates.paddle_subscription_id = paddle_subscription_id;
    if (paddle_customer_id) subUpdates.paddle_customer_id = paddle_customer_id;

    if (subData.plan_type) {
      const { PLAN_LIMITS } = await import("@/lib/plans");
      const plan = (subData.plan_type as keyof typeof PLAN_LIMITS) || "starter";
      const limits = PLAN_LIMITS[plan];

      await supabaseAdmin
        .from("subscriptions")
        .upsert({
          org_id: orgId,
          plan_name: plan,
          interviews_limit: limits.interviews === -1 ? 999999 : limits.interviews,
          team_seat_limit: limits.teamSeats,
          ...subUpdates,
        }, { onConflict: "org_id" });
    } else {
      await supabaseAdmin
        .from("subscriptions")
        .update(subUpdates)
        .eq("org_id", orgId);
    }

    return data as Organization;
  },

  async delete(orgId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("id", orgId);
    if (error) throw new Error(`Failed to delete organization: ${error.message}`);
  },
};
