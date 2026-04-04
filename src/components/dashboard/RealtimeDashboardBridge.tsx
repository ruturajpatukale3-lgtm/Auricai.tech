"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

/**
 * RealtimeDashboardBridge
 * 
 * A headless client component that listens for database changes matching the organization
 * and triggers a server-side data refresh (via router.refresh()) to update RSC-rendered charts and tables.
 */
export function RealtimeDashboardBridge({ orgId }: { orgId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!orgId) return;

    // Implement adaptive debounce to prevent refresh storms but avoid delay when quiet.
    let refreshTimeout: NodeJS.Timeout;
    let burstCount = 0;
    let lastEventTime = 0;

    const debouncedRefresh = (source: string) => {
      const now = Date.now();

      // If events fire within 1500ms of each other, count it as a burst
      if (now - lastEventTime < 1500) {
        burstCount++;
      } else {
        burstCount = 0;
      }
      lastEventTime = now;

      // Adjust debounce window based on bursts
      const timeoutMs = burstCount > 2 ? 1500 : 300;

      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        console.log(`[Realtime] Batching update from ${source} (Burst: ${burstCount}), refreshing RSC...`);
        router.refresh();
        burstCount = 0; // reset after refresh fires
      }, timeoutMs);
    };

    // 1. Subscribe to Events (Activity Feed / Analytics)
    // Since all domain logic produces events, this is the single source of truth for refreshing data.
    const eventsChannel = supabase
      .channel(`realtime-events-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `org_id=eq.${orgId}`,
        },
        () => debouncedRefresh("events")
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      clearTimeout(refreshTimeout);
      supabase.removeChannel(eventsChannel);
    };
  }, [orgId, router]);

  return null; // Headless component
}
