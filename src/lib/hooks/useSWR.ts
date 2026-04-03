// ═══════════════════════════════════════════════════════════
// Auricai — SWR Hooks (Client-Side Data Sync)
// Every hook fetches from API routes, never direct DB.
// All hooks include mutate() for optimistic post-mutation refresh.
// ═══════════════════════════════════════════════════════════

"use client";

import useSWR from "swr";
import type {
  Notification,
  Deal,
  CaseStudy,
  Interview,
  DashboardMetrics,
  ActivityFeedItem,
} from "@/types";

// ─── Global Fetcher ────────────────────────────────────────

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
};

// ─── Notifications ─────────────────────────────────────────

export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR<{
    notifications: Notification[];
    unreadCount: number;
  }>("/api/notifications", fetcher, {
    refreshInterval: 30000, // Poll every 30s as realtime fallback
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    isLoading,
    error,
    mutate,
  };
}

// ─── Usage ─────────────────────────────────────────────────

export function useUsage() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/usage",
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
    }
  );

  return {
    usage: data?.usage || null,
    limits: data?.limits || null,
    planType: data?.plan_type || "free",
    isLoading,
    error,
    mutate,
  };
}

// ─── Case Studies ──────────────────────────────────────────

export function useCaseStudies() {
  const { data, error, isLoading, mutate } = useSWR<CaseStudy[]>(
    "/api/case-studies",
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  return {
    caseStudies: data || [],
    isLoading,
    error,
    mutate,
  };
}

// ─── Interviews ────────────────────────────────────────────

export function useInterviews() {
  const { data, error, isLoading, mutate } = useSWR<Interview[]>(
    "/api/interviews",
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  return {
    interviews: data || [],
    isLoading,
    error,
    mutate,
  };
}

// ─── Deals ─────────────────────────────────────────────────

export function useDeals(status?: string) {
  const url = status ? `/api/deals?status=${status}` : "/api/deals";
  const { data, error, isLoading, mutate } = useSWR<Deal[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  return {
    deals: data || [],
    isLoading,
    error,
    mutate,
  };
}

// ─── Analytics (Dashboard Metrics) ─────────────────────────

export function useAnalytics() {
  const { data, error, isLoading, mutate } = useSWR<DashboardMetrics>(
    "/api/analytics",
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
    }
  );

  return {
    metrics: data || null,
    isLoading,
    error,
    mutate,
  };
}

// ─── Activity Feed ─────────────────────────────────────────

export function useActivityFeed(limit: number = 20) {
  const { data, error, isLoading, mutate } = useSWR<ActivityFeedItem[]>(
    `/api/analytics/activity?limit=${limit}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    activities: data || [],
    isLoading,
    error,
    mutate,
  };
}

// ─── Mutation Helper ───────────────────────────────────────

export async function apiGet<T = unknown>(
  url: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json.error || `Request failed: ${res.status}` };
  }
  return { success: true, data: json.data };
}

export async function apiPost<T = unknown>(
  url: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json.error || `Request failed: ${res.status}` };
  }
  return { success: true, data: json.data };
}

export async function apiPatch<T = unknown>(
  url: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json.error || `Request failed: ${res.status}` };
  }
  return { success: true, data: json.data };
}

export async function apiDelete<T = unknown>(
  url: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json.error || `Request failed: ${res.status}` };
  }
  return { success: true, data: json.data };
}
