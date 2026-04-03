// ═══════════════════════════════════════════════════════════
// CaseFlow — Supabase Realtime Subscriptions
// Subscribe to DB changes for live dashboard updates.
// ═══════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ChangeCallback = (payload: Record<string, unknown>) => void;

/**
 * Subscribe to interview changes for an org
 */
export function subscribeToInterviews(
  orgId: string,
  onInsert?: ChangeCallback,
  onUpdate?: ChangeCallback
): RealtimeChannel {
  const channel = supabase
    .channel(`interviews:${orgId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "interviews",
        filter: `org_id=eq.${orgId}`,
      },
      (payload) => onInsert?.(payload.new as Record<string, unknown>)
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "interviews",
        filter: `org_id=eq.${orgId}`,
      },
      (payload) => onUpdate?.(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to case study changes for an org
 */
export function subscribeToCaseStudies(
  orgId: string,
  onInsert?: ChangeCallback,
  onUpdate?: ChangeCallback
): RealtimeChannel {
  const channel = supabase
    .channel(`case_studies:${orgId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "case_studies",
        filter: `org_id=eq.${orgId}`,
      },
      (payload) => onInsert?.(payload.new as Record<string, unknown>)
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "case_studies",
        filter: `org_id=eq.${orgId}`,
      },
      (payload) => onUpdate?.(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to new events for activity feed
 */
export function subscribeToEvents(
  orgId: string,
  onInsert?: ChangeCallback
): RealtimeChannel {
  const channel = supabase
    .channel(`events:${orgId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "activities",
        filter: `org_id=eq.${orgId}`,
      },
      (payload) => onInsert?.(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to usage changes for limit tracking
 */
export function subscribeToUsage(
  orgId: string,
  onUpdate?: ChangeCallback
): RealtimeChannel {
  const channel = supabase
    .channel(`usage:${orgId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "usage",
        filter: `org_id=eq.${orgId}`,
      },
      (payload) => onUpdate?.(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to new notifications
 */
export function subscribeToNotifications(
  orgId: string,
  onInsert?: ChangeCallback
): RealtimeChannel {
  const channel = supabase
    .channel(`notifications:${orgId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `org_id=eq.${orgId}`,
      },
      (payload) => onInsert?.(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
