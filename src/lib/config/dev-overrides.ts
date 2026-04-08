// ═══════════════════════════════════════════════════════════
// CaseFlow — Developer Subscription Overrides
// This file contains the bypass logic for internal testing.
// ═══════════════════════════════════════════════════════════

export const DEV_TEST_EMAILS = [
  "ruturajpatukale3@gamil.com"
];

/**
 * Checks if the dev override system should be active for a given email.
 * Hard-gated to non-production environments AND explicit enablement flag.
 */
export function isDevOverrideActive(email?: string | null): boolean {
  if (!email) return false;

  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_DEV_OVERRIDE === "true" &&
    DEV_TEST_EMAILS.includes(email.toLowerCase().trim())
  );
}

export type TestPlanType = "starter" | "growth" | "enterprise";

export const MOCKED_PLANS: Record<TestPlanType, any> = {
  starter: {
    plan_name: "starter",
    plan_label: "Starter (Mocked)",
    interviews_limit: 25,
    team_seat_limit: 3,
  },
  growth: {
    plan_name: "growth",
    plan_label: "Growth (Mocked)",
    interviews_limit: 60,
    team_seat_limit: 10,
  },
  enterprise: {
    plan_name: "enterprise",
    plan_label: "Enterprise (Mocked)",
    interviews_limit: 999999, // Unlimited
    team_seat_limit: 999,
  },
};
