import { inngest } from "./client";
import { AIExtractor } from "@/lib/ai/extractor";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { InterviewAnswerRepository } from "@/lib/repositories/interview-answer.repository";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { EmailService } from "@/lib/services/email.service";
import { EventService } from "@/lib/services/event.service";
import { DomainService } from "@/lib/services/domain.service";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NotificationService } from "@/lib/services/notification.service";

/**
 * AI Case Study Generation Job
 */
export const generateCaseStudyJob = inngest.createFunction(
  { 
    id: "generate-case-study", 
    retries: 3, 
    triggers: [{ event: "ai/generate_case_study" }],
    concurrency: {
      limit: 20,
      key: "event.data.orgId", // Per-org concurrency limit to prevent one org from hogging all slots
    }
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { interviewId, orgId } = event.data;

    const interview = await step.run("fetch-interview", async () => {
      return await InterviewRepository.findById(orgId, interviewId);
    });

    if (!interview || interview.status !== "completed") {
      return { success: false, reason: "Interview not ready for generation" };
    }

    const answers = await step.run("fetch-answers", async () => {
      return await InterviewAnswerRepository.findByInterview(interviewId);
    });

    if (!answers.length) {
      return { success: false, reason: "No answers found" };
    }

    const metrics = await step.run("extract-metrics", async () => {
      const formattedAnswers = answers.map((a: { question: string; answer: string }) => ({
        question: a.question,
        answer: a.answer,
      }));
      return await AIExtractor.extractMetrics(formattedAnswers);
    });

    if (metrics.isVague) {
      await step.run("dispatch-clarification-email", async () => {
        const org = await OrganizationRepository.findById(orgId);
        if (org) {
          await EmailService.sendClarificationEmail(
            interview.client_email,
            org.name,
            interview.token,
            metrics.missingFields,
            interview.client_name || undefined
          );
        }
        await EventService.track({
          orgId,
          type: "ai_generation_failed",
          entityId: interviewId,
          metadata: {
            reason: "vague_answers",
            missingFields: metrics.missingFields,
          }
        });
      });
      return { success: false, reason: "Answers too vague", metrics };
    }

    const deltaPercent = await step.run("compute-math", async () => {
      if (metrics.before > 0 && metrics.after > metrics.before) {
        return Number((((metrics.after - metrics.before) / metrics.before) * 100).toFixed(2));
      }
      return null;
    });

    const caseStudy = await step.run("create-case-study", async () => {
      return await CaseStudyService.create(orgId, interviewId, {
        metricType: metrics.metricType,
        before: metrics.before > 0 ? metrics.before.toString() : null,
        after: metrics.after > 0 ? metrics.after.toString() : null,
        timeframe: metrics.timeframe,
        pipelineValue: metrics.pipelineValue,
        dealsInfluenced: metrics.dealsInfluenced,
        deltaPercent,
      });
    });

    // Mark interview as ready for client review
    await step.run("mark-review-ready", async () => {
      await InterviewRepository.updateStatus(orgId, interviewId, "review_ready");
    });

    // Notify client that case study is ready for review
    await step.run("notify-client-ready", async () => {
      const org = await OrganizationRepository.findById(orgId);
      if (org) {
        await EmailService.sendCaseStudyReadyEmail(
          interview.client_email,
          org.name,
          interview.token,
          interview.client_name || undefined
        );
      }
    });

    // Notify org that case study is ready
    await step.run("notify-case-study-ready", async () => {
      try {
        await NotificationService.notifyCaseStudyReady(
          orgId,
          caseStudy.company_name,
          caseStudy.id
        );
      } catch (e) {
        console.warn("[Inngest] Notification failed:", (e as Error).message);
      }
    });

    return { success: true, caseStudy };
  }
);



/**
 * Domain Verification Logic (Enterprise)
 */
