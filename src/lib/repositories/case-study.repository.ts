// ═══════════════════════════════════════════════════════════
// CaseFlow — Case Study Repository
// Every query filters by org_id.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { CaseStudy, CaseStudyStatus } from "@/types";

const TABLE = "case_studies";

export const CaseStudyRepository = {
  async findByOrg(
    orgId: string,
    filters?: { status?: CaseStudyStatus; limit?: number; offset?: number }
  ): Promise<CaseStudy[]> {
    let query = supabaseAdmin
      .from(TABLE)
      .select("id, company_name, headline, metric_type, delta_percent, pipeline_value, deals_influenced, status, slug, created_at, views")
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
    if (error) throw new Error(`Failed to fetch case studies: ${error.message}`);
    return (data || []) as CaseStudy[];
  },

  async findById(orgId: string, id: string): Promise<CaseStudy | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();
    if (error || !data) return null;
    return data as CaseStudy;
  },

  async findByInterviewId(interviewId: string): Promise<CaseStudy | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("interview_id", interviewId)
      .single();
    if (error || !data) return null;
    return data as CaseStudy;
  },

  async findPublicById(id: string): Promise<CaseStudy | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("status", "live")
      .single();
    if (error || !data) return null;
    return data as CaseStudy;
  },

  async findPublicBySlug(slug: string): Promise<CaseStudy | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("slug", slug)
      .eq("status", "live")
      .single();
    if (error || !data) return null;
    return data as CaseStudy;
  },

  async create(
    orgId: string,
    input: {
      company_name: string;
      interview_id?: string;
      headline?: string;
      metric_type?: string;
      before_value?: string;
      after_value?: string;
      delta_percent?: number;
      timeframe?: string;
      pipeline_value?: number;
      deals_influenced?: number;
      slug?: string;
    }
  ): Promise<CaseStudy> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        org_id: orgId,
        ...input,
        status: "draft",
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create case study: ${error.message}`);
    return data as CaseStudy;
  },

  async update(
    orgId: string,
    id: string,
    updates: Partial<
      Pick<
        CaseStudy,
        | "company_name"
        | "headline"
        | "metric_type"
        | "before_value"
        | "after_value"
        | "delta_percent"
        | "timeframe"
        | "pipeline_value"
        | "deals_influenced"
        | "status"
        | "slug"
      >
    >
  ): Promise<CaseStudy> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();
    if (error) throw new Error(`Failed to update case study: ${error.message}`);
    return data as CaseStudy;
  },

  async incrementViews(id: string): Promise<void> {
    const { error } = await supabaseAdmin.rpc("increment_views", {
      case_study_id: id,
    });
    // Fallback if RPC doesn't exist: direct update
    if (error) {
      const { data } = await supabaseAdmin
        .from(TABLE)
        .select("views")
        .eq("id", id)
        .single();
      if (data) {
        await supabaseAdmin
          .from(TABLE)
          .update({ views: (data.views || 0) + 1 })
          .eq("id", id);
      }
    }
  },

  async delete(orgId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to delete case study: ${error.message}`);
  },

  async deleteAllByOrg(orgId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to delete all case studies: ${error.message}`);
  },

  // ─── Aggregations ────────────────────────────────────────

  async sumPipeline(orgId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("pipeline_value")
      .eq("org_id", orgId)
      .eq("status", "live");
    if (error) throw new Error(`Failed to sum pipeline: ${error.message}`);
    return (data || []).reduce((sum, row) => sum + (Number(row.pipeline_value) || 0), 0);
  },

  async avgDeltaPercent(orgId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("delta_percent")
      .eq("org_id", orgId)
      .eq("status", "live")
      .not("delta_percent", "is", null);
    if (error) throw new Error(`Failed to avg delta: ${error.message}`);
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, row) => acc + (Number(row.delta_percent) || 0), 0);
    return Math.round(sum / data.length);
  },

  async sumDealsInfluenced(orgId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("deals_influenced")
      .eq("org_id", orgId)
      .eq("status", "live");
    if (error) throw new Error(`Failed to sum deals: ${error.message}`);
    return (data || []).reduce((sum, row) => sum + (Number(row.deals_influenced) || 0), 0);
  },

  async recordDeal(
    orgId: string,
    id: string,
    dealValue: number = 0
  ): Promise<CaseStudy> {
    const { data: current } = await supabaseAdmin
      .from(TABLE)
      .select("deals_influenced, pipeline_value")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (!current) throw new Error("Case study not found");

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({
        deals_influenced: (current.deals_influenced || 0) + 1,
        pipeline_value: (current.pipeline_value || 0) + dealValue,
      })
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) throw new Error(`Failed to record deal: ${error.message}`);
    return data as CaseStudy;
  },

  async recordMultiDeal(
    orgId: string,
    ids: string[],
    dealValue: number = 0
  ): Promise<void> {
    if (ids.length === 0) return;

    // Use a single batch update with increment if possible, or individual updates
    const updates = ids.map(async (id) => {
      const { data: current } = await supabaseAdmin
        .from(TABLE)
        .select("deals_influenced, pipeline_value")
        .eq("id", id)
        .eq("org_id", orgId)
        .single();
      
      if (!current) return;

      await supabaseAdmin
        .from(TABLE)
        .update({
          deals_influenced: (current.deals_influenced || 0) + 1,
          pipeline_value: (current.pipeline_value || 0) + dealValue,
        })
        .eq("id", id)
        .eq("org_id", orgId);
    });

    await Promise.all(updates);
  },

  async getTopPerformingByROI(orgId: string, limit: number = 5): Promise<CaseStudy[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "live")
      .order("delta_percent", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to fetch top ROI performers: ${error.message}`);
    return (data || []) as CaseStudy[];
  },

  async getTopPerformingByPipeline(orgId: string, limit: number = 5): Promise<CaseStudy[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "live")
      .order("pipeline_value", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to fetch top pipeline performers: ${error.message}`);
    return (data || []) as CaseStudy[];
  },

  async getTopPerformingByEngagement(orgId: string, limit: number = 5): Promise<CaseStudy[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "live")
      .order("views", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to fetch top engagement performers: ${error.message}`);
    return (data || []) as CaseStudy[];
  },

  async countByStatus(orgId: string, status: CaseStudyStatus): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", status);
    if (error) throw new Error(`Failed to count case studies: ${error.message}`);
    return count || 0;
  },
};
