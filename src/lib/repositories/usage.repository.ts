// ═══════════════════════════════════════════════════════════
// CaseFlow — Usage Repository
// Single row per org. Tracks interview + case study counts.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Usage } from "@/types";

const TABLE = "usage";

export const UsageRepository = {
  async findByOrg(orgId: string): Promise<Usage | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .single();
    if (error || !data) return null;
    return data as Usage;
  },

  async create(orgId: string): Promise<Usage> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        org_id: orgId,
        interviews_used: 0,
        case_studies_used: 0,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create usage: ${error.message}`);
    return data as Usage;
  },

  async getOrCreate(orgId: string): Promise<Usage> {
    // 1. Perform strict counts (No hardcoded numbers rule)
    const [interviewCount, caseStudyCount] = await Promise.all([
      supabaseAdmin.from("interviews").select("*", { count: "exact", head: true }).eq("org_id", orgId).then(r => r.count || 0),
      supabaseAdmin.from("case_studies").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "live").then(r => r.count || 0),
    ]);

    // 2. Upsert usage table to match the reality
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .upsert({
        org_id: orgId,
        interviews_used: interviewCount,
        case_studies_used: caseStudyCount,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to sync usage: ${error.message}`);
    return data as Usage;
  },

  async sync(orgId: string): Promise<Usage> {
    return this.getOrCreate(orgId);
  },

  async syncAll(orgId: string): Promise<Usage> {
    return this.sync(orgId);
  },

  // Redundant but kept for backward compatibility (mapped to sync)
  async incrementInterviews(orgId: string): Promise<Usage> {
    return this.sync(orgId);
  },

  async incrementCaseStudies(orgId: string): Promise<Usage> {
    return this.sync(orgId);
  },

  async reset(orgId: string): Promise<Usage> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ interviews_used: 0, case_studies_used: 0 })
      .eq("org_id", orgId)
      .select()
      .single();
    if (error) throw new Error(`Failed to reset usage: ${error.message}`);
    return data as Usage;
  },
};
