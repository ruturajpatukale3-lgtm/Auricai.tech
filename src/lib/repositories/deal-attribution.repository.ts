// ═══════════════════════════════════════════════════════════
// Auricai — Deal Attribution Repository
// Many-to-many mapping between deals and case studies.
// Enforces unique constraint to prevent duplicate attributions.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { DealAttribution } from "@/types";

const TABLE = "deal_attributions";

export const DealAttributionRepository = {
  /**
   * Create a new attribution link.
   * The DB unique constraint (deal_id, case_study_id) prevents duplicates.
   */
  async create(
    orgId: string,
    dealId: string | null,
    caseStudyId: string,
    influenceWeight: number = 1,
    externalDealId: string | null = null,
    source: "internal" | "hubspot" = "internal"
  ): Promise<DealAttribution> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        org_id: orgId,
        deal_id: dealId,
        case_study_id: caseStudyId,
        influence_weight: influenceWeight,
        external_deal_id: externalDealId,
        source: source,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation gracefully
      if (error.code === "23505" || error.message?.includes("duplicate key")) {
        throw new Error("DUPLICATE_ATTRIBUTION");
      }
      throw new Error(`Failed to create attribution: ${error.message}`);
    }
    return data as DealAttribution;
  },

  /**
   * Find all attributions for a specific deal
   */
  async findByDeal(orgId: string, dealId: string): Promise<DealAttribution[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch deal attributions: ${error.message}`);
    return (data || []) as DealAttribution[];
  },

  /**
   * Find all attributions for a specific case study
   */
  async findByCaseStudy(
    orgId: string,
    caseStudyId: string
  ): Promise<DealAttribution[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .eq("case_study_id", caseStudyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch attributions: ${error.message}`);
    return (data || []) as DealAttribution[];
  },

  /**
   * Remove a specific attribution
   */
  async delete(orgId: string, dealId: string, caseStudyId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("org_id", orgId)
      .eq("deal_id", dealId)
      .eq("case_study_id", caseStudyId);
    if (error) throw new Error(`Failed to delete attribution: ${error.message}`);
  },

  /**
   * Remove all attributions for a deal (cascade cleanup)
   */
  async deleteByDeal(orgId: string, dealId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("org_id", orgId)
      .eq("deal_id", dealId);
    if (error) throw new Error(`Failed to delete deal attributions: ${error.message}`);
  },

  /**
   * Count attributions for a case study (for UI badges)
   */
  async countByCaseStudy(orgId: string, caseStudyId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("case_study_id", caseStudyId);
    if (error) return 0;
    return count || 0;
  },
};
