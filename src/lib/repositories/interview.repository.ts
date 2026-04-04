// ═══════════════════════════════════════════════════════════
// CaseFlow — Interview Repository
// Every query filters by org_id.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import { PlanLimitError, FairUsageLimitError, SystemOverloadError } from "@/lib/errors";
import type { Interview, InterviewStatus } from "@/types";

const TABLE = "interviews";

export const InterviewRepository = {
  async findByOrg(
    orgId: string,
    filters?: { status?: InterviewStatus; limit?: number; offset?: number }
  ): Promise<{ data: Interview[]; count: number }> {
    let query = supabaseAdmin
      .from(TABLE)
      .select("id, client_email, client_name, status, token, created_at, started_at, completed_at, last_activity", { count: "exact" })
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

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to fetch interviews: ${error.message}`);
    return { data: (data || []) as Interview[], count: count || 0 };
  },

  async findById(orgId: string, id: string): Promise<Interview | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();
    if (error || !data) return null;
    return data as Interview;
  },

  async findByToken(token: string): Promise<Interview | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("token", token)
      .single();
    if (error || !data) return null;
    return data as Interview;
  },

  async create(
    orgId: string,
    input: {
      client_email: string;
      client_name?: string;
      token: string;
      idempotency_key?: string;
      userId?: string;
    }
  ): Promise<Interview> {
    const { data: result, error } = await supabaseAdmin.rpc("create_interview_safe", {
      p_org_id: orgId,
      p_client_email: input.client_email,
      p_client_name: input.client_name || null,
      p_token: input.token,
      p_idempotency_key: input.idempotency_key || null,
      p_user_id: input.userId || null,
    });

    if (error) {
      if (error.code === '57014' || error.message?.toLowerCase().includes('timeout') || error.code === 'PGRST301') {
        throw new SystemOverloadError("Database connection saturated. Please retry.", 30);
      }
      throw new Error(`Failed to create interview safe: ${error.message}`);
    }
    
    const res = result as any;
    if (!res.success) {
      if (res.error === "FAIR_USAGE_LIMIT") {
        throw new FairUsageLimitError(res.message);
      }
      throw new PlanLimitError(res.message || "Limit reached", {
        metric: res.metric || "interviews",
        limit: res.limit,
        used: res.used,
        upgrade_required: res.upgrade_required,
      });
    }

    return res.data as Interview;
  },

  async updateStatus(
    orgId: string,
    id: string,
    status: InterviewStatus,
    extra?: Partial<Interview>
  ): Promise<Interview> {
    const updates: Record<string, unknown> = { status, ...extra };
    if (status === "in_progress" && !extra?.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if (status === "completed" && !extra?.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
    updates.last_activity = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();
    if (error) throw new Error(`Failed to update interview: ${error.message}`);
    return data as Interview;
  },

  async updateByToken(
    token: string,
    updates: Partial<Interview>
  ): Promise<Interview> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ ...updates, last_activity: new Date().toISOString() })
      .eq("token", token)
      .select()
      .single();
    if (error) throw new Error(`Failed to update interview by token: ${error.message}`);
    return data as Interview;
  },

  async delete(orgId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to delete interview: ${error.message}`);
  },

  async deleteAllByOrg(orgId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to delete all interviews: ${error.message}`);
  },

  async countByOrg(orgId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to count interviews: ${error.message}`);
    return count || 0;
  },

  async countByStatus(orgId: string, status: InterviewStatus): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", status);
    if (error) throw new Error(`Failed to count interviews: ${error.message}`);
    return count || 0;
  },

  async countStalled(orgId: string, cutoff: Date): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["sent", "in_progress"])
      .lt("last_activity", cutoff.toISOString());

    if (error) throw new Error(`Failed to count stalled interviews: ${error.message}`);
    return count || 0;
  },

  async countWaitingApproval(orgId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["completed", "review_ready"]);
    if (error) throw new Error(`Failed to count waiting approval: ${error.message}`);
    return count || 0;
  },

  async findStalled(orgId: string, cutoff: Date): Promise<Interview[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .in("status", ["sent", "in_progress"])
      .lt("last_activity", cutoff.toISOString());

    if (error) throw new Error(`Failed to fetch stalled interviews: ${error.message}`);
    return (data || []) as Interview[];
  },

  async upsertProgress(interviewId: string, data: {
    completed_questions: number;
    total_questions: number;
    last_question_index: number;
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from("interview_progress")
      .upsert({
        interview_id: interviewId,
        ...data,
        updated_at: new Date().toISOString()
      }, { onConflict: "interview_id" });

    if (error) throw new Error(`Failed to update interview progress: ${error.message}`);
  },

  async getProgress(interviewId: string) {
    const { data, error } = await supabaseAdmin
      .from("interview_progress")
      .select("*")
      .eq("interview_id", interviewId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch interview progress: ${error.message}`);
    return data;
  },

  /**
   * Get all status counts in a single query (replaces 5 separate countByStatus calls)
   */
  async getFullStatusCounts(orgId: string): Promise<Record<InterviewStatus, number>> {
    const statuses: InterviewStatus[] = ["sent", "in_progress", "completed", "review_ready", "approved", "published"];
    const results: Record<string, number> = {};

    // Parallel count queries (batched, not 5 separate round-trips for complex aggregation)
    const counts = await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await supabaseAdmin
          .from(TABLE)
          .select("*", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("status", status);
        if (error) throw new Error(`Failed to count ${status}: ${error.message}`);
        return { status, count: count || 0 };
      })
    );

    for (const { status, count } of counts) {
      results[status] = count;
    }

    return results as Record<InterviewStatus, number>;
  },

  /**
   * Find potential duplicate interviews (same email + same org within time window)
   * DOES NOT block creation or auto-delete. Informational only.
   */
  async findPotentialDuplicates(
    orgId: string,
    windowDays: number = 7
  ): Promise<{ email: string; interview_id: string; count: number }[]> {
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    // Find emails that have more than 1 interview within the window
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("id, client_email, created_at")
      .eq("org_id", orgId)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to check duplicates: ${error.message}`);
    if (!data || data.length === 0) return [];

    // Group by email and flag duplicates
    const emailMap = new Map<string, { ids: string[]; count: number }>();
    for (const row of data) {
      const email = row.client_email.toLowerCase();
      const existing = emailMap.get(email) || { ids: [], count: 0 };
      existing.ids.push(row.id);
      existing.count++;
      emailMap.set(email, existing);
    }

    const duplicates: { email: string; interview_id: string; count: number }[] = [];
    for (const [email, { ids, count }] of emailMap) {
      if (count > 1) {
        // Flag the most recent one as the potential duplicate
        duplicates.push({ email, interview_id: ids[0], count });
      }
    }

    return duplicates;
  },

  /**
   * Get average completion time for completed interviews (in milliseconds)
   */
  async getAvgCompletionTime(orgId: string): Promise<number | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("started_at, completed_at")
      .eq("org_id", orgId)
      .eq("status", "completed")
      .not("started_at", "is", null)
      .not("completed_at", "is", null);

    if (error || !data || data.length === 0) return null;

    let totalMs = 0;
    let validCount = 0;
    for (const row of data) {
      if (row.started_at && row.completed_at) {
        const diff = new Date(row.completed_at).getTime() - new Date(row.started_at).getTime();
        if (diff > 0) {
          totalMs += diff;
          validCount++;
        }
      }
    }

    return validCount > 0 ? Math.round(totalMs / validCount) : null;
  },

  // ─── Email Reminder System ─────────────────────────────────

  /**
   * Find interviews eligible for email reminder (cron query).
   * Criteria: 
   * - status in (sent, in_progress)
   * - attempts < 3
   * - 24h passed since initial send (for 1st reminder) or last reminder.
   */
  async findPendingReminders(limit: number = 100): Promise<Interview[]> {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Complex query: 
    // attempts = 0 AND sent_at < 24h ago
    // OR attempts > 0 AND last_reminder_at < 24h ago
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .in("status", ["sent", "in_progress"])
      .lt("reminder_attempts", 3)
      .or(`and(reminder_attempts.eq.0,sent_at.lte.${cutoff24h}),and(reminder_attempts.gt.0,last_reminder_at.lte.${cutoff24h})`)
      .order("sent_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[InterviewRepo] findPendingReminders error:", error.message);
      return [];
    }
    return (data || []) as Interview[];
  },

  /**
   * Atomic idempotent claim: lock + mark reminder_sent via RPC.
   * Returns true if claimed, false if already sent or invalid state.
   */
  async claimEmailReminder(interviewId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin.rpc("claim_email_reminder", {
      p_id: interviewId,
    });
    if (error) {
      console.error("[InterviewRepo] claimEmailReminder RPC error:", error.message);
      return false;
    }
    return data as boolean;
  },

  /**
   * Revert a claimed reminder (e.g. if Resend email send fails).
   * Allows retry in the next cron run.
   */
  async revertEmailReminder(interviewId: string): Promise<void> {
    const { error } = await supabaseAdmin.rpc("revert_email_reminder", {
      p_id: interviewId,
    });
    if (error) {
      console.error("[InterviewRepo] revertEmailReminder RPC error:", error.message);
    }
  },

  /**
   * Check if an email was already sent to this address within a time window (duplicate guard).
   */
  async hasRecentInterview(orgId: string, email: string, windowHours: number = 24): Promise<boolean> {
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .ilike("client_email", email)
      .gte("created_at", cutoff);

    if (error) {
      console.error("[InterviewRepo] hasRecentInterview error:", error.message);
      return false;
    }
    return (count || 0) > 0;
  },
};

