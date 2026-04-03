import { inngest } from "./client";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";

/**
 * Weekly/Daily Subscription Sync Job
 * Protects against missed webhooks by polling Paddle API for active subs.
 */
export const syncSubscriptionsJob = inngest.createFunction(
  { id: "sync-paddle-subscriptions", triggers: [{ cron: "0 */6 * * *" }] },
  async ({ step }: { step: any }) => {
    // 1. Fetch stale orgs (never synced or > 6h ago)
    const orgs = await step.run("fetch-stale-subscriptions", async () => {
      const { data, error } = await supabaseAdmin
        .from("subscriptions")
        .select("org_id, subscription_id, plan_name, subscription_status, updated_at, last_synced_at")
        .not("subscription_id", "is", null)
        .or(`last_synced_at.is.null,last_synced_at.lt.${new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()}`)
        .limit(50); // BATCHING: Prevent OOM/API overload
      
      if (error) throw error;
      return data;
    });

    if (!orgs || orgs.length === 0) return { synced: 0 };

    // 2. Initialize Paddle
    const paddle = new Paddle(process.env.PADDLE_API_KEY || "", {
      environment: (process.env.PADDLE_ENVIRONMENT as Environment) || Environment.sandbox,
    });

    const results = await step.run("sync-each-org", async () => {
      const syncStatus = { updated: 0, skipped: 0, errors: 0 };
      const { EventService } = await import("@/lib/services/event.service");

      for (const org of orgs) {
        try {
          // Fetch from Paddle
          const paddleSub = await paddle.subscriptions.get(org.subscription_id!);
          if (!paddleSub) {
            syncStatus.errors++;
            continue;
          }

          // WEBHOOK PRIORITY: If our local DB was updated AFTER Paddle's last update, skip.
          // This prevents a stale sync from overwriting a very recent webhook update.
          const paddleUpdatedAt = paddleSub.updatedAt ? new Date(paddleSub.updatedAt).getTime() : 0;
          const localUpdatedAt = new Date(org.updated_at).getTime();

          if (localUpdatedAt > paddleUpdatedAt) {
            await supabaseAdmin.from("subscriptions").update({ last_synced_at: new Date().toISOString() }).eq("org_id", org.org_id);
            syncStatus.skipped++;
            continue;
          }

          const paddleStatus = paddleSub.status;
          
          if (org.subscription_status !== paddleStatus) {
            const diff = { old: org.subscription_status, new: paddleStatus };
            
            await OrganizationRepository.updateSubscription(org.org_id, {
              subscription_status: paddleStatus as any,
              payment_status: paddleStatus === "past_due" ? "past_due" : 
                             paddleStatus === "canceled" ? "cancelled" : "active",
              current_period_end: paddleSub.currentBillingPeriod?.endsAt || undefined,
              last_synced_at: new Date().toISOString()
            });

            await EventService.syncCorrection(org.org_id, diff);
            syncStatus.updated++;
          } else {
            // Just update last_synced_at
            await supabaseAdmin
              .from("subscriptions")
              .update({ last_synced_at: new Date().toISOString() })
              .eq("org_id", org.org_id);
            syncStatus.skipped++;
          }
        } catch (e) {
          console.error(`[Inngest] Sync failed for org ${org.org_id}:`, (e as Error).message);
          syncStatus.errors++;
        }
      }
      return syncStatus;
    });

    return { success: true, ...results };
  }
);
