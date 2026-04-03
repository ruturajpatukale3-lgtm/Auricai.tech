import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { HubSpotService } from "@/lib/services/hubspot.service";

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const authUrl = HubSpotService.getAuthUrl();
  return NextResponse.redirect(authUrl);
}
