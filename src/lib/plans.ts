// ═══════════════════════════════════════════════════════════
// CaseFlow — Plan Configuration (Single Source of Truth)
// NEVER trust frontend for plan or limits.
// ALL feature access gated by plan_type from DB.
// ═══════════════════════════════════════════════════════════

import type { PlanType, PlanLimits, Organization, Usage } from "@/types";

// ─── Plan Definitions ──────────────────────────────────────

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    interviews: 2,
    caseStudies: 2,
    teamSeats: 1,
    customDomain: false,
    watermark: true,
  },
  trial: {
    interviews: 25,
    caseStudies: 25,
    teamSeats: 1,
    customDomain: false,
    watermark: true,
  },
  starter: {
    interviews: 25,
    caseStudies: 25,
    teamSeats: 1,
    customDomain: false,
    watermark: true,
  },
  growth: {
    interviews: 60,
    caseStudies: 60,
    teamSeats: 2,
    customDomain: false,
    watermark: true,
  },
  enterprise: {
    interviews: 1000,
    caseStudies: -1,
    teamSeats: 5,
    customDomain: true,
    watermark: false,
    isSoftUnlimited: true,
  },
};

// ─── Plan Priority (Strict Hierarchy) ───────────────────────
// Used to prevent accidental downgrades via webhooks.
// Higher number = higher priority. A webhook must NOT
// reduce a plan's priority unless it's a confirmed downgrade.

export const PLAN_PRIORITY: Record<PlanType, number> = {
  free: 1,
  trial: 2,
  starter: 3,
  growth: 4,
  enterprise: 5,
};

export function getPlanPriority(plan: PlanType | string): number {
  return PLAN_PRIORITY[plan as PlanType] ?? 0;
}

export function isUpgrade(from: PlanType | string, to: PlanType | string): boolean {
  return getPlanPriority(to) > getPlanPriority(from);
}

export function isDowngrade(from: PlanType | string, to: PlanType | string): boolean {
  return getPlanPriority(to) < getPlanPriority(from);
}

// ─── Plan Pricing (Paddle Price IDs) ───────────────────────

export const PADDLE_PRICE_IDS: Record<string, PlanType> = {
  // Monthly
  [process.env.PADDLE_STARTER_PRICE_ID || "pri_starter_monthly"]: "starter",
  [process.env.PADDLE_GROWTH_PRICE_ID || "pri_growth_monthly"]: "growth",
  [process.env.PADDLE_ENTERPRISE_PRICE_ID || "pri_enterprise_monthly"]: "enterprise",
  // Yearly — add when ready
  [process.env.PADDLE_STARTER_YEARLY_PRICE_ID || "pri_starter_yearly"]: "starter",
  [process.env.PADDLE_GROWTH_YEARLY_PRICE_ID || "pri_growth_yearly"]: "growth",
  [process.env.PADDLE_ENTERPRISE_YEARLY_PRICE_ID || "pri_enterprise_yearly"]: "enterprise",
};

/**
 * Returns true if the price ID belongs to a yearly billing cycle.
 */
export function isYearlyPriceId(priceId: string): boolean {
  const yearlyIds = [
    process.env.PADDLE_STARTER_YEARLY_PRICE_ID,
    process.env.PADDLE_GROWTH_YEARLY_PRICE_ID,
    process.env.PADDLE_ENTERPRISE_YEARLY_PRICE_ID,
    // Add fallback IDs for testing
    "pri_starter_yearly",
    "pri_growth_yearly",
    "pri_enterprise_yearly"
  ].filter(Boolean); // Filter out undefined if env vars are missing
  return yearlyIds.includes(priceId);
}


// ─── Limit Checks (Server-side Only) ──────────────────────

export function getPlanLimits(planType: PlanType): PlanLimits {
  return PLAN_LIMITS[planType] || PLAN_LIMITS.free;
}

export function canCreateInterview(
  org: Organization,
  usage: Usage
): { allowed: boolean; reason?: string } {
  const limits = getPlanLimits(org.plan_type);
  if (limits.interviews === -1) return { allowed: true };
  if (usage.interviews_used >= limits.interviews) {
    return {
      allowed: false,
      reason: `Interview limit reached (${usage.interviews_used}/${limits.interviews}). Upgrade to send more.`,
    };
  }
  return { allowed: true };
}

export function canCreateCaseStudy(
  org: Organization,
  usage: Usage
): { allowed: boolean; reason?: string } {
  const limits = getPlanLimits(org.plan_type);
  if (limits.caseStudies === -1) return { allowed: true };
  if (usage.case_studies_used >= limits.caseStudies) {
    return {
      allowed: false,
      reason: `Case study limit reached (${usage.case_studies_used}/${limits.caseStudies}). Upgrade to create more.`,
    };
  }
  return { allowed: true };
}

export function canInviteTeam(
  org: Organization,
  currentActiveCount: number
): { allowed: boolean; reason?: string; code?: string } {
  const limits = getPlanLimits(org.plan_type);
  if (currentActiveCount >= limits.teamSeats) {
    return {
      allowed: false,
      code: "TEAM_LIMIT_REACHED",
      reason: "Reduce team members or upgrade plan",
    };
  }
  return { allowed: true };
}

export function canAddDomain(
  org: Organization
): { allowed: boolean; reason?: string } {
  const limits = getPlanLimits(org.plan_type);
  if (!limits.customDomain) {
    return {
      allowed: false,
      reason: "Custom domains are available on the Enterprise plan only.",
    };
  }
  return { allowed: true };
}

export function hasWatermark(org: Organization): boolean {
  return getPlanLimits(org.plan_type).watermark;
}

export function resolvePlanFromPriceId(priceId: string): PlanType | null {
  return PADDLE_PRICE_IDS[priceId] || null;
}
