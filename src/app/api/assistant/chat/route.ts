// ═══════════════════════════════════════════════════════════
// POST /api/assistant/chat
// In-app support chat endpoint.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { AssistantService } from "@/lib/ai/assistant.service";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { currentUser } from "@clerk/nextjs/server";

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const user = await currentUser();
    const org = await OrganizationRepository.findById(ctx.orgId);
    
    const body = await req.json();
    const { message, current_route } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // Call orchestrator with personalization context
    const response = await AssistantService.getResponse(message, current_route, {
      userName: user?.firstName || "there",
      orgName: org?.name || "your organization"
    });

    return NextResponse.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error("[Assistant API] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        type: "other",
        message: "I am having trouble connecting to the network. Try again later.",
        actions: []
      },
      { status: 500 }
    );
  }
});
