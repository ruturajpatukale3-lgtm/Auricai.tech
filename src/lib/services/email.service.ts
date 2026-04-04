// ═══════════════════════════════════════════════════════════
// Auricai — Email Service (Resend)
// All transactional emails for interviews, team invites, etc.
// Email is the ONLY communication channel. No SMS/WhatsApp.
// ═══════════════════════════════════════════════════════════

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_dummy_key_123456789";
const resend = new Resend(RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Auricai <noreply@auricai.tech>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const EmailService = {
  /**
   * Send interview invitation email to client.
   * Returns true if sent successfully, false otherwise.
   */
  async sendInterviewInvite(
    to: string,
    orgName: string,
    token: string,
    clientName?: string
  ): Promise<boolean> {
    const interviewUrl = `${APP_URL}/i/${token}`;
    const greeting = clientName ? `Hi ${clientName}` : "Hi there";

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "Your 3-minute case study interview is ready",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #111; font-size: 20px; margin-bottom: 16px;">${greeting},</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              <strong>${orgName}</strong> is putting together a case study and would love to feature the results you've achieved together.
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              It takes about <strong>3 minutes</strong> — just answer a few quick questions about the metrics and outcomes.
            </p>
            <a href="${interviewUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0;">
              Start Interview →
            </a>
            <p style="color: #999; font-size: 13px; margin-top: 32px;">
              This link is unique to you and expires in 30 days.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("[EmailService] Resend API error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("[EmailService] Failed to send interview invite:", error);
      return false;
    }
  },

  /**
   * Send reminder email for a stalled interview.
   * Returns true if sent successfully, false otherwise.
   */
  async sendReminder(
    to: string,
    orgName: string,
    token: string,
    clientName?: string
  ): Promise<boolean> {
    const interviewUrl = `${APP_URL}/i/${token}`;
    const greeting = clientName ? `Hi ${clientName}` : "Hi";

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: "Quick reminder — your case study interview",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #111; font-size: 20px; margin-bottom: 16px;">${greeting},</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Just a friendly reminder — you still have a quick case study interview waiting for you.
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              It only takes about <strong>2 minutes</strong>. Your real results help tell a great story.
            </p>
            <a href="${interviewUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0;">
              Complete Interview →
            </a>
            <p style="color: #999; font-size: 13px; margin-top: 32px;">
              If you've already completed it, please ignore this email.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("[EmailService] Resend API error on reminder:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("[EmailService] Failed to send reminder:", error);
      return false;
    }
  },

  /**
   * Send team invitation email.
   */
  async sendTeamInvite(
    to: string,
    orgName: string,
    inviterName: string
  ): Promise<void> {
    const acceptUrl = `${APP_URL}/dashboard?accept_invite=true`;

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `You've been invited to ${orgName} on Auricai`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #111; font-size: 20px; margin-bottom: 16px;">You're invited!</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Auricai.
            </p>
            <a href="${acceptUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0;">
              Accept Invitation →
            </a>
          </div>
        `,
      });
    } catch (error) {
      console.error("[EmailService] Failed to send team invite:", error);
    }
  },

  /**
   * Send clarification email when AI detects vague/missing metrics.
   */
  async sendClarificationEmail(
    to: string,
    orgName: string,
    token: string,
    missingFields: string[],
    clientName?: string
  ): Promise<void> {
    const interviewUrl = `${APP_URL}/i/${token}`;
    const greeting = clientName ? `Hi ${clientName}` : "Hi";
    const fieldsStr = missingFields.join(" and ");

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `Quick follow-up: ${orgName} case study`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #111; font-size: 20px; margin-bottom: 16px;">${greeting},</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Thanks for submitting your answers for the <strong>${orgName}</strong> case study!
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              To make the story truly impactful, we just need a bit more specific data. Our engine noticed we are missing hard numbers for: <strong>${fieldsStr}</strong>.
            </p>
            <a href="${interviewUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0;">
              Provide Missing Data →
            </a>
          </div>
        `,
      });
    } catch (error) {
      console.error("[EmailService] Failed to send clarification email:", error);
    }
  },

  /**
   * Send notification when case study is ready for client review.
   */
  async sendCaseStudyReadyEmail(
    to: string,
    orgName: string,
    token: string,
    clientName?: string
  ): Promise<boolean> {
    const previewUrl = `${APP_URL}/i/${token}`;
    const greeting = clientName ? `Hi ${clientName}` : "Hi";

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `Your case study for ${orgName} is ready`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #111; font-size: 20px; margin-bottom: 16px;">${greeting},</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Great news! Your case study with <strong>${orgName}</strong> has been generated and is ready for your final review.
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Review the results, metrics, and data extraction before it goes live.
            </p>
            <a href="${previewUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0;">
              Review Case Study →
            </a>
            <p style="color: #999; font-size: 13px; margin-top: 32px;">
              Once approved, you'll receive a copy of the final formatted case study.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("[EmailService] Resend API error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("[EmailService] Failed to send review notification:", error);
      return false;
    }
  },
};
