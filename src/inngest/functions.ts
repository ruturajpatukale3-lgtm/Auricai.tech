import { inngest } from "./client";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { InterviewAnswerRepository } from "@/lib/repositories/interview-answer.repository";
import { OrgProfileRepository } from "@/lib/repositories/org-profile.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { CaseStudyGenerator } from "@/lib/ai/case-study-generator";
import { EmailService } from "@/lib/services/email.service";
import { EventService } from "@/lib/services/event.service";
import { DomainService } from "@/lib/services/domain.service";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NotificationService } from "@/lib/services/notification.service";

// ═══════════════════════════════════════════════════════════
// AI Case Study Generation Job (UNIFIED PIPELINE)
//
// ONE path. No alternatives. No legacy fallbacks.
//
// Interview completed → this job → CaseStudyGenerator → DB
// ═══════════════════════════════════════════════════════════
export const generateCaseStudyJob = inngest.createFunction(
  { 
    id: "generate-case-study", 
    retries: 3, 
    triggers: [{ event: "ai/generate_case_study" }],
    concurrency: {
      limit: 20,
      key: "event.data.orgId",
    }
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { interviewId, orgId } = event.data;

    // ─── Step 1: Fetch Interview ─────────────────────────
    const interview = await step.run("fetch-interview", async () => {
      return await InterviewRepository.findById(orgId, interviewId);
    });

    if (!interview || (interview.status !== "completed" && interview.status !== "generating")) {
      return { success: false, reason: "Interview not ready for generation" };
    }

    // ─── Step 2: Set Status → "generating" ───────────────
    await step.run("set-generating-status", async () => {
      await InterviewRepository.updateStatus(orgId, interviewId, "generating");
    });

    // ─── Step 3: Fetch Answers ───────────────────────────
    const answers = await step.run("fetch-answers", async () => {
      return await InterviewAnswerRepository.findByInterview(interviewId);
    });

    if (!answers.length) {
      // Revert status on failure
      await step.run("revert-status-no-answers", async () => {
        await InterviewRepository.updateStatus(orgId, interviewId, "completed");
      });
      return { success: false, reason: "No answers found" };
    }

    // ─── Step 4: Fetch Context ───────────────────────────
    const orgProfile = await step.run("fetch-org-profile", async () => {
      return await OrgProfileRepository.findByOrgId(orgId);
    });

    const organization = await step.run("fetch-organization", async () => {
      return await OrganizationRepository.findById(orgId);
    });

    // ─── Step 5: AI Generation (THE SINGLE PATH) ─────────
    const aiOutput = await step.run("generate-ai-case-study", async () => {
      const defaultProfile = {
        industry: "other" as const,
        industry_raw: "General Business",
        service_category: "Professional Services",
        service_type: "Business services",
        target_customer: "Businesses",
        ai_tone: "professional" as const,
        ai_output_style: "concise" as const,
        ai_case_study_style: "metric_driven" as const,
        font_preset: "sans" as const,
      };

      return await CaseStudyGenerator.generate(
        answers,
        orgProfile || defaultProfile as any,
        organization?.plan_type || "starter"
      );
    });

    // ─── Step 6: Hard Validation ─────────────────────────
    if (!aiOutput.headline) {
      await step.run("revert-status-no-headline", async () => {
        await InterviewRepository.updateStatus(orgId, interviewId, "completed");
        await EventService.track({
          orgId,
          type: "ai_generation_failed",
          entityId: interviewId,
          metadata: { reason: "missing_headline" },
        });
      });
      throw new Error("AI generation failed: Missing headline");
    }

    if (!aiOutput.story || aiOutput.story.split(/\s+/).length < 80) {
      await step.run("revert-status-bad-story", async () => {
        await InterviewRepository.updateStatus(orgId, interviewId, "completed");
        await EventService.track({
          orgId,
          type: "ai_generation_failed",
          entityId: interviewId,
          metadata: { reason: "story_too_short", wordCount: aiOutput.story?.split(/\s+/).length || 0 },
        });
      });
      throw new Error("AI generation failed: Story too short or missing");
    }

    // ─── Step 7: Generate Slug ───────────────────────────
    const slug = aiOutput.headline
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60)
      + "-" + Date.now().toString().slice(-4);

    // ─── Step 8: Persist to DB ───────────────────────────
    const caseStudy = await step.run("persist-case-study", async () => {
      // Check for existing case study for this interview (upsert)
      const existing = await CaseStudyRepository.findByInterviewId(interviewId);

      // Compute delta
      let deltaPercent: number | undefined;
      if (aiOutput.before && aiOutput.after) {
        const parseMagnitude = (val: string): number | null => {
          const cleaned = val.replace(/[,$%\s]/g, "").toLowerCase();
          const match = cleaned.match(/([\d.]+)(k|m|b)?/);
          if (!match) return null;
          let num = parseFloat(match[1]);
          if (match[2] === "k") num *= 1000;
          if (match[2] === "m") num *= 1000000;
          if (match[2] === "b") num *= 1000000000;
          return num;
        };
        const beforeNum = parseMagnitude(aiOutput.before);
        const afterNum = parseMagnitude(aiOutput.after);
        if (beforeNum && afterNum && beforeNum > 0) {
          deltaPercent = Math.round(((afterNum - beforeNum) / beforeNum) * 100);
        }
      }

      const caseStudyData = {
        company_name: aiOutput.company || interview.client_name || interview.client_email.split("@")[0],
        headline: aiOutput.headline,
        summary: aiOutput.impact || undefined,
        story: aiOutput.story,
        quote: aiOutput.quote || undefined,
        client_name: aiOutput.client_name || undefined,
        metrics: aiOutput.metrics || undefined,
        metric_type: aiOutput.primary_metric || undefined,
        before_value: aiOutput.before || undefined,
        after_value: aiOutput.after || undefined,
        delta_percent: deltaPercent,
        timeframe: aiOutput.timeframe || undefined,
        slug,
      };

      if (existing) {
        return await CaseStudyRepository.update(orgId, existing.id, caseStudyData);
      } else {
        return await CaseStudyRepository.create(orgId, {
          interview_id: interviewId,
          ...caseStudyData,
        });
      }
    });

    // ─── Step 9: Mark Interview → review_ready ───────────
    await step.run("mark-interview-review-ready", async () => {
      await InterviewRepository.updateStatus(orgId, interviewId, "review_ready");
    });

    // ─── Step 10: Notify ─────────────────────────────────
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
  sendInterviewRemindersJob,
];
