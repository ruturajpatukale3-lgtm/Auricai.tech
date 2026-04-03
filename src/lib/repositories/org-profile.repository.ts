// ═══════════════════════════════════════════════════════════
// Auricai — Org Profile Repository
// CRUD for org_profile table. All normalization happens here
// so every caller gets clean, AI-ready data.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { OrgProfile } from "@/types";

const TABLE = "org_profile";

// ─── Normalization Helpers ─────────────────────────────────

/** Trim, collapse multiple spaces, strip leading/trailing whitespace */
function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Normalize industry_raw: lowercase, strip emojis and special chars */
function normalizeIndustryRaw(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    // Strip emojis (unicode ranges for emoji)
    .replace(/[\u{1F600}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    // Strip remaining special chars (keep alphanumeric, spaces, hyphens, ampersands)
    .replace(/[^a-z0-9\s\-&]/g, "")
    .trim();
}

// ─── Repository ────────────────────────────────────────────

export const OrgProfileRepository = {
  async findByOrgId(orgId: string): Promise<OrgProfile | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("org_id", orgId)
      .single();
    if (error || !data) return null;
    return data as OrgProfile;
  },

  async create(
    orgId: string,
    input: {
      industry: string;
      industry_raw?: string | null;
      service_category: string;
      service_type: string;
      target_customer: string;
    }
  ): Promise<OrgProfile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        org_id: orgId,
        industry: normalizeText(input.industry),
        industry_raw: input.industry_raw
          ? normalizeIndustryRaw(input.industry_raw)
          : null,
        service_category: normalizeText(input.service_category),
        service_type: normalizeText(input.service_type),
        target_customer: normalizeText(input.target_customer),
      })
      .select()
      .single();
    if (error)
      throw new Error(`Failed to create org profile: ${error.message}`);
    return data as OrgProfile;
  },

  async upsert(
    orgId: string,
    input: {
      industry: string;
      industry_raw?: string | null;
      service_category: string;
      service_type: string;
      target_customer: string;
    }
  ): Promise<OrgProfile> {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .upsert(
        {
          org_id: orgId,
          industry: normalizeText(input.industry),
          industry_raw: input.industry_raw
            ? normalizeIndustryRaw(input.industry_raw)
            : null,
          service_category: normalizeText(input.service_category),
          service_type: normalizeText(input.service_type),
          target_customer: normalizeText(input.target_customer),
        },
        { onConflict: "org_id" }
      )
      .select()
      .single();
    if (error)
      throw new Error(`Failed to upsert org profile: ${error.message}`);
    return data as OrgProfile;
  },

  async update(
    orgId: string,
    updates: Partial<
      Pick<
        OrgProfile,
        | "industry"
        | "industry_raw"
        | "service_category"
        | "service_type"
        | "target_customer"
      >
    >
  ): Promise<OrgProfile> {
    // Normalize any string fields that are being updated
    const normalized: Record<string, unknown> = {};
    if (updates.industry !== undefined)
      normalized.industry = normalizeText(updates.industry);
    if (updates.industry_raw !== undefined)
      normalized.industry_raw = updates.industry_raw
        ? normalizeIndustryRaw(updates.industry_raw)
        : null;
    if (updates.service_category !== undefined)
      normalized.service_category = normalizeText(updates.service_category);
    if (updates.service_type !== undefined)
      normalized.service_type = normalizeText(updates.service_type);
    if (updates.target_customer !== undefined)
      normalized.target_customer = normalizeText(updates.target_customer);
    if (updates.target_customer !== undefined)
      normalized.target_customer = normalizeText(updates.target_customer);

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(normalized)
      .eq("org_id", orgId)
      .select()
      .single();
    if (error)
      throw new Error(`Failed to update org profile: ${error.message}`);
    return data as OrgProfile;
  },
};
