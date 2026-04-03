// ═══════════════════════════════════════════════════════════
// DELETE /api/org/delete — Workspace Soft-Delete
//
// RULES:
//   1. Only the org owner can delete the workspace.
//   2. Active Paddle subscriptions are cancelled immediately.
//   3. Organization is soft-deleted (deleted_at = now()).
//   4. A background job hard-deletes after 7 days.
//   5. An irrefutable audit log is written.
// ═══════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { withRole, OrgContext } from "@/lib/middleware/withOrg";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PaddleService } from "@/lib/services/paddle.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const DELETE = withRole(["owner"], async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const { orgId, userId } = ctx;

    // 1. Fetch org + subscription in parallel
    const [orgResult, subResult] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id, name, deleted_at")
        .eq("id", orgId)
        .single(),
      supabaseAdmin
        .from("subscriptions")
        .select("plan_name, paddle_subscription_id, payment_status")
        .eq("org_id", orgId)
        .single(),
    ]);

    if (orgResult.error || !orgResult.data) {
      return apiError(404, "Organization not found", "ORG_NOT_FOUND");
    }

    // 2. Prevent double-deletion
    if (orgResult.data.deleted_at) {
      return apiError(409, "Workspace is already scheduled for deletion", "ALREADY_DELETED");
    }

    const org = orgResult.data;
    const sub = subResult.data;

    // 3. Cancel active Paddle subscription
    let paddleCancelResult: { success: boolean; error?: string } = { success: true };
    if (sub?.paddle_subscription_id && sub.payment_status === "active") {
      paddleCancelResult = await PaddleService.cancelSubscription(sub.paddle_subscription_id);
      if (!paddleCancelResult.success) {
        console.error(
          `[OrgDelete] Paddle cancel failed for org=${orgId}: ${paddleCancelResult.error}. Proceeding with soft-delete anyway.`
        );
        // We proceed with deletion even if Paddle fails — the webhook handler
        // will eventually sync, and the audit log captures the attempt.
      }
    }

    // 4. Soft-delete the organization (atomic)
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({ deleted_at: now })
      .eq("id", orgId);

    if (updateError) {
      return apiError(500, "Failed to delete workspace", "DELETE_FAILED");
    }

    // 5. Mark subscription as cancelled + blocked
    if (sub) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          payment_status: "cancelled",
          access_blocked: true,
          updated_at: now,
        })
        .eq("org_id", orgId);
    }

    // 6. Write irrefutable audit log
    await supabaseAdmin.from("workspace_deletion_log").insert({
      org_id: orgId,
      org_name: org.name,
      deleted_by_user_id: userId,
      plan_at_deletion: sub?.plan_name || "unknown",
      paddle_subscription_id: sub?.paddle_subscription_id || null,
      soft_deleted_at: now,
    });

    // 7. Log event
    try {
      const { EventService } = await import("@/lib/services/event.service");
      await EventService.track({
        orgId,
        type: "workspace_deleted",
        metadata: {
          deleted_by: userId,
          plan: sub?.plan_name,
          paddle_cancelled: paddleCancelResult.success,
        },
      });
    } catch {
      // Non-critical — audit log is the source of truth
    }

    return apiSuccess({
      message: "Workspace scheduled for permanent deletion in 7 days.",
      deleted_at: now,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
