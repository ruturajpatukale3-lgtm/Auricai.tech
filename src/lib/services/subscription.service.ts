// ═══════════════════════════════════════════════════════════
// CaseFlow — Subscription & Entitlement Service
// Hardened enforcement: atomic counters → lazy reset → strict limits
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import { 
    PlanLimitError, 
    NotFoundError, 
    FairUsageLimitError, 
    RateLimitError,
    AbuseFlagError,
    AbuseBlockActiveError,
    CostGuardrailError,
    AppError,
    PaymentRequiredError
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Subscription } from "@/types";

export const SubscriptionService = {
  /**
   * Fetch subscription and handle lazy reset (handled by Postgres function)
   */
  async getSubscription(orgId: string): Promise<Subscription | null> {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("org_id", orgId)
      .single();

    if (error || !data) return null;
    return data as Subscription;
  },

  /**
   * Atomic guard for interview creation.
   * Multi-layered safety: Burst Limit -> Daily Limit -> Monthly Fair Usage.
   * For free plan: uses lifetime counter and cross-org identity limits.
   */
  async checkInterviewAccess(orgId: string, userId?: string): Promise<void> {
    const cacheKey = `rate_limit:${orgId}`;
    let skipRpc = false;

    // 1. Distributed Cache Check (TTL: 5s)
    const { data: cached } = await supabaseAdmin
      .from("rate_limit_cache")
      .select("*")
      .eq("id", cacheKey)
      .single();

    if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
      if (cached.data?.error) {
        const err = cached.data.error;
        if (err.code === "ABUSE_BLOCK_ACTIVE") throw new AbuseBlockActiveError(err.message, err.retryAfter || 1800);
        if (err.code === "ABUSE_FLAG") throw new AbuseFlagError(err.message);
        throw new RateLimitError(err.message, err.retryAfter);
      }
      // Recent success found, skip RPC but proceed to increment usage
      skipRpc = true;
    }

    if (!skipRpc) {
      // 1.5 AI Cost Risk Guardrail ($50/day cap -> ~333 daily calls max regardless of overrides)
      const COST_PER_INTERVIEW = 0.15;
      const DAILY_COST_LIMIT = 50.00;
      
      const { count: dailyVolume } = await supabaseAdmin
        .from("interviews")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", new Date(new Date().setUTCHours(0,0,0,0)).toISOString());

      if (dailyVolume !== null && (dailyVolume * COST_PER_INTERVIEW) >= DAILY_COST_LIMIT) {
        logger.error({ event: "COST_GUARDRAIL_HIT", orgId, metadata: { current_cost: dailyVolume * COST_PER_INTERVIEW }});
        throw new CostGuardrailError("Daily maximum resource usage detected. Account review required.");
      }

      // 2. Rate Limit & Abuse Check (Daily/Burst/Abuse)
      const { data: rateLimit, error: rateError } = await supabaseAdmin.rpc("check_rate_limits", { p_org_id: orgId });
      if (rateError) throw new AppError(rateError.message, 500);
      
      if (rateLimit && (rateLimit as any).success === false) {
        const rl = rateLimit as any;
        const errObj = {
          code: rl.error,
          message: rl.message || "Rate limit exceeded",
          retryAfter: rl.retry_after
        };

        // Cache the error briefly to prevent hammering the DB during a block
        await supabaseAdmin.from("rate_limit_cache").upsert({
          id: cacheKey,
          data: { error: errObj },
          expires_at: new Date(Date.now() + 5000).toISOString()
        });

        if (rl.error === "ABUSE_BLOCK_ACTIVE") throw new AbuseBlockActiveError(errObj.message, errObj.retryAfter || 1800);
        if (rl.error === "ABUSE_FLAG") throw new AbuseFlagError(errObj.message);
        throw new RateLimitError(errObj.message, errObj.retryAfter);
      }

      // Record success in cache
      await supabaseAdmin.from("rate_limit_cache").upsert({
        id: cacheKey,
        data: { success: true },
        expires_at: new Date(Date.now() + 5000).toISOString()
      });
    }

    // 3. Increment usage (Atomic & Strict Limit Check)
    const { data: usageResult, error: usageError } = await supabaseAdmin.rpc("increment_interview_usage", {
      p_org_id: orgId,
      p_user_id: userId || null,
    });
    if (usageError) throw new AppError(usageError.message, 500);

    const result = usageResult as any;
    if (!result.success) {
      if (result.error === "ACCESS_BLOCKED") {
        throw new AppError(result.message || "Account blocked.", 403, "ACCESS_BLOCKED");
      }
      if (result.error === "FREE_LIMIT_REACHED") {
        throw new PlanLimitError(
          result.message || "Free plan limit reached (2 lifetime interviews). Upgrade to send more.",
          {
            metric: "interviews",
            limit: result.limit || 2,
            used: result.used || 0,
            upgrade_required: true,
            is_lifetime: true,
          }
        );
      }
      if (result.error === "PAYMENT_REQUIRED") {
        throw new PaymentRequiredError(result.message || "Payment required to continue. Your subscription is cancelled.");
      }
      if (result.error === "TRIAL_EXPIRED") {
        throw new PlanLimitError("Trial period expired. Please upgrade to continue sending interviews.", {
          metric: "trial",
          limit: 0,
          used: 0,
          upgrade_required: true,
        });
      }
      if (result.error === "LIMIT_REACHED") {
        throw new PlanLimitError(`Interview limit reached (${result.used}/${result.limit}). Upgrade to send more.`, {
          metric: "interviews",
          limit: result.limit,
          used: result.used,
          upgrade_required: true,
        });
      }
      throw new AppError(result.error || "Usage update failed", 400);
    }
  },

  /**
   * Enforce seat limits for team invitations
   */
  async checkTeamSeatAccess(orgId: string): Promise<void> {
    const sub = await this.getSubscription(orgId);
    if (!sub) throw new NotFoundError("Subscription");

    const { count, error } = await supabaseAdmin
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    if (error) throw new Error(`Failed to count team seats: ${error.message}`);

    if ((count || 0) >= sub.team_seat_limit) {
      const err = new PlanLimitError("Reduce team members or upgrade plan", {
        metric: "team_seats",
        limit: sub.team_seat_limit,
        used: count || 0,
        upgrade_required: true,
      });
      err.code = "TEAM_LIMIT_REACHED";
      throw err;
    }
  },

  /**
   * Static feature gating based on plan_name.
   * "Limit-Only" model: features like analytics are unrestricted.
   */
  async checkFeatureAccess(orgId: string, feature: "custom_domain" | "white_label"): Promise<boolean> {
    const sub = await this.getSubscription(orgId);
    if (!sub) return false;

    const plan = sub.plan_name.toLowerCase();

    // Only branding features are gated by plan tier
    if (feature === "custom_domain") {
      return plan === "enterprise";
    }

    if (feature === "white_label") {
      return plan === "enterprise";
    }

    return false;
  },

  /**
   * Call RPC to deactivate excess team members if they exceed current plan limits.
   */
  async enforceSeatLimits(orgId: string): Promise<void> {
    const { error } = await supabaseAdmin.rpc("enforce_seat_limits", { p_org_id: orgId });
    if (error) {
      logger.error({ event: "ENFORCE_SEAT_LIMITS_FAILED", orgId, error: error.message });
    }
  },

  /**
   * Verify if the organization is eligible to re-subscribe (30-day cooling-off after refund)
   */
  async checkResubscribeEligibility(orgId: string): Promise<{ eligible: boolean; remainingDays?: number }> {
    const sub = await this.getSubscription(orgId);
    if (!sub || !sub.refunded_at) return { eligible: true };

    const refundedAt = new Date(sub.refunded_at);
    const now = new Date();
    const diffMs = now.getTime() - refundedAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return { eligible: false, remainingDays: 30 - diffDays };
    }

    return { eligible: true };
  }
};
