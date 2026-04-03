// ═══════════════════════════════════════════════════════════
// Auricai — Domain Service (Enterprise Only)
// Custom domain management via Vercel Domains API.
// ═══════════════════════════════════════════════════════════

import { DomainRepository } from "@/lib/repositories/domain.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { canAddDomain } from "@/lib/plans";
import { EventService } from "@/lib/services/event.service";
import { PlanLimitError, NotFoundError, ConflictError } from "@/lib/errors";
import type { Domain, ServiceResult } from "@/types";

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export const DomainService = {
  async add(orgId: string, domain: string): Promise<ServiceResult<Domain>> {
    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");
    const limitCheck = canAddDomain(org);
    if (!limitCheck.allowed) throw new PlanLimitError(limitCheck.reason!);
    const existing = await DomainRepository.findByOrg(orgId);
    if (existing) throw new ConflictError("Organization already has a custom domain.");
    const taken = await DomainRepository.findByDomain(domain);
    if (taken) throw new ConflictError("This domain is already in use");
    const rec = await DomainRepository.create(orgId, domain);
    await EventService.domainAdded(orgId, domain);
    return { success: true, data: rec };
  },

  async verify(orgId: string): Promise<ServiceResult<Domain>> {
    const rec = await DomainRepository.findByOrg(orgId);
    if (!rec) throw new NotFoundError("Domain");
    if (rec.status === "verified" && rec.ssl_status === "active") return { success: true, data: rec };
    
    const dnsOk = await this.checkDNS(rec.domain);
    if (!dnsOk) {
      // Explicit fallback for failed connections
      if (rec.ssl_status !== "failed") {
        await DomainRepository.updateStatus(orgId, "pending", "failed");
      }
      return { success: false, error: `DNS not configured. Point CNAME for ${rec.domain} to cname.vercel-dns.com`, code: "DNS_NOT_READY" };
    }
    
    const attached = await this.attachToVercel(rec.domain);
    if (!attached) return { success: false, error: "Failed to attach domain to Vercel.", code: "VERCEL_ERROR" };
    
    const updated = await DomainRepository.updateStatus(orgId, "verified", "active");
    await OrganizationRepository.update(orgId, { domain: rec.domain });
    await EventService.domainVerified(orgId, rec.domain);
    return { success: true, data: updated };
  },

  async remove(orgId: string): Promise<ServiceResult<void>> {
    const rec = await DomainRepository.findByOrg(orgId);
    if (!rec) throw new NotFoundError("Domain");
    if (rec.status === "verified") await this.removeFromVercel(rec.domain);
    await DomainRepository.delete(orgId);
    await OrganizationRepository.update(orgId, { domain: null });
    return { success: true };
  },

  async getDomain(orgId: string): Promise<Domain | null> {
    return DomainRepository.findByOrg(orgId);
  },

  async checkDNS(domain: string): Promise<boolean> {
    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) return false;
    try {
      const tp = VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : "";
      const res = await fetch(`https://api.vercel.com/v6/domains/${domain}/config?projectId=${VERCEL_PROJECT_ID}${tp}`, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
      const data = await res.json();
      return data.misconfigured === false;
    } catch { return false; }
  },

  async attachToVercel(domain: string): Promise<boolean> {
    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) return false;
    try {
      const tp = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
      const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${tp}`, { method: "POST", headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: domain }) });
      return res.ok;
    } catch { return false; }
  },

  async removeFromVercel(domain: string): Promise<void> {
    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) return;
    try {
      const tp = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
      await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}${tp}`, { method: "DELETE", headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
    } catch { /* silent */ }
  },

  async checkVerification(orgId: string, domain: string): Promise<ServiceResult<Domain>> {
    return this.verify(orgId);
  },
};
