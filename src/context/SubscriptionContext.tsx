"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { UpgradePaywallModal } from "@/components/dashboard/UpgradePaywallModal";

export type PlanType = "free" | "trial" | "starter" | "growth" | "enterprise";

interface SubscriptionContextType {
  planType: PlanType;
  planLabel: string;
  interviewsUsed: number;
  interviewsLimit: number;
  lifetimeInterviewsUsed: number;
  teamSeatsUsed: number;
  teamSeatLimit: number;
  usagePercent: number;
  currentPeriodEnd: string | null;
  nextPlan: string | null;
  paymentStatus: "active" | "past_due" | "cancelled" | "refunded" | "inactive";
  trialEnd: string | null;
  trialConsumed: boolean;
  accessBlocked: boolean;
  isLoading: boolean;
  isNearLimit: boolean;
  isAtLimit: boolean;
  isLifetime: boolean;
  canCreateInterview: boolean; // Requirement 10 & 15 enforcement
  showPaywall: (metric?: string, limit?: number) => void;
  refresh: () => Promise<void>;
  refreshWithRetry: (expectedPlan?: string) => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [usage, setUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState<{ metric?: string; limit?: number }>({});
  const prevPlanRef = useRef<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch("/api/subscription/usage");
      if (res.ok) {
        const { data } = await res.json();
        setUsage(data);
        prevPlanRef.current = data?.plan || null;
      }
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  // ─── Polling retry for checkout success (Requirement 12) ─────
  // Intervals: Immediate, 500ms, 1000ms
  const refreshWithRetry = useCallback(async (expectedPlan?: string): Promise<boolean> => {
    const originalPlan = prevPlanRef.current;
    
    // Attempt 1: Immediate
    try {
      const res = await fetch("/api/subscription/usage");
      if (res.ok) {
        const { data } = await res.json();
        if (expectedPlan ? data?.plan === expectedPlan : data?.plan !== originalPlan) {
          setUsage(data);
          prevPlanRef.current = data?.plan;
          return true;
        }
      }
    } catch { /* ignore */ }

    // Attempt 2: 500ms
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch("/api/subscription/usage");
      if (res.ok) {
        const { data } = await res.json();
        if (expectedPlan ? data?.plan === expectedPlan : data?.plan !== originalPlan) {
          setUsage(data);
          prevPlanRef.current = data?.plan;
          return true;
        }
      }
    } catch { /* ignore */ }

    // Attempt 3: 1000ms
    await new Promise(r => setTimeout(r, 1000));
    await fetchUsage();
    return prevPlanRef.current !== originalPlan;
  }, [fetchUsage]);

  // ─── Background Polling ──────────────────────────────────
  useEffect(() => {
    if (!isSignedIn) return;
    const interval = setInterval(fetchUsage, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [fetchUsage, isSignedIn]);

  // Initial fetch
  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  // ─── Tab focus refetch (Requirement 13) ───────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isSignedIn) {
        fetchUsage();
      }
    };
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchUsage, isSignedIn]);

  const showPaywall = (metric?: string, limit?: number) => {
    setModalProps({ metric, limit });
    setModalOpen(true);
  };

  const planType = (usage?.plan || "free") as PlanType;
  const isFree = planType === "free";
  const used = isFree ? (usage?.lifetime_interviews_used || 0) : (usage?.interviews_used || 0);
  const limit = usage?.interviews_limit || 2;
  const isAtLimit = used >= limit;
  const paymentStatus = usage?.payment_status || "active";
  const isActive = ["active", "past_due"].includes(paymentStatus);
  const isTrial = planType === "trial";

  // Requirement 10: Block if limit reached OR payment inactive (except for trials)
  const canCreateInterview = !usage?.access_blocked && !isAtLimit && (isActive || isTrial);

  return (
    <SubscriptionContext.Provider
      value={{
        planType,
        planLabel: usage?.plan_label || "Free (2 interviews)",
        interviewsUsed: used,
        interviewsLimit: limit,
        lifetimeInterviewsUsed: usage?.lifetime_interviews_used || 0,
        teamSeatsUsed: usage?.team_seats_used || 0,
        teamSeatLimit: usage?.team_seat_limit || 1,
        usagePercent: limit > 0 ? (used / limit) * 100 : 100,
        currentPeriodEnd: usage?.current_period_end || null,
        nextPlan: usage?.next_plan || null,
        paymentStatus: paymentStatus as any,
        trialEnd: usage?.trial_end || null,
        trialConsumed: !!usage?.trial_consumed,
        accessBlocked: !!usage?.access_blocked,
        isLoading,
        isNearLimit: limit > 0 ? (used / limit) >= 0.8 : true,
        isAtLimit,
        isLifetime: !!usage?.is_lifetime,
        canCreateInterview,
        showPaywall,
        refresh: fetchUsage,
        refreshWithRetry,
      }}
    >
      {children}
      <UpgradePaywallModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        metric={modalProps.metric}
        limit={modalProps.limit}
        planType={planType}
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
