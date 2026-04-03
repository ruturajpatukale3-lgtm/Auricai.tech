// ═══════════════════════════════════════════════════════════
// Auricai — Notification Service
// Creates contextual notifications from system events.
// Triggered by other services — never called from frontend directly.
// ═══════════════════════════════════════════════════════════

import { NotificationRepository } from "@/lib/repositories/notification.repository";
import type { Notification, NotificationType } from "@/types";

export const NotificationService = {
  // ─── Query Methods ──────────────────────────────────────────

  async getUnread(orgId: string): Promise<Notification[]> {
    return NotificationRepository.findUnread(orgId);
  },

  async getAll(orgId: string, limit: number = 50): Promise<Notification[]> {
    return NotificationRepository.findAll(orgId, limit);
  },

  async getUnreadCount(orgId: string): Promise<number> {
    return NotificationRepository.countUnread(orgId);
  },

  async markAsRead(orgId: string, notificationId: string): Promise<void> {
    return NotificationRepository.markAsRead(orgId, notificationId);
  },

  async markAllAsRead(orgId: string): Promise<void> {
    return NotificationRepository.markAllAsRead(orgId);
  },

  // ─── Trigger Methods (Called by other services) ─────────────

  /**
   * Called when a client completes an interview
   */
  async notifyInterviewCompleted(
    orgId: string,
    clientName: string,
    interviewId: string
  ): Promise<Notification> {
    return NotificationRepository.create(
      orgId,
      "interview_completed",
      `Interview from ${clientName} completed — ready for AI processing.`,
      { interview_id: interviewId, client_name: clientName }
    );
  },

  /**
   * Called when AI generates a case study draft
   */
  async notifyCaseStudyReady(
    orgId: string,
    companyName: string,
    caseStudyId: string
  ): Promise<Notification> {
    return NotificationRepository.create(
      orgId,
      "case_study_ready",
      `Case study draft ready for "${companyName}" — review and approve it.`,
      { case_study_id: caseStudyId, company_name: companyName }
    );
  },

  /**
   * Called when a deal status changes to closed_won
   */
  async notifyDealWon(
    orgId: string,
    dealName: string,
    dealValue: number,
    dealId: string
  ): Promise<Notification> {
    const formattedValue = dealValue >= 1000
      ? `$${(dealValue / 1000).toFixed(0)}K`
      : `$${dealValue.toLocaleString()}`;

    return NotificationRepository.create(
      orgId,
      "deal_won",
      `Deal "${dealName}" closed won — ${formattedValue} revenue attributed! 🎉`,
      { deal_id: dealId, deal_name: dealName, deal_value: dealValue }
    );
  },

  /**
   * Called when usage reaches 80% of limit (warning)
   */
  async notifyUsageWarning(
    orgId: string,
    used: number,
    limit: number,
    limitType: "interviews" | "case_studies"
  ): Promise<Notification> {
    const label = limitType === "interviews" ? "interviews" : "case studies";
    return NotificationRepository.create(
      orgId,
      "usage_warning",
      `You've used ${used}/${limit} ${label}. Consider upgrading your plan.`,
      { used, limit, limit_type: limitType }
    );
  },

  /**
   * Called when usage hits 100% of limit
   */
  async notifyUsageLimitReached(
    orgId: string,
    limitType: "interviews" | "case_studies"
  ): Promise<Notification> {
    const label = limitType === "interviews" ? "interview" : "case study";
    return NotificationRepository.create(
      orgId,
      "usage_limit_reached",
      `You've reached your ${label} limit. Upgrade your plan to continue.`,
      { limit_type: limitType }
    );
  },

  /**
   * Generic system notification
   */
  async notifySystem(
    orgId: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<Notification> {
    return NotificationRepository.create(orgId, "system", message, metadata);
  },
};
