// ═══════════════════════════════════════════════════════════
// Auricai — HubSpot Repository
// Manages DB operations for HubSpot OAuth tokens and synced deals.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";

export interface HubSpotConnection {
  id: string;
  organization_id: string;
  access_token: string;
  refresh_token: string;
  portal_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalDeal {
  id: string;
  organization_id: string;
  external_id: string;
  name: string;
  amount: number;
  stage: string;
  contact_email: string | null;
  last_synced_at: string;
  created_at: string;
}

export const HubSpotRepository = {
  // ─── OAuth Connections ────────────────────────────────────────

  async upsertConnection(
    orgId: string,
    tokens: { access_token: string; refresh_token: string; expires_in: number; portal_id?: string }
  ): Promise<HubSpotConnection> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    
    const { data, error } = await supabaseAdmin
      .from("hubspot_connections")
      .upsert(
        {
          organization_id: orgId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          portal_id: tokens.portal_id || null,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        },
        { onConflict: "organization_id" }
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to upsert connection: ${error.message}`);
    return data as HubSpotConnection;
  },

  async getConnection(orgId: string): Promise<HubSpotConnection | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from("hubspot_connections")
        .select("*")
        .eq("organization_id", orgId)
        .single();
      
      if (error || !data) return null;
      return data as HubSpotConnection;
    } catch {
      return null;
    }
  },

  async deleteConnection(orgId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("hubspot_connections")
      .delete()
      .eq("organization_id", orgId);
      
    if (error) throw new Error(`Failed to delete connection: ${error.message}`);
  },

  // ─── External Deals ───────────────────────────────────────────

  async upsertDeals(orgId: string, deals: Omit<ExternalDeal, "id" | "organization_id" | "created_at" | "last_synced_at">[]): Promise<void> {
    if (deals.length === 0) return;

    const payload = deals.map(deal => ({
      organization_id: orgId,
      external_id: deal.external_id,
      name: deal.name,
      amount: deal.amount,
      stage: deal.stage,
      contact_email: deal.contact_email,
      last_synced_at: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin
      .from("external_deals")
      .upsert(payload, { onConflict: "organization_id, external_id" });

    if (error) throw new Error(`Failed to sync external deals: ${error.message}`);
  },

  async getExternalDeals(orgId: string): Promise<ExternalDeal[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from("external_deals")
        .select("*")
        .eq("organization_id", orgId)
        .order("last_synced_at", { ascending: false });

      if (error) {
        console.warn(`[HubSpotRepository] getExternalDeals error: ${error.message}`);
        return [];
      }
      return (data || []) as ExternalDeal[];
    } catch (e) {
      console.warn(`[HubSpotRepository] getExternalDeals exception:`, e);
      return [];
    }
  },

  async getExternalDealById(orgId: string, externalId: string): Promise<ExternalDeal | null> {
    const { data, error } = await supabaseAdmin
      .from("external_deals")
      .select("*")
      .eq("organization_id", orgId)
      .eq("external_id", externalId)
      .single();

    if (error || !data) return null;
    return data as ExternalDeal;
  },

  // ─── Push History ─────────────────────────────────────────────

  async recordPush(
    orgId: string,
    caseStudyId: string,
    email: string,
    noteId: string
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from("hubspot_pushes")
      .insert({
        organization_id: orgId,
        case_study_id: caseStudyId,
        prospect_email: email.toLowerCase().trim(),
        hubspot_note_id: noteId
      });

    if (error) {
      console.warn(`[HubSpotRepository] recordPush error: ${error.message}`);
    }
  },

  async getPushHistory(
    orgId: string,
    caseStudyId: string,
    email: string
  ): Promise<any | null> {
    const { data, error } = await supabaseAdmin
      .from("hubspot_pushes")
      .select("*")
      .eq("organization_id", orgId)
      .eq("case_study_id", caseStudyId)
      .eq("prospect_email", email.toLowerCase().trim())
      .maybeSingle();

    if (error) return null;
    return data;
  },

  // ─── Org & Deal Lookup ────────────────────────────────────────
  
  async getAllConnectedOrgIds(): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from("hubspot_connections")
      .select("organization_id");
      
    if (error) {
      console.warn(`[HubSpotRepository] getAllConnectedOrgIds error: ${error.message}`);
      return [];
    }
    
    return (data || []).map(row => row.organization_id);
  },

  async findDealByEmail(orgId: string, email: string): Promise<ExternalDeal | null> {
    const { data, error } = await supabaseAdmin
      .from("external_deals")
      .select("*")
      .eq("organization_id", orgId)
      .eq("contact_email", email.toLowerCase().trim())
      .order("amount", { ascending: false }) // Prioritize largest deal if multiple
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(`[HubSpotRepository] findDealByEmail error: ${error.message}`);
      return null;
    }
    
    return data as ExternalDeal;
  }
};
