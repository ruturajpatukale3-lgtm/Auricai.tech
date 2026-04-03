// ═══════════════════════════════════════════════════════════
// GET  /api/notifications — List notifications (unread + recent)
// PATCH /api/notifications — Mark notification(s) as read
// ═══════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { NotificationService } from "@/lib/services/notification.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      NotificationService.getAll(ctx.orgId, 30),
      NotificationService.getUnreadCount(ctx.orgId),
    ]);

    return apiSuccess({ notifications, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();

    // Mark all as read
    if (body.markAllRead === true) {
      await NotificationService.markAllAsRead(ctx.orgId);
      return apiSuccess({ marked: "all" });
    }

    // Mark single as read
    if (body.notificationId) {
      await NotificationService.markAsRead(ctx.orgId, body.notificationId);
      return apiSuccess({ marked: body.notificationId });
    }

    return apiError(400, "Provide notificationId or markAllRead", "VALIDATION_ERROR");
  } catch (error) {
    return handleApiError(error);
  }
});