export const verifyDomainJob = inngest.createFunction(
  { id: "verify-custom-domain", retries: 10, triggers: [{ event: "domain/verify" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { domainId, domainString, orgId } = event.data;

    await step.sleep("wait-for-dns", "2m");

    const result = await step.run("check-verification", async () => {
      return await DomainService.checkVerification(orgId, domainString);
    });

    if (!result.success || result.data?.status !== "verified") {
      throw new Error("Domain not yet verified, retrying...");
    }

    return { verified: true };
  }
);

/**
 * Process Database Outbox (Transactional Events Pipeline)
 */
export const processOutboxJob = inngest.createFunction(
  { id: "process-events-outbox", triggers: [{ cron: "* * * * *" }] },
  async ({ step }: { step: any }) => {
    const processedCount = await step.run("flush-outbox-to-events", async () => {
      // 1. Fetch pending outbox items
      const { data: items, error: fetchErr } = await supabaseAdmin
        .from("events_outbox")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      if (fetchErr || !items || items.length === 0) return 0;

      // 2. Insert into partitioned events table
      const { error: insertErr } = await supabaseAdmin
        .from("events")
        .insert(items.map(i => ({
          id: i.id,
          org_id: i.org_id,
          type: i.type,
          entity_id: i.entity_id,
          metadata: i.metadata,
          created_at: i.created_at
        })));

      if (insertErr) {
        if (!insertErr.message.includes("23505")) {
          throw new Error(`Failed to flush outbox: ${insertErr.message}`);
        }
      }

      // 3. Delete processed items
      const ids = items.map(i => i.id);
      await supabaseAdmin
        .from("events_outbox")
        .delete()
        .in("id", ids);

      return ids.length;
    });

    return { success: true, processedCount };
  }
);

/**
 * Permanent Workspace Purge (Runs daily)
 * Hard-deletes organizations where deleted_at > 7 days ago.
 * CASCADE on org FK handles interviews, case_studies, events, etc.
 */
export const purgeDeletedWorkspacesJob = inngest.createFunction(
  { id: "purge-deleted-workspaces", triggers: [{ cron: "0 3 * * *" }] }, // 3 AM UTC daily
  async ({ step }: { step: any }) => {
    const purgedCount = await step.run("hard-delete-expired-orgs", async () => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Fetch orgs scheduled for purge
      const { data: orgs, error: fetchErr } = await supabaseAdmin
        .from("organizations")
        .select("id, name")
        .not("deleted_at", "is", null)
        .lt("deleted_at", cutoff);

      if (fetchErr || !orgs || orgs.length === 0) return 0;

      // 2. Delete each org (CASCADE handles children)
      for (const org of orgs) {
        const { error: delErr } = await supabaseAdmin
          .from("organizations")
          .delete()
          .eq("id", org.id);

        if (delErr) {
          console.error(`[Purge] Failed to hard-delete org=${org.id}: ${delErr.message}`);
          continue;
        }

        // Update audit log with hard_deleted_at
        await supabaseAdmin
          .from("workspace_deletion_log")
          .update({ hard_deleted_at: new Date().toISOString() })
          .eq("org_id", org.id);

        console.log(`[Purge] Hard-deleted org=${org.id} (${org.name})`);
      }

      return orgs.length;
    });

    return { success: true, purgedCount };
  }
);

import { syncSubscriptionsJob } from "./billing-sync";
import { scheduleDailyHubSpotSync } from "./hubspot";

/**
 * Automated Interview Reminders (Hourly)
 * Finds 'sent' or 'in_progress' interviews older than 24h and sends a polite follow-up.
 */
export const sendInterviewRemindersJob = inngest.createFunction(
  { id: "send-interview-reminders", triggers: [{ cron: "0 * * * *" }] }, // Hourly
  async ({ step }: { step: any }) => {
    // 1. Fetch eligible interviews (limit 50 per hour to avoid burst/spam)
    const pendingReminders = await step.run("fetch-pending-reminders", async () => {
      return await InterviewRepository.findPendingReminders(50);
    });

    if (!pendingReminders || pendingReminders.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const results = [];

    // 2. Process each interview with idempotency
    for (const interview of pendingReminders) {
      const result = await step.run(`process-reminder-${interview.id}`, async () => {
        // Atomic claim (RPC prevents race conditions if multiple workers run)
        const claimed = await InterviewRepository.claimEmailReminder(interview.id);
        if (!claimed) return { interviewId: interview.id, status: "skipped", reason: "already_claimed_or_invalid_state" };

        const org = await OrganizationRepository.findById(interview.org_id);
        if (!org) return { interviewId: interview.id, status: "failed", reason: "org_not_found" };

        const sent = await EmailService.sendReminder(
          interview.client_email,
          org.name,
          interview.token,
          interview.client_name || undefined
        );

        if (!sent) {
          // If email provider fails, revert claim so it can be retried in next cron run
          await InterviewRepository.revertEmailReminder(interview.id);
          return { interviewId: interview.id, status: "failed", reason: "email_provider_error" };
        }

        // track event for observability
        await EventService.reminderSent(interview.org_id, interview.id, interview.client_email);

        return { interviewId: interview.id, status: "sent" };
      });
      results.push(result);
    }

    return { success: true, results, sentCount: results.filter(r => r.status === "sent").length };
  }
);

export const functions = [
  generateCaseStudyJob,
  verifyDomainJob,
  processOutboxJob,
  syncSubscriptionsJob,
  purgeDeletedWorkspacesJob,
  scheduleDailyHubSpotSync,
  sendInterviewRemindersJob,
];
