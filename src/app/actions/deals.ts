"use server";

import { revalidateTag } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { AuthService } from "@/lib/services/auth.service";
import { DealService } from "@/lib/services/deal.service";
import {
  createDealSchema,
  attributeDealSchema,
  updateDealStatusSchema,
  validateInput,
} from "@/lib/validation";
import type { DealStatus } from "@/types";

// ─── Auth Helper ───────────────────────────────────────────

async function getEffectiveOrgId() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const finalOrgId = orgId || (await AuthService.getOrgIdForUser(userId));
  if (!finalOrgId)
    throw new Error("No organization selected. Please complete onboarding.");
  return finalOrgId;
}

// ─── Deal Actions ──────────────────────────────────────────

export async function createDealAction(input: {
  name: string;
  value: number;
  status?: DealStatus;
}) {
  const orgId = await getEffectiveOrgId();

  const validated = validateInput(createDealSchema, input);
  if (!validated.success) {
    return { success: false, error: validated.error };
  }

  try {
    const result = await DealService.create(orgId, validated.data);

    // @ts-ignore
    revalidateTag(`analytics-${orgId}`);
    // @ts-ignore
    revalidateTag(`org-${orgId}`);

    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create deal" };
  }
}

export async function attributeDealAction(input: {
  deal_id: string;
  case_study_id: string;
}) {
  const orgId = await getEffectiveOrgId();

  const validated = validateInput(attributeDealSchema, input);
  if (!validated.success) {
    return { success: false, error: validated.error };
  }

  try {
    const result = await DealService.attribute(
      orgId,
      validated.data.deal_id,
      validated.data.case_study_id
    );

    // @ts-ignore
    revalidateTag(`analytics-${orgId}`);
    // @ts-ignore
    revalidateTag(`org-${orgId}`);

    return result;
  } catch (err: any) {
    const message = err.message || "Failed to attribute deal";
    if (message.includes("already attributed")) {
      return {
        success: false,
        error: "This case study is already linked to this deal.",
      };
    }
    return { success: false, error: message };
  }
}

/**
 * Create a new deal and immediately attribute it to a case study.
 * Used by the "Quick Create Deal" flow in the modal.
 */
export async function createAndAttributeDealAction(input: {
  name: string;
  value: number;
  status?: DealStatus;
  case_study_id: string;
}) {
  const orgId = await getEffectiveOrgId();

  const dealValidated = validateInput(createDealSchema, {
    name: input.name,
    value: input.value,
    status: input.status,
  });
  if (!dealValidated.success) {
    return { success: false, error: dealValidated.error };
  }

  try {
    const result = await DealService.createAndAttribute(
      orgId,
      dealValidated.data,
      input.case_study_id
    );

    // @ts-ignore
    revalidateTag(`analytics-${orgId}`);
    // @ts-ignore
    revalidateTag(`org-${orgId}`);

    return result;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to create and attribute deal",
    };
  }
}

export async function updateDealStatusAction(input: {
  deal_id: string;
  status: DealStatus;
}) {
  const orgId = await getEffectiveOrgId();

  const validated = validateInput(updateDealStatusSchema, input);
  if (!validated.success) {
    return { success: false, error: validated.error };
  }

  try {
    const result = await DealService.updateStatus(
      orgId,
      validated.data.deal_id,
      validated.data.status
    );

    // @ts-ignore
    revalidateTag(`analytics-${orgId}`);
    // @ts-ignore
    revalidateTag(`org-${orgId}`);

    return result;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update deal status",
    };
  }
}

export async function getDealsAction() {
  const orgId = await getEffectiveOrgId();
  try {
    const deals = await DealService.getByOrg(orgId, { limit: 100 });
    return { success: true, data: deals };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch deals" };
  }
}

export async function getExternalDealsAction() {
  const orgId = await getEffectiveOrgId();
  try {
    const { HubSpotRepository } = await import("@/lib/repositories/hubspot.repository");
    const deals = await HubSpotRepository.getExternalDeals(orgId);
    return { success: true, data: deals };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch external deals" };
  }
}

export async function attributeExternalDealAction(input: {
  external_deal_id: string;
  case_study_id: string;
}) {
  const orgId = await getEffectiveOrgId();

  if (!input.external_deal_id || !input.case_study_id) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    const result = await DealService.attributeExternal(
      orgId,
      input.external_deal_id,
      input.case_study_id
    );

    // @ts-ignore
    revalidateTag(`analytics-${orgId}`);
    // @ts-ignore
    revalidateTag(`org-${orgId}`);

    return result;
  } catch (err: any) {
    const message = err.message || "Failed to attribute deal";
    if (message.includes("already attributed")) {
      return {
        success: false,
        error: "This case study is already linked to this deal.",
      };
    }
    return { success: false, error: message };
  }
}

export async function getAttributionContextAction() {
  const orgId = await getEffectiveOrgId();
  try {
    const { HubSpotRepository } = await import("@/lib/repositories/hubspot.repository");
    const [internalDeals, externalDeals, connection] = await Promise.all([
      DealService.getByOrg(orgId, { limit: 100 }),
      HubSpotRepository.getExternalDeals(orgId),
      HubSpotRepository.getConnection(orgId)
    ]);
    return {
      success: true,
      data: {
        hubspotConnected: !!connection,
        internalDeals,
        externalDeals
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch attribution context" };
  }
}
