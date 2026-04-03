// ═══════════════════════════════════════════════════════════
// Auricai — HubSpot Service
// Handles OAuth flow and data ingestion pipeline for HubSpot deals.
// ═══════════════════════════════════════════════════════════

import { HubSpotRepository } from "@/lib/repositories/hubspot.repository";
import { ServiceResult } from "@/types";

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || "";
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || "";
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI || "http://localhost:3000/api/integrations/hubspot/callback";
const HUBSPOT_AUTH_BASE = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_API_BASE = "https://api.hubapi.com";

export const HubSpotService = {
  getAuthUrl(): string {
    const scopes = [
      "crm.objects.deals.read",
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.notes.read",
      "crm.objects.notes.write"
    ];
    return `${HUBSPOT_AUTH_BASE}?client_id=${HUBSPOT_CLIENT_ID}&redirect_uri=${encodeURIComponent(HUBSPOT_REDIRECT_URI)}&scope=${encodeURIComponent(scopes.join(" "))}`;
  },

  async handleOAuthCallback(orgId: string, code: string): Promise<ServiceResult<void>> {
    try {
      const form = new URLSearchParams();
      form.append("grant_type", "authorization_code");
      form.append("client_id", HUBSPOT_CLIENT_ID);
      form.append("client_secret", HUBSPOT_CLIENT_SECRET);
      form.append("redirect_uri", HUBSPOT_REDIRECT_URI);
      form.append("code", code);

      const response = await fetch(`${HUBSPOT_API_BASE}/oauth/v1/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      if (!response.ok) {
        const errData = await response.text();
        console.error("[HubSpot OAuth] Failed to exchange code", response.status, errData);
        return { success: false, error: "Failed to exchange HubSpot code." };
      }

      const data = await response.json();
      
      // Fetch Portal ID (HubID)
      let portalId = null;
      try {
        const meRes = await fetch(`${HUBSPOT_API_BASE}/integrations/v1/me`, {
          headers: { "Authorization": `Bearer ${data.access_token}` }
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          portalId = String(meData.portalId);
        }
      } catch (err) {
        console.error("[HubSpot OAuth] Failed to fetch portalId", err);
      }

      await HubSpotRepository.upsertConnection(orgId, {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        portal_id: portalId || undefined
      });

      return { success: true };
    } catch (e: any) {
      console.error("[HubSpot OAuth] error:", e.message);
      return { success: false, error: "Internal error during OAuth flow." };
    }
  },

  async refreshToken(refresh_token: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
    try {
      const form = new URLSearchParams();
      form.append("grant_type", "refresh_token");
      form.append("client_id", HUBSPOT_CLIENT_ID);
      form.append("client_secret", HUBSPOT_CLIENT_SECRET);
      form.append("redirect_uri", HUBSPOT_REDIRECT_URI);
      form.append("refresh_token", refresh_token);

      const response = await fetch(`${HUBSPOT_API_BASE}/oauth/v1/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },

  async syncDeals(orgId: string): Promise<ServiceResult<{ count: number }>> {
    let connection = await HubSpotRepository.getConnection(orgId);
    if (!connection) {
      return { success: false, error: "HubSpot is not connected." };
    }

    // Proactively check expiration (simplified: assuming we refresh if < 5 mins left)
    const expiresAt = new Date(connection.expires_at).getTime();
    if (Date.now() > expiresAt - 300000) {
      const newTokens = await this.refreshToken(connection.refresh_token);
      if (!newTokens) {
        return { success: false, error: "HubSpot token expired. Please reconnect." };
      }
      connection = await HubSpotRepository.upsertConnection(orgId, newTokens);
    }

    try {
      // Fetch deals from HubSpot
      // We'll request essential properties: dealname, amount, dealstage, and associated contacts
      const payload = {
        limit: 100, // For V1, capping at 100 recent deals
        properties: ["dealname", "amount", "dealstage"],
        associations: ["contacts"]
      };

      const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/deals/search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${connection.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("[HubSpot Sync] Failed to fetch deals", txt);
        return { success: false, error: "Failed to fetch deals from HubSpot." };
      }

      const data = await res.json();
      const results = data.results || [];
      
      const mappedDeals = [];

      for (const deal of results) {
        let contactEmail = null;
        
        // If there's an associated contact, fetch its email
        // Note: In a production setting with many deals, we might batch fetch associations.
        const associations = deal.associations?.contacts?.results;
        if (associations && associations.length > 0) {
          const contactId = associations[0].id;
          const contactRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}?properties=email`, {
            headers: { "Authorization": `Bearer ${connection.access_token}` }
          });
          if (contactRes.ok) {
            const contactData = await contactRes.json();
            contactEmail = contactData.properties?.email || null;
          }
        }

        mappedDeals.push({
          external_id: deal.id,
          name: deal.properties?.dealname || "Unnamed Deal",
          amount: parseFloat(deal.properties?.amount || "0"),
          stage: deal.properties?.dealstage || "unknown",
          contact_email: contactEmail
        });
      }

      await HubSpotRepository.upsertDeals(orgId, mappedDeals);
      return { success: true, data: { count: mappedDeals.length } };
    } catch (e: any) {
      console.error("[HubSpot Sync] Error:", e);
      return { success: false, error: "An error occurred while syncing deals." };
    }
  },

  async pushCaseStudyToHubSpot(
    orgId: string,
    caseStudyId: string,
    prospectEmail: string,
    retryCount = 0
  ): Promise<ServiceResult<{ noteId: string; portalId: string | null; contactId: string }>> {
    const cleanEmail = prospectEmail.toLowerCase().trim();
    
    // 0. Check history first
    const existing = await HubSpotRepository.getPushHistory(orgId, caseStudyId, cleanEmail);
    if (existing) {
      return { success: false, error: "Already pushed to this contact." };
    }

    let connection = await HubSpotRepository.getConnection(orgId);
    if (!connection) return { success: false, error: "HubSpot not connected." };

    // Refresh token if needed
    const expiresAt = new Date(connection.expires_at).getTime();
    if (Date.now() > expiresAt - 300000) {
      const newTokens = await this.refreshToken(connection.refresh_token);
      if (!newTokens) return { success: false, error: "HubSpot connection expired." };
      connection = await HubSpotRepository.upsertConnection(orgId, newTokens);
    }

    try {
      const { CaseStudyRepository } = await import("@/lib/repositories/case-study.repository");
      const caseStudy = await CaseStudyRepository.findById(orgId, caseStudyId);
      if (!caseStudy) return { success: false, error: "Case study not found." };
      
      // Strict Validation: Organization
      if (caseStudy.org_id && caseStudy.org_id !== orgId) {
        return { success: false, error: "Unauthorized access to case study." };
      }

      // Strict Validation: Status
      if (caseStudy.status !== "live") {
        return { success: false, error: "Must publish before pushing." };
      }
      
      // Prepare ROI metric
      const roiMetric = caseStudy.delta_percent ? `+${caseStudy.delta_percent}% ${caseStudy.metric_type}` : caseStudy.metric_type;

      // Strict Validation: Fallbacks Eliminated
      if (!roiMetric || !caseStudy.headline || !caseStudy.slug || !caseStudy.company_name) {
        return { success: false, error: "Missing required data." };
      }

      // Proactive Token Scope Validation
      const tokenInfoRes = await fetch(`${HUBSPOT_API_BASE}/oauth/v1/access-tokens/${connection.access_token}`);
      if (tokenInfoRes.ok) {
        const tokenInfo = await tokenInfoRes.json();
        const scopes = tokenInfo.scopes || [];
        if (!scopes.includes("crm.objects.contacts.read") || !scopes.includes("crm.objects.notes.write")) {
          return { success: false, error: "HubSpot permissions missing." };
        }
      }

      // 1. Search for contact
      const searchRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${connection.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: "email",
              operator: "EQ",
              value: cleanEmail
            }]
          }]
        })
      });

      if (!searchRes.ok) throw new Error("Failed to search contact");
      const searchData = await searchRes.json();
      if (!searchData.results || searchData.results.length === 0) {
        return { success: false, error: "Contact not found in HubSpot." };
      }
      const contactId = searchData.results[0].id;

      // 2. Format Note
      const origin = process.env.NEXT_PUBLIC_APP_URL || "https://auricai.com";
      const caseStudyUrl = `${origin}/c/${caseStudy.slug}`;
      
      const noteHtml = `
        <h3>🏆 NEW PROOF ASSET GENERATED</h3>
        <p><strong>Relevant Case Study:</strong> ${caseStudy.company_name}</p>
        <p><strong>Key ROI:</strong> ${roiMetric}</p>
        <p><strong>Summary:</strong> ${caseStudy.headline}</p>
        <p><strong>Live Link:</strong> 
        <a href="${caseStudyUrl}" target="_blank">
        View Case Study
        </a></p>
      `;

      // 3. Create Note
      const noteRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/notes`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${connection.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          properties: {
            hs_note_body: noteHtml,
            hs_timestamp: new Date().toISOString()
          }
        })
      });

      if (!noteRes.ok) {
        const err = await noteRes.text();
        console.error("[HubSpot Note] Create failed", err);
        throw new Error("Failed to create note");
      }
      const noteData = await noteRes.json();
      const noteId = noteData.id;

      // 4. Associate Note -> Contact
      const assocRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/notes/${noteId}/associations/contacts/${contactId}/note_to_contact`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${connection.access_token}`,
          "Content-Type": "application/json"
        }
      });

      if (!assocRes.ok) throw new Error("Failed to associate note with contact");

      // 5. Success Tracking
      await HubSpotRepository.recordPush(orgId, caseStudyId, cleanEmail, noteId);

      return { success: true, data: { noteId, portalId: connection.portal_id, contactId } };
    } catch (e: any) {
      console.error("[HubSpot Push] Error:", e.message);
      
      // Error handling with retry logic for 429
      if (e.message.includes("429") || e.message.includes("rate") || e.message.includes("Limit")) {
        if (retryCount === 0) {
          await new Promise(r => setTimeout(r, 2000));
          return this.pushCaseStudyToHubSpot(orgId, caseStudyId, cleanEmail, retryCount + 1);
        } else {
          return { success: false, error: "Rate limit reached, try again later" };
        }
      }

      if (e.message.includes("401")) return { success: false, error: "Reconnect HubSpot" };
      return { success: false, error: e.message || "Failed to push to HubSpot." };
    }
  },

  async autoMatchAndLink(orgId: string, email: string, caseStudyId: string): Promise<ServiceResult<void>> {
    try {
      // 1. Trigger fresh sync to ensure we have the latest deals
      await this.syncDeals(orgId);

      // 2. Lookup matching deal in local cache
      const deal = await HubSpotRepository.findDealByEmail(orgId, email);
      if (!deal) {
        console.log(`[HubSpot Automation] No matching deal found for ${email} in org ${orgId}`);
        return { success: true }; // Not an error, just no match
      }

      // 3. Auto-link via DealService
      const { DealService } = await import("@/lib/services/deal.service");
      const result = await DealService.attributeExternal(orgId, deal.external_id, caseStudyId);
      
      if (result.success) {
        console.log(`[HubSpot Automation] Successfully auto-linked deal ${deal.name} ($${deal.amount}) to case study ${caseStudyId}`);
      }
      
      return { success: true };
    } catch (e: any) {
      console.error(`[HubSpot Automation] Error during auto-match:`, e.message);
      return { success: false, error: "Failed to auto-match HubSpot deal" };
    }
  }
};
