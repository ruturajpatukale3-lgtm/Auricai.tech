import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { HubSpotService } from "@/lib/services/hubspot.service";

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  
  // Need orgId to store the connection.
  if (!userId || !orgId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("[HubSpot Callback] Error from HubSpot:", error);
    return NextResponse.redirect(new URL("/dashboard/settings?error=hubspot_auth_failed", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/settings?error=missing_code", req.url));
  }

  const result = await HubSpotService.handleOAuthCallback(orgId, code);

  if (!result.success) {
    return NextResponse.redirect(new URL(`/dashboard/settings?error=${encodeURIComponent(result.error || "unknown")}`, req.url));
  }

  // Trigger an initial sync immediately after connect
  await HubSpotService.syncDeals(orgId);

  return NextResponse.redirect(new URL("/dashboard/settings?success=hubspot_connected", req.url));
}
