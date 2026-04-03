// ═══════════════════════════════════════════════════════════
// CaseFlow — Event Service
// Centralized event logging. Log EVERY action.
// ═══════════════════════════════════════════════════════════

import { EventRepository } from "@/lib/repositories/event.repository";
import type { EventType } from "@/types";
import { isBot, generateVisitorId } from "@/lib/utils/analytics-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { revalidateTag } from "next/cache";

import crypto from "crypto";

export interface TrackOptions {
  orgId: string;
  type: EventType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  ua?: string;
}

export const EventService = {
  /**
   * The "Event Wrapper" — Every significant action must flow through here.
   */
  async track(options: TrackOptions): Promise<void> {
    const { orgId, type, entityId, metadata = {}, ip, ua } = options;

    // 1. Bot Filtering (Strict analytics integrity)
    if (ua && isBot(ua)) {
      console.log(`[EventService] Ignoring bot traffic from UA: ${ua}`);
      return;
    }

    // 2. Deduplication Rate Limit (Dedupe same IP + Event Type within 30s)
    if (ip) {
      const rateLimitId = `dedupe_${orgId}_${type}_${ip}`;
      const limit = await checkRateLimit(rateLimitId, 1, "30 s");
      if (!limit.success) {
        console.log(`[EventService] Deduped duplicate event from IP: ${ip} for type: ${type}`);
        return;
      }
    }

    // 3. Visitor Identity (Hash IP+UA for privacy-compliant tracking)
    if (ip && ua) {
      metadata.visitor_id = await generateVisitorId(ip, ua);
    }
    
    // 4. Generate Idempotency Event Hash 
    // Uses type, entity, and exact payload serialization to prevent duplicate insertion
    const payloadSignature = JSON.stringify(metadata || {});
    // Hash is timeboxed to current hour to allow the identical event later, but not immediately
    const hourBox = new Date().toISOString().substring(0, 13); // e.g. "2026-04-02T14"
    const hashString = `${orgId}:${type}:${entityId || "none"}:${payloadSignature}:${hourBox}`;
    const eventHash = crypto.createHash("sha256").update(hashString).digest("hex");

    // 5. Log the Event
    try {
      await EventRepository.create(orgId, type, entityId, metadata, eventHash);
      
      // 6. Cache Invalidation (Real-time architecture enforcement)
      // Every event tracked should potentially update the dashboard.
      // @ts-ignore - Next.js 15 cache typings regression
      revalidateTag(`analytics-${orgId}`);
      // @ts-ignore - Next.js 15 cache typings regression
      revalidateTag("dashboard");
      
    } catch (error: any) {
      // Catch idempotency block gracefully
      if (error.message?.includes("duplicate_event")) {
        console.log(`[EventService] Captured duplicate insertion via event_hash idempotency lock.`);
      } else {
        console.error(error);
      }
    }
  },

  /**
   * Enhanced deal recording with Idempotency and Multi-Attribution support
   */
  async recordDealAttribution(
    orgId: string,
    caseStudyIds: string[],
    dealId: string,
    dealValue: number,
    companyName: string
  ): Promise<{ alreadyProcessed: boolean }> {
    // Rely exclusively on Database Constraints
    // The DB has UNIQUE INDEX on events(org_id, metadata->'deal_id')
    
    // Perform Attribution cleanly
    const trackPromises = caseStudyIds.map(csId => 
      this.track({
        orgId,
        type: "used_in_deal",
        entityId: csId,
        metadata: { deal_id: dealId, deal_value: dealValue, company_name: companyName },
      })
    );

    await Promise.all(trackPromises);
    
    // 'track' gracefully handles the 23505 Conflict
    return { alreadyProcessed: false };
  },

  /**
   * Convenience loggers (ALL flowing through 'track')
   */
  async interviewSent(orgId: string, interviewId: string, clientEmail: string) {
    await this.track({
      orgId,
      type: "interview_sent",
      entityId: interviewId,
      metadata: { client_email: clientEmail },
    });
  },

  async interviewOpened(orgId: string, interviewId: string, metadata: Record<string, unknown> = {}) {
    await this.track({
      orgId,
      type: "interview_opened",
      entityId: interviewId,
      metadata,
      ip: metadata.ip as string,
      ua: metadata.user_agent as string,
    });
  },

  async interviewStarted(orgId: string, interviewId: string) {
    await this.track({
      orgId,
      type: "interview_started",
      entityId: interviewId,
    });
  },

  async interviewCompleted(orgId: string, interviewId: string, clientEmail: string) {
    await this.track({
      orgId,
      type: "interview_completed",
      entityId: interviewId,
      metadata: { client_email: clientEmail },
    });
  },

  async caseStudyCreated(orgId: string, caseStudyId: string, companyName: string) {
    await this.track({
      orgId,
      type: "case_study_created",
      entityId: caseStudyId,
      metadata: { company_name: companyName },
    });
  },

  async caseStudyViewed(
    orgId: string, 
    caseStudyId: string, 
    pipelineValue?: number,
    metadata: Record<string, unknown> = {}
  ) {
    // metadata is expected to contain ip/ua from headers
    await this.track({
      orgId,
      type: "case_study_viewed",
      entityId: caseStudyId,
      metadata,
      ip: metadata.ip as string,
      ua: metadata.user_agent as string,
    });
  },

  async caseStudyPublished(orgId: string, caseStudyId: string, companyName: string) {
    await this.track({
      orgId,
      type: "case_study_published",
      entityId: caseStudyId,
      metadata: { company_name: companyName },
    });
  },

  async caseStudyShared(orgId: string, caseStudyId: string, companyName: string) {
    await this.track({
      orgId,
      type: "case_study_shared",
      entityId: caseStudyId,
      metadata: { company_name: companyName },
    });
  },

  async reminderSent(orgId: string, interviewId: string, clientEmail: string) {
    await this.track({
      orgId,
      type: "reminder_sent",
      entityId: interviewId,
      metadata: { client_email: clientEmail },
    });
  },

  // ... rest of the convenience methods refactored to use 'track'
  async teamInvited(orgId: string, email: string) {
    await this.track({
      orgId,
      type: "team_invited",
      metadata: { email },
    });
  },

  async teamRemoved(orgId: string, email: string) {
    await this.track({
      orgId,
      type: "team_removed",
      metadata: { email },
    });
  },

  async domainAdded(orgId: string, domain: string) {
    await this.track({
      orgId,
      type: "domain_added",
      metadata: { domain },
    });
  },

  async domainVerified(orgId: string, domain: string) {
    await this.track({
      orgId,
      type: "domain_verified",
      metadata: { domain },
    });
  },

  async planUpgraded(orgId: string, plan: string, priceId: string) {
    await this.track({
      orgId,
      type: "plan_upgraded",
      metadata: { plan, price_id: priceId },
    });
  },

  async planDowngraded(orgId: string, plan: string) {
    await this.track({
      orgId,
      type: "plan_downgraded",
      metadata: { plan },
    });
  },

  async paymentFailed(orgId: string, subscriptionId: string, amount?: string) {
    await this.track({
      orgId,
      type: "payment_failed",
      metadata: { subscription_id: subscriptionId, amount },
    });
  },

  async subscriptionCancelled(orgId: string, subscriptionId: string) {
    await this.track({
      orgId,
      type: "subscription_cancelled",
      metadata: { subscription_id: subscriptionId },
    });
  },

  async graceUsageReached(orgId: string) {
    await this.track({
      orgId,
      type: "grace_usage",
    });
  },

  async seatDeactivated(orgId: string, memberId: string, email: string) {
    await this.track({
      orgId,
      type: "seat_deactivated",
      entityId: memberId,
      metadata: { email },
    });
  },

  async syncCorrection(orgId: string, diff: Record<string, any>) {
    await this.track({
      orgId,
      type: "sync_correction",
      metadata: { diff },
    });
  },
};
