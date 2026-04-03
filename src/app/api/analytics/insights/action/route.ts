import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { EventService } from "@/lib/services/event.service";
import { NotificationService } from "@/lib/services/notification.service";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const orgId = await AuthService.getOrgIdForUser(userId);
    if (!orgId) return new NextResponse("Organization Not Found", { status: 404 });

    const { type, action, title } = await req.json();

    // Log the insight action event
    await EventService.track({
      orgId,
      type: "settings_updated", // Using a generic type for now or could add "insight_action_executed"
      metadata: {
        insight_type: type,
        insight_action: action,
        insight_title: title,
        executed_at: new Date().toISOString(),
      },
    });

    // Specific Action Logic
    if (action === "Send Reminders") {
      // In a real app, this would trigger a bulk reminder job
      await NotificationService.notifySystem(orgId, "Bulk reminders initiated for stalled interviews.");
    }

    return NextResponse.json({ success: true, message: `Action ${action} executed.` });
  } catch (error) {
    console.error("[InsightAction] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
