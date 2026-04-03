"use server";

import { revalidateTag } from "next/cache";
import { InterviewService } from "@/lib/services/interview.service";
import { auth } from "@clerk/nextjs/server";
import { UsageRepository } from "@/lib/repositories/usage.repository";
import { AuthService } from "@/lib/services/auth.service";

/**
 * Robustly fetch organization ID for the current session.
 */
async function getEffectiveOrgId() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  const finalOrgId = orgId || await AuthService.getOrgIdForUser(userId);
  if (!finalOrgId) throw new Error("No organization selected. Please complete onboarding.");
  
  return finalOrgId;
}

export async function createEmptyInterview() {
  const orgId = await getEffectiveOrgId();
  
  // Basic mock action matching user's desired flow
  await InterviewService.create(orgId, "test@client.com", "Test Client");
  
  // @ts-ignore
  revalidateTag(`org-${orgId}`);
  // @ts-ignore
  revalidateTag(`analytics-${orgId}`);
  return { success: true };
}

export async function createEmptyCaseStudy() {
  const orgId = await getEffectiveOrgId();
  
  // Basic mock usage logic (real creation is in webhook/AI)
  await UsageRepository.incrementCaseStudies(orgId);
  
  // @ts-ignore
  revalidateTag(`org-${orgId}`);
  // @ts-ignore
  revalidateTag(`analytics-${orgId}`);
  return { success: true };
}
