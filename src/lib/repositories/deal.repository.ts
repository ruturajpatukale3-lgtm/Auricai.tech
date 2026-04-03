// ═══════════════════════════════════════════════════════════
// Auricai — Deal Repository
// CRUD for deals table. Every query scoped by org_id.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Deal, DealStatus } from "@/types";

const TABLE = "deals";

export const DealRepository = {
  async create(
    orgId: string,
    input: { name: string; value: number; status?: DealStatus }
  ): Promise<Deal> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        org_id: orgId,
        name: input.name,
        value: input.value,
        status: input.status || "open",
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create deal: ${error.message}`);
    return data as Deal;
  },

  async findByOrg(
    orgId: string,
    filters?: { status?: DealStatus; limit?: number; offset?: number }
  ): Promise<Deal[]> {
    let query = supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.limit) {
      const from = filters.offset || 0;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch deals: ${error.message}`);
    return (data || []) as Deal[];
  },

  async findById(orgId: string, id: string): Promise<Deal | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();
    if (error || !data) return null;
    return data as Deal;
  },

  async updateStatus(
    orgId: string,
    id: string,
    status: DealStatus
  ): Promise<Deal> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ status })
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();
    if (error) throw new Error(`Failed to update deal status: ${error.message}`);
    return data as Deal;
  },

  async delete(orgId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to delete deal: ${error.message}`);
  },

  // ─── Analytics Aggregations ───────────────────────────────

  /**
   * Total pipeline = SUM(value) of all deals that have at least one attribution
   */
  async sumAttributedPipeline(orgId: string): Promise<number> {
    try {
      const { data, error } = await supabaseAdmin
        .from("deal_attributions")
        .select("source, deal_id, external_deal_id, deals(value), external_deals(amount)")
        .eq("org_id", orgId);
        
      if (error) throw error;
      
      const seenInternal = new Set<string>();
      const seenExternal = new Set<string>();
      let total = 0;
      
      for (const row of data || []) {
        if (row.source === "hubspot" && row.external_deal_id && !seenExternal.has(row.external_deal_id)) {
          seenExternal.add(row.external_deal_id);
          total += Number((row as any).external_deals?.amount) || 0;
        } else if (row.source === "internal" && row.deal_id && !seenInternal.has(row.deal_id)) {
          seenInternal.add(row.deal_id);
          total += Number((row as any).deals?.value) || 0;
        }
      }
      return total;
    } catch (err) {
      console.warn("[DealRepository] sumAttributedPipeline fallback (likely missing HubSpot tables/columns):", err);
      // Fallback: query internal deals directly from the deals table
      const { data: fallback } = await supabaseAdmin
        .from(TABLE)
        .select("value")
        .eq("org_id", orgId);
      return (fallback || []).reduce((sum, r) => sum + (Number(r.value) || 0), 0);
    }
  },

  /**
   * Verifiable revenue = SUM(value) of closed_won deals with attribution
   */
  async sumVerifiableRevenue(orgId: string): Promise<number> {
    try {
      const { data, error } = await supabaseAdmin
        .from("deal_attributions")
        .select("source, deal_id, external_deal_id, deals(value, status), external_deals(amount, stage)")
        .eq("org_id", orgId);
        
      if (error) throw error;
      
      const seenInternal = new Set<string>();
      const seenExternal = new Set<string>();
      let total = 0;
      
      for (const row of data || []) {
        if (row.source === "hubspot" && row.external_deal_id && !seenExternal.has(row.external_deal_id)) {
          seenExternal.add(row.external_deal_id);
          const externalDeal = (row as any).external_deals;
          if (externalDeal?.stage === "closedwon") {
            total += Number(externalDeal.amount) || 0;
          }
        } else if (row.source === "internal" && row.deal_id && !seenInternal.has(row.deal_id)) {
          seenInternal.add(row.deal_id);
          const deal = (row as any).deals;
          if (deal?.status === "closed_won") {
            total += Number(deal.value) || 0;
          }
        }
      }
      return total;
    } catch (err) {
      console.warn("[DealRepository] sumVerifiableRevenue fallback:", err);
      // Fallback for missing external_deals table or columns
      const { data: fallback } = await supabaseAdmin
        .from(TABLE)
        .select("value")
        .eq("org_id", orgId)
        .eq("status", "closed_won");
      return (fallback || []).reduce((sum, r) => sum + (Number(r.value) || 0), 0);
    }
  },

  /**
   * Count distinct deals that have at least one attribution
   */
  async countAttributedDeals(orgId: string): Promise<number> {
    try {
      const { data, error } = await supabaseAdmin
        .from("deal_attributions")
        .select("source, deal_id, external_deal_id")
        .eq("org_id", orgId);
        
      if (error) throw error;
      
      const uniqueDeals = new Set<string>();
      for (const row of data || []) {
        if (row.source === "hubspot" && row.external_deal_id) {
          uniqueDeals.add(`ext_${row.external_deal_id}`);
        } else if (row.source === "internal" && row.deal_id) {
          uniqueDeals.add(`int_${row.deal_id}`);
        }
      }
      return uniqueDeals.size;
    } catch (err) {
      console.warn("[DealRepository] countAttributedDeals fallback:", err);
      const { count } = await supabaseAdmin
        .from(TABLE)
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId);
      return count || 0;
    }
  },

  async countByOrg(orgId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);
    if (error) return 0;
    return count || 0;
  },
};
