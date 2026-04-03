"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Organization, PlanType, TeamRole, PlanLimits } from "@/types";

interface OrgContextType {
  orgId: string | null;
  org: Organization | null;
  role: TeamRole | null;
  planType: PlanType;
  limits: PlanLimits | null;
  isLoading: boolean;
  isOnboarded: boolean;
  refetch: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<TeamRole | null>(null);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!isSignedIn) { setIsLoading(false); return; }
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const { data } = await res.json();
        setOrgId(data.org.id);
        setOrg(data.org);
        setLimits(data.limits);
        setIsOnboarded(true);
        // Role would come from a separate context or be part of settings response
      } else if (res.status === 403) {
        setIsOnboarded(false);
      }
    } catch {
      console.error("[OrgContext] Failed to fetch settings");
    } finally { setIsLoading(false); }
  }, [isSignedIn]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return (
    <OrgContext.Provider value={{
      orgId,
      org,
      role,
      planType: (org?.plan_type as PlanType) || "free",
      limits,
      isLoading,
      isOnboarded,
      refetch: fetchSettings,
    }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
