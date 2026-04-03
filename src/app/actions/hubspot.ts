"use server";

import { auth } from "@clerk/nextjs/server";
import { AuthService } from "@/lib/services/auth.service";
import { HubSpotService } from "@/lib/services/hubspot.service";
import { ServiceResult } from "@/types";

async function getEffectiveOrgId() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const finalOrgId = orgId || (await AuthService.getOrgIdForUser(userId));
  if (!finalOrgId) throw new Error("No organization selected.");
  return finalOrgId;
}

export async function pushToHubSpotAction(
  caseStudyId: string,
  prospectEmail: string
): Promise<ServiceResult<{ noteId: string; portalId: string | null; contactId: string }>> {
  try {
    const orgId = await getEffectiveOrgId();
    
    if (!caseStudyId || !prospectEmail) {
      return { success: false, error: "Missing required fields." };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(prospectEmail)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    return await HubSpotService.pushCaseStudyToHubSpot(orgId, caseStudyId, prospectEmail);
  } catch (err: any) {
    console.error("[pushToHubSpotAction] Error:", err.message);
    return { success: false, error: err.message || "Failed to push to HubSpot." };
  }
}
