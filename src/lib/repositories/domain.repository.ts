// ═══════════════════════════════════════════════════════════
// CaseFlow — Domain Repository
// Enterprise-only custom domain management.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Domain, DomainStatus, SSLStatus } from "@/types";

const TABLE = "domains";

export const DomainRepository = {
  async findByOrg(orgId: string): Promise<Domain | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .single();
    if (error || !data) return null;
    return data as Domain;
  },

  async findByDomain(domain: string): Promise<Domain | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("domain", domain)
      .single();
    if (error || !data) return null;
    return data as Domain;
  },

  async create(orgId: string, domain: string): Promise<Domain> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        org_id: orgId,
        domain,
        status: "pending",
        ssl_status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create domain: ${error.message}`);
    return data as Domain;
  },

  async updateStatus(
    orgId: string,
    status: DomainStatus,
    sslStatus?: SSLStatus
  ): Promise<Domain> {
    const updates: Record<string, unknown> = { status };
    if (sslStatus) updates.ssl_status = sslStatus;

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(updates)
      .eq("org_id", orgId)
      .select()
      .single();
    if (error) throw new Error(`Failed to update domain: ${error.message}`);
    return data as Domain;
  },

  async delete(orgId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to delete domain: ${error.message}`);
  },
};
