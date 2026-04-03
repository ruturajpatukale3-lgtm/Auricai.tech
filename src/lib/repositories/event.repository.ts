// ═══════════════════════════════════════════════════════════
// CaseFlow — Event Repository
// Log EVERY action. Used for analytics + activity feed.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Event, EventType } from "@/types";

const TABLE = "events";

export const EventRepository = {
  async findByOrg(
    orgId: string,
    filters?: {
      type?: EventType;
      types?: EventType[];
      limit?: number;
      offset?: number;
    }
  ): Promise<Event[]> {
    let query = supabaseAdmin
      .from(TABLE)
      .select("id, type, entity_id, metadata, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.types && filters.types.length > 0) {
      query = query.in("type", filters.types);
    }
    
    if (filters?.limit) {
      const from = filters.offset || 0;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch events: ${error.message}`);
    return (data || []) as Event[];
  },

  async create(
    orgId: string,
    type: EventType,
    entityId?: string,
    metadata?: Record<string, unknown>,
    eventHash?: string
  ): Promise<Event> {
    const payload: any = {
      org_id: orgId,
      type,
      entity_id: entityId || null,
      metadata: metadata || null,
    };
    
    if (eventHash) {
      payload.event_hash = eventHash;
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert(payload)
      .select()
      .single();
      
    if (error) {
      if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('events_event_hash_key')) {
        throw new Error(`duplicate_event: ${error.message}`);
      }
      throw new Error(`Failed to create event: ${error.message}`);
    }
    
    return data as Event;
  },

  async countByTypes(
    orgId: string,
    types: EventType[]
  ): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("type", types);
    if (error) throw new Error(`Failed to count events: ${error.message}`);
    return count || 0;
  },

  async getUsageByDate(
    orgId: string,
    types: EventType[],
    days: number = 30
  ): Promise<{ date: string; count: number }[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("created_at")
      .eq("org_id", orgId)
      .in("type", types)
      .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw new Error(`Failed to fetch usage history: ${error.message}`);
    
    const counts: Record<string, number> = {};
    (data || []).forEach((e) => {
      const date = e.created_at.split("T")[0];
      counts[date] = (counts[date] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getROIBasedUsage(orgId: string): Promise<{ highROIUsage: number; lowROIUsage: number }> {
    // 1. Get all events
    const { data: events, error: evError } = await supabaseAdmin
      .from(TABLE)
      .select("entity_id")
      .eq("org_id", orgId)
      .in("type", ["case_study_viewed", "case_study_shared", "used_in_deal"]);
    
    if (evError) throw new Error(`Failed to fetch events: ${evError.message}`);

    // 2. Get all case studies
    const { data: studies, error: csError } = await supabaseAdmin
      .from("case_studies")
      .select("id, delta_percent")
      .eq("org_id", orgId);
    
    if (csError) throw new Error(`Failed to fetch studies: ${csError.message}`);

    const studyMap = new Map<string, number>(studies.map(s => [s.id, s.delta_percent || 0]));
    
    let highROIUsage = 0;
    let lowROIUsage = 0;

    events.forEach(e => {
      const roi = studyMap.get(e.entity_id || "");
      if (roi !== undefined) {
        if (roi >= 200) highROIUsage++;
        else if (roi < 100) lowROIUsage++;
      }
    });

    return { highROIUsage, lowROIUsage };
  },

  async existsByMetadata(orgId: string, type: EventType, key: string, value: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("id")
      .eq("org_id", orgId)
      .eq("type", type)
      .eq(`metadata->>${key}`, value)
      .limit(1)
      .maybeSingle();
    
    if (error) throw new Error(`Failed to check event existence: ${error.message}`);
    return !!data;
  },

  async getUniqueVisitorCount(orgId: string, days: number = 30): Promise<number> {
    const { data, error } = await supabaseAdmin
      .rpc("count_distinct_visitor_ids", { 
        p_org_id: orgId, 
        p_days: days 
      });
    
    if (!error) return data || 0;

    // Fallback: Manual count if RPC not available
    const { data: events, error: manualError } = await supabaseAdmin
      .from(TABLE)
      .select("metadata")
      .eq("org_id", orgId)
      .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
    
    if (manualError) throw new Error(`Failed to count unique visitors: ${manualError.message}`);
    
    const visitors = new Set((events || []).map(e => e.metadata?.visitor_id).filter(Boolean));
    return visitors.size;
  },

  async deleteAllByOrg(orgId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to delete events: ${error.message}`);
  },
};
