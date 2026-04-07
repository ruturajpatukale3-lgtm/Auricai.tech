// ═══════════════════════════════════════════════════════════
// CaseFlow — Team Member Repository
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { TeamMember, TeamRole } from "@/types";

const TABLE = "team_members";

export const TeamRepository = {
  async findByOrg(orgId: string): Promise<TeamMember[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .order("invited_at", { ascending: true });
    if (error) throw new Error(`Failed to fetch team: ${error.message}`);
    return (data || []) as TeamMember[];
  },

  async findByUserId(userId: string): Promise<TeamMember | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0] as TeamMember;
  },

  async findByEmail(orgId: string, email: string): Promise<TeamMember | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .eq("email", email)
      .single();
    if (error || !data) return null;
    return data as TeamMember;
  },

  async findById(orgId: string, id: string): Promise<TeamMember | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();
    if (error || !data) return null;
    return data as TeamMember;
  },

  async create(
    orgId: string,
    input: {
      email: string;
      role: TeamRole;
      user_id?: string;
      status?: "invited" | "active";
    }
  ): Promise<TeamMember> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        org_id: orgId,
        email: input.email,
        role: input.role,
        user_id: input.user_id || null,
        status: input.status || "invited",
        joined_at: input.status === "active" ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create team member: ${error.message}`);
    return data as TeamMember;
  },

  async activate(
    orgId: string,
    memberId: string,
    userId: string
  ): Promise<TeamMember> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({
        user_id: userId,
        status: "active",
        joined_at: new Date().toISOString(),
      })
      .eq("id", memberId)
      .eq("org_id", orgId)
      .select()
      .single();
    if (error) throw new Error(`Failed to activate member: ${error.message}`);
    return data as TeamMember;
  },

  async deactivate(orgId: string, memberId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .update({ disabled_at: new Date().toISOString() })
      .eq("id", memberId)
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to deactivate member: ${error.message}`);
  },

  async reactivate(orgId: string, memberId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .update({ disabled_at: null })
      .eq("id", memberId)
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to reactivate member: ${error.message}`);
  },

  async remove(orgId: string, memberId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("id", memberId)
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to remove member: ${error.message}`);
  },

  async countActive(orgId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .is("disabled_at", null)
      .in("status", ["active", "invited"]);
    if (error) throw new Error(`Failed to count members: ${error.message}`);
    return count || 0;
  },
};
