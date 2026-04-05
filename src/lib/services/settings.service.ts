// ═══════════════════════════════════════════════════════════
// CaseFlow — Settings Service
// Org config, branding, billing display, usage display.
// ═══════════════════════════════════════════════════════════

import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { UsageRepository } from "@/lib/repositories/usage.repository";
import { TeamRepository } from "@/lib/repositories/team.repository";
import { DomainRepository } from "@/lib/repositories/domain.repository";
import { OrgProfileRepository } from "@/lib/repositories/org-profile.repository";
import { EventService } from "@/lib/services/event.service";
import { getPlanLimits } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NotFoundError } from "@/lib/errors";
import type { Organization, ServiceResult } from "@/types";

export const SettingsService = {
  async getOrgSettings(orgId: string) {
    const [org, usage, team, domain, orgProfile] = await Promise.all([
      OrganizationRepository.findById(orgId),
      UsageRepository.getOrCreate(orgId),
      TeamRepository.findByOrg(orgId),
      DomainRepository.findByOrg(orgId),
      OrgProfileRepository.findByOrgId(orgId),
    ]);
    if (!org) throw new NotFoundError("Organization");
    const limits = getPlanLimits(org.plan_type as "free" | "starter" | "growth" | "enterprise");
    
    return { org, usage, team, domain, orgProfile, limits };
  },

  async updateOrg(orgId: string, updates: { name?: string; brand_color?: string }): Promise<ServiceResult<Organization>> {
    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");
    const updated = await OrganizationRepository.update(orgId, updates);
    await EventService.track({ orgId, type: "settings_updated" as any, metadata: updates });
    return { success: true, data: updated };
  },

  async uploadBranding(orgId: string, file: File): Promise<ServiceResult<{ url: string }>> {
    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");
    const ext = file.name.split(".").pop() || "png";
    const path = `branding/${orgId}/logo.${ext}`;
    const { error } = await supabaseAdmin.storage.from("assets").upload(path, file, { upsert: true });
    if (error) return { success: false, error: `Upload failed: ${error.message}` };
    const { data: urlData } = supabaseAdmin.storage.from("assets").getPublicUrl(path);
    await OrganizationRepository.update(orgId, { logo_url: urlData.publicUrl });
    await EventService.track({ orgId, type: "branding_updated" as any, metadata: { path } });
    return { success: true, data: { url: urlData.publicUrl } };
  },
};
