// ═══════════════════════════════════════════════════════════
// CaseFlow — Case Study Repository
// Every query filters by org_id.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { CaseStudy, CaseStudyStatus } from "@/types";
import { SystemMemoryRepository } from "./system-memory.repository";

const TABLE = "case_studies";

export const CaseStudyRepository = {
  async findByOrg(
    orgId: string,
    filters?: { status?: CaseStudyStatus; limit?: number; offset?: number }
  ): Promise<CaseStudy[]> {
    let query = supabaseAdmin
      .from(TABLE)
      .select("id, company_name, headline, metric_type, delta_percent, status, slug, created_at, views, clicks, total_read_time, before_value, after_value, timeframe, summary, story, quote, client_name, metrics")
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
      slug?: string;
      summary?: string;
      story?: string;
      quote?: string;
      client_name?: string;
      metrics?: string[] | null;
      status?: CaseStudyStatus;
    }
  ): Promise<CaseStudy> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        org_id: orgId,
        ...input,
        status: input.status || "draft",
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
        | "summary"
        | "metric_type"
        | "before_value"
        | "after_value"
        | "delta_percent"
        | "timeframe"
        | "status"
        | "slug"
        | "story"
        | "quote"
        | "client_name"
        | "metrics"
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

    // REAL-WORLD OPTIMIZATION
    // When a case study gets views, log engagement for its hook and constituent questions.
    try {
      const { data: ctData } = await supabaseAdmin.from(TABLE).select("headline, interview_id").eq("id", id).single();
      if (ctData) {
        if (ctData.headline) {
          await SystemMemoryRepository.recordOutcome(ctData.headline, "hook", 0.2); // Views are 0.2
        }

        if (ctData.interview_id) {
          // Log engagement to all questions generated in this specific interview
          const { data: answers } = await supabaseAdmin.from("interview_answers").select("question").eq("interview_id", ctData.interview_id);
          if (answers) {
            for (const a of answers) {
              if (a.question) await SystemMemoryRepository.recordOutcome(a.question, "question", 0.2); // Views are 0.2
            }
          }
        }
      }
    } catch (e) {
      console.log("[incrementViews] Suppressed telemetry err:", e);
    }
  },

  async incrementClicks(id: string): Promise<void> {
    try {
      // 1. Permanent Persistence (Atomic)
      await supabaseAdmin.rpc("increment_clicks", { case_study_id: id });

      // 2. Telemetry (AI Logic)
      const { data: ctData } = await supabaseAdmin.from(TABLE).select("headline, interview_id").eq("id", id).single();
      if (ctData) {
        if (ctData.headline) await SystemMemoryRepository.recordOutcome(ctData.headline, "hook", 0.6); // Clicks are 0.6
        if (ctData.interview_id) {
          const { data: answers } = await supabaseAdmin.from("interview_answers").select("question").eq("interview_id", ctData.interview_id);
          if (answers) {
            for (const a of answers) {
              if (a.question) await SystemMemoryRepository.recordOutcome(a.question, "question", 0.6);
            }
          }
        }
      }
    } catch (e) {
      console.log("[incrementClicks] Suppressed telemetry err:", e);
    }
  },

  /**
   * Translates active seconds into an engagement signal.
   * e.g., We give +0.2 every time this ping triggers (perhaps pinged every 10-20 seconds on client side).
   */
  async incrementReadTime(id: string, durationPingValue: number = 0.2): Promise<void> {
    try {
      // 1. Permanent Persistence (Atomic)
      // durationPingValue is passed from the beacon (e.g. 15.0s per heartbeat)
      await supabaseAdmin.rpc("increment_read_time", { case_study_id: id, ping_value: durationPingValue });

      // 2. Telemetry (AI Logic)
      const { data: ctData } = await supabaseAdmin.from(TABLE).select("headline, interview_id").eq("id", id).single();
      if (ctData) {
        if (ctData.headline) await SystemMemoryRepository.recordOutcome(ctData.headline, "hook", durationPingValue);
        if (ctData.interview_id) {
          const { data: answers } = await supabaseAdmin.from("interview_answers").select("question").eq("interview_id", ctData.interview_id);
          if (answers) {
            for (const a of answers) {
              if (a.question) await SystemMemoryRepository.recordOutcome(a.question, "question", durationPingValue);
            }
          }
        }
      }
    } catch (e) {
      console.log("[incrementReadTime] Suppressed telemetry err:", e);
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

  async getAggregateMetrics(orgId: string): Promise<{ views: number; clicks: number; totalReadTime: number }> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("views, clicks, total_read_time")
      .eq("org_id", orgId);

    if (error) {
      console.warn("[CaseStudyRepository] Error fetching aggregate metrics:", error);
      return { views: 0, clicks: 0, totalReadTime: 0 };
    }

    return (data || []).reduce(
      (acc, curr) => ({
        views: acc.views + (curr.views || 0),
        clicks: acc.clicks + (curr.clicks || 0),
        totalReadTime: acc.totalReadTime + (curr.total_read_time || 0),
      }),
      { views: 0, clicks: 0, totalReadTime: 0 }
    );
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
