// ═══════════════════════════════════════════════════════════
// POST /api/jobs/send-email-reminders
// Cron-protected endpoint for batch email reminder processing.
// Protected by CRON_SECRET header — NOT user-facing.
// Email-only. No SMS/WhatsApp/Twilio.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { EmailService } from "@/lib/services/email.service";
import { EventService } from "@/lib/services/event.service";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  // 1. Authenticate via secret header
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!CRON_SECRET || token !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = { sent: 0, failed: 0, skipped: 0, total: 0 };

  try {
    // 2. Fetch pending reminders (sent > 24h ago, not yet reminded)
    const pending = await InterviewRepository.findPendingReminders(100);
    stats.total = pending.length;

    // 3. Process each sequentially for safety
    for (const interview of pending) {
      try {
        // Step A: Atomic claim (idempotent lock)
        const claimed = await InterviewRepository.claimEmailReminder(interview.id);
        if (!claimed) {
          stats.skipped++;
          continue;
        }

        // Step B: Resolve org name for email
        const org = await OrganizationRepository.findById(interview.org_id);
        const orgName = org?.name || "Your partner";

        // Step C: Send email via Resend
        const sent = await EmailService.sendReminder(
          interview.client_email,
          orgName,
          interview.token,
          interview.client_name || undefined
        );

        if (!sent) {
          // Step D: Revert on failure — allow retry in next cron run
          await InterviewRepository.revertEmailReminder(interview.id);
          stats.failed++;
          console.error(`[Cron] Reminder email failed for interview ${interview.id}`);
          continue;
        }

        // Step E: Log event
        await EventService.reminderSent(interview.org_id, interview.id, interview.client_email);
        stats.sent++;

      } catch (err) {
        console.error(`[Cron] Error processing interview ${interview.id}:`, (err as Error).message);
        // Revert on unexpected error
        try {
          await InterviewRepository.revertEmailReminder(interview.id);
        } catch (_) { /* best-effort revert */ }
        stats.failed++;
      }

      // Small delay between sends to avoid Resend burst limits
      if (pending.length > 10) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    console.log(`[Cron] send-email-reminders complete: ${JSON.stringify(stats)}`);

    return NextResponse.json({
      success: true,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Cron] send-email-reminders error:", message);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 }
    );
  }
}
