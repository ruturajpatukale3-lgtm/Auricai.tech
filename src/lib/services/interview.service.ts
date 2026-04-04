// ═══════════════════════════════════════════════════════════
// CaseFlow — Interview Service (Core Engine)
// Orchestrates: plan check → duplicate check → create → token → email → usage → event
// Email-only. No SMS/WhatsApp/Twilio.
// ═══════════════════════════════════════════════════════════

import { nanoid } from "nanoid";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { InterviewAnswerRepository } from "@/lib/repositories/interview-answer.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { UsageRepository } from "@/lib/repositories/usage.repository";
import { canCreateInterview } from "@/lib/plans";
import { EmailService } from "@/lib/services/email.service";
import { EventService } from "@/lib/services/event.service";
import { PlanLimitError, NotFoundError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidateTag } from "next/cache";
import type { Interview, InterviewAnswer, ServiceResult } from "@/types";
import { NotificationService } from "@/lib/services/notification.service";
import { SubscriptionService } from "@/lib/services/subscription.service";
import { logger } from "@/lib/logger";

export const InterviewService = {
  /**
   * Create a new interview: validate plan → create → token → email → usage → event
   */
  async create(
    orgId: string,
    clientEmail: string,
    clientName?: string,
    idempotencyKey?: string,
    userId?: string  // Clerk userId — required for cross-org free plan enforcement
  ): Promise<ServiceResult<Interview>> {
    // 1. Get org and ensure usage row exists
    const org = await OrganizationRepository.findById(orgId);
    if (!org) return { success: false, error: "Organization not found", code: "NOT_FOUND" };

    // 1.5 Idempotency Check (Fast-path return if exists)
    if (idempotencyKey) {
      const { data: existingInterview } = await supabaseAdmin
        .from("interviews")
        .select("*")
        .eq("org_id", orgId)
        .eq("idempotency_key", idempotencyKey)
        .single();
        
      if (existingInterview) {
        return { success: true, data: existingInterview as Interview };
      }
    }

    await UsageRepository.getOrCreate(orgId);

    // 3. Duplicate check — block same email within 24h
    const isDuplicate = await InterviewRepository.hasRecentInterview(orgId, clientEmail, 24);
    if (isDuplicate) {
      return { success: false, error: "An interview was already sent to this email within the last 24 hours", code: "DUPLICATE_BLOCKED" };
    }

    // 4. Generate unique token (with collision check)
    let token = "";
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      token = nanoid(24);
      const existing = await InterviewRepository.findByToken(token);
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) throw new Error("Failed to generate unique interview token");

    // 5. Create interview & Increment usage (ONE ATOMIC RPC)
    const interview = await InterviewRepository.create(orgId, {
      client_email: clientEmail,
      client_name: clientName,
      token,
      idempotency_key: idempotencyKey,
      userId: userId, // Cross-org free plan enforcement
    });

    // Emit observability trace
    logger.info({
      event: "INTERVIEW_CREATED",
      orgId,
      metadata: { clientEmail, interviewId: interview.id }
    });

    // 5.5 Invalidate rate limit cache to refresh DB counts across distributed nodes
    try {
      await supabaseAdmin.from("rate_limit_cache").delete().eq("id", `rate_limit:${orgId}`);
    } catch (e) {
      logger.warn({ event: "TRANSACTION_FAILURE", orgId, error: (e as Error).message, metadata: { context: "cache_invalidation_failed" }});
    }

    // 6. Send email directly via Resend (no Inngest dependency)
    console.log(`📧 [SERVICE] Sending email to ${clientEmail}...`);
    try {
      const emailSent = await EmailService.sendInterviewInvite(
        clientEmail,
        org.name,
        token,
        clientName
      );
      if (!emailSent) {
        throw new Error("Email provider (Resend) failed to deliver the email");
      }
      console.log("   ✅ [SERVICE] EmailService returned success");
    } catch (e) {
      console.error(`   ❌ [SERVICE] EmailService FATAL: ${(e as Error).message}`);
      logger.warn({ event: "TRANSACTION_FAILURE", orgId, error: (e as Error).message, metadata: { context: "email_send_failed" }});
      return { success: false, error: "Failed to send interview invitation email. Please try again.", code: "EMAIL_DELIVERY_FAILED" };
    }

    // 7. Log event
    await EventService.interviewSent(orgId, interview.id, clientEmail);

    // 8. Check usage for warning notification (at 80%+)
    try {
      const usage = await UsageRepository.getOrCreate(orgId);
      const usagePercent = usage.interviews_limit > 0
        ? (usage.interviews_used / usage.interviews_limit) * 100
        : 0;
      if (usagePercent >= 80 && usagePercent < 100) {
        await NotificationService.notifyUsageWarning(
          orgId, usage.interviews_used, usage.interviews_limit, "interviews"
        );
      }
    } catch (e) {
      logger.warn({ event: "TRANSACTION_FAILURE", orgId, error: (e as Error).message, metadata: { context: "usage_warning_failed" }});
    }
    
    // Clear Server Cache
    // @ts-ignore - Next.js 15 cache typings regression
    try { revalidateTag(`org-${orgId}`); } catch (e) {}

    return { success: true, data: interview };
  },

  /**
   * List all interviews for an org
   */
  async getByOrg(orgId: string): Promise<Interview[]> {
    const { data } = await InterviewRepository.findByOrg(orgId);
    return data;
  },

  /**
   * Get interview by token (public, no auth required)
   * Tracks 'opened' event on first hit
   */
   async getByToken(token: string, metadata: Record<string, unknown> = {}): Promise<Interview | null> {
    // 2. Lookup by token natively (no explicit joins because of PGRST200 missing FK)
    const { data: interview, error: fetchError } = await supabaseAdmin
      .from("interviews")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !interview) return null;

    // Fetch the active subscription independently gracefully
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_name")
      .eq("org_id", interview.org_id)
      .eq("status", "active")
      .single();

    // 1. Expiration check (30 days)
    const createdDate = new Date(interview.created_at);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (createdDate < thirtyDaysAgo) {
      logger.warn({ event: "TRANSACTION_FAILURE", orgId: interview.org_id, metadata: { error: "token_expired", token }});
      return null;
    }

    // 2. Log engagement event
    await EventService.interviewOpened(interview.org_id, interview.id, metadata);
    
    // 3. Update last activity
    await InterviewRepository.updateByToken(token, { last_activity: new Date().toISOString() });

    // 4. Flatten the response for consistency
    const result = {
      ...interview,
      plan_name: sub?.plan_name || "starter"
    };

    return result;
  },

  /**
   * Get interview by ID (org-scoped)
   */
  async getById(orgId: string, id: string): Promise<Interview | null> {
    return InterviewRepository.findById(orgId, id);
  },

  /**
   * Submit an answer to an interview (public, by token)
   * Handles status transition: sent → in_progress on first answer
   */
  async submitAnswer(
    token: string,
    question: string,
    answer: string,
    progress?: { currentIndex: number; totalQuestions: number }
  ): Promise<ServiceResult<InterviewAnswer>> {
    // 1. Find interview by token
    const interview = await InterviewRepository.findByToken(token);
    if (!interview) throw new NotFoundError("Interview");

    // 2. Validate state
    if (interview.status === "completed" || interview.status === "approved") {
      return { success: false, error: "This interview has already been completed", code: "ALREADY_COMPLETED" };
    }

    // 3. Save answer
    const savedAnswer = await InterviewAnswerRepository.create({
      interview_id: interview.id,
      question,
      answer,
    });

    // 4. Update Progress Server-Side (derive from DB)
    const existingAnswers = await InterviewAnswerRepository.findByInterview(interview.id);
    const completedCount = existingAnswers.length;
    
    await InterviewRepository.upsertProgress(interview.id, {
      completed_questions: completedCount,
      total_questions: progress?.totalQuestions || Math.max(completedCount, 5),
      last_question_index: completedCount - 1 > 0 ? completedCount - 1 : 0,
    });

    // 5. Logic for in_progress transition
    if (interview.status === "sent") {
      await InterviewRepository.updateByToken(token, { 
        status: "in_progress" as const,
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      });
      await EventService.interviewStarted(interview.org_id, interview.id);
    } else {
      await InterviewRepository.updateByToken(token, { last_activity: new Date().toISOString() });
    }

    return { success: true, data: savedAnswer };
  },

  /**
   * Mark interview as completed (public, by token)
   */
  async complete(token: string): Promise<ServiceResult<Interview>> {
    const interview = await InterviewRepository.findByToken(token);
    if (!interview) throw new NotFoundError("Interview");

    if (interview.status !== "in_progress" && interview.status !== "sent") {
      return { success: false, error: "Interview is not in progress", code: "INVALID_STATE" };
    }

    const completedAt = new Date().toISOString();
    const startedAt = interview.started_at || interview.created_at;
    
    // Compute completion_time (ms)
    const completionTime = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    const updated = await InterviewRepository.updateByToken(token, {
      status: "completed" as const,
      completed_at: completedAt,
      last_activity: completedAt,
    });

    // Log event with completion metric
    await EventService.interviewCompleted(interview.org_id, interview.id, interview.client_email);
    
    // Log additional performance event
    await EventService.track({
      orgId: interview.org_id,
      type: "interview_completed",
      entityId: interview.id,
      metadata: { completion_time_ms: completionTime },
    });

    // Queue AI Case Study generation — graceful if Inngest not configured
    try {
      const { inngest } = await import("@/inngest/client");
      await inngest.send({
        name: "ai/generate_case_study",
        data: {
          interviewId: interview.id,
          orgId: interview.org_id,
        },
      });
    } catch (e) {
      logger.warn({ event: "TRANSACTION_FAILURE", orgId: interview.org_id, error: (e as Error).message, metadata: { context: "inngest_skipped" }});
    }

    // Notify org that interview is completed
    try {
      await NotificationService.notifyInterviewCompleted(
        interview.org_id,
        interview.client_name || interview.client_email,
        interview.id
      );
    } catch (e) {
      logger.warn({ event: "TRANSACTION_FAILURE", orgId: interview.org_id, error: (e as Error).message, metadata: { context: "notification_failed" }});
    }

    return { success: true, data: updated };
  },

  /**
   * Approve a completed interview (org-scoped)
   */
  async approve(orgId: string, interviewId: string): Promise<ServiceResult<Interview>> {
    const interview = await InterviewRepository.findById(orgId, interviewId);
    if (!interview) throw new NotFoundError("Interview");

    if (interview.status !== "completed") {
      return { success: false, error: "Only completed interviews can be approved", code: "INVALID_STATE" };
    }

    const updated = await InterviewRepository.updateStatus(orgId, interviewId, "approved");
    return { success: true, data: updated };
  },

  /**
   * Send a reminder for a stalled interview (manual trigger from dashboard)
   */
  async sendReminder(orgId: string, interviewId: string): Promise<ServiceResult<void>> {
    const interview = await InterviewRepository.findById(orgId, interviewId);
    if (!interview) throw new NotFoundError("Interview");

    if (interview.status !== "sent" && interview.status !== "in_progress") {
      return { success: false, error: "Can only remind for sent or in-progress interviews", code: "INVALID_STATE" };
    }

    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");

    // Send reminder email directly via Resend
    const sent = await EmailService.sendReminder(
      interview.client_email,
      org.name,
      interview.token,
      interview.client_name || undefined
    );

    if (!sent) {
      return { success: false, error: "Failed to send reminder email", code: "EMAIL_FAILED" };
    }

    await EventService.reminderSent(orgId, interviewId, interview.client_email);

    return { success: true };
  },

  /**
   * Get all answers for an interview
   */
  async getAnswers(interviewId: string): Promise<InterviewAnswer[]> {
    return InterviewAnswerRepository.findByInterview(interviewId);
  },

  // NOTE: Metric extraction is handled exclusively by AIExtractor (Gemini).
  // Legacy regex-based extractMetrics was removed — see audit_report.md.

  /**
   * Build structured answers map from stored interview_answers.
   * Uses the `intent` field stored in the `extracted` JSONB column.
   */
  async getStructuredAnswers(interviewId: string): Promise<import("@/types").StructuredAnswers> {
    const answers = await InterviewAnswerRepository.findByInterview(interviewId);
    const structured: import("@/types").StructuredAnswers = {};

    for (const answer of answers) {
      const intent = (answer.extracted as Record<string, unknown>)?.intent as string;
      if (intent && ["business_context", "problem", "result", "metrics", "timeframe", "testimonial"].includes(intent)) {
        structured[intent as keyof typeof structured] = answer.answer;
      }
    }

    return structured;
  },
};
