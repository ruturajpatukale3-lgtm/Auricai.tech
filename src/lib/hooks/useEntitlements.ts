// ═══════════════════════════════════════════════════════════
// CaseFlow — useEntitlements Hook
// ═══════════════════════════════════════════════════════════

import useSWR from "swr";

export interface SubscriptionUsage {
  plan: string;
  interviews_used: number;
  interviews_limit: number;
  team_seat_limit: number;
  current_period_end: string;
  usage_percent: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useEntitlements() {
  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data: SubscriptionUsage }>(
    "/api/subscription/usage",
    fetcher
  );

  const usage = data?.data;

  return {
    usage,
    isLoading,
    isError: error || (data && !data.success),
    isNearLimit: (usage?.usage_percent || 0) >= 70,
    isAtLimit: (usage?.usage_percent || 0) >= 100,
    refreshEntitlements: mutate
  };
}
