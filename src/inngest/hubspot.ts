// ═══════════════════════════════════════════════════════════
// Auricai — HubSpot Inngest Functions
// Periodically synchronizes deals for all connected CRM accounts.
// ═══════════════════════════════════════════════════════════

import { inngest } from "./client";
import { HubSpotRepository } from "@/lib/repositories/hubspot.repository";
import { HubSpotService } from "@/lib/services/hubspot.service";

/**
 * Daily HubSpot Sync
 * Runs every night at midnight to update deal statuses and amounts.
 * 
 * Cron: 0 0 * * *
 */
export const scheduleDailyHubSpotSync = inngest.createFunction(
  { id: "schedule-daily-hubspot-sync", triggers: [{ cron: "0 0 * * *" }] },
  async ({ step }: { step: any }) => {
    // 1. Get all connected organizations
    const orgIds = await step.run("get-connected-orgs", async () => {
      return await HubSpotRepository.getAllConnectedOrgIds();
    });

    if (orgIds.length === 0) {
      return { message: "No connected HubSpot organizations found." };
    }

    // 2. Trigger sync for each org
    const results = await step.run("sync-all-orgs", async () => {
      const syncResults = [];
      for (const orgId of orgIds) {
        try {
          const res = await HubSpotService.syncDeals(orgId);
          syncResults.push({ orgId, success: res.success, count: res.data?.count || 0 });
        } catch (e: any) {
          syncResults.push({ orgId, success: false, error: e.message });
        }
      }
      return syncResults;
    });

    return { 
      message: `Completed daily HubSpot sync for ${orgIds.length} organizations.`,
      results 
    };
  }
);
