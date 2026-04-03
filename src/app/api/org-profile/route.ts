// GET /api/org-profile — Fetch business profile
// PATCH /api/org-profile — Update business profile
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { OrgProfileRepository } from "@/lib/repositories/org-profile.repository";
import { validateInput, updateOrgProfileSchema } from "@/lib/validation";
import { EventService } from "@/lib/services/event.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const profile = await OrgProfileRepository.findByOrgId(ctx.orgId);
    if (!profile) return apiError(404, "Business profile not found");
    return apiSuccess(profile);
  } catch (error) {
    console.error("[GET /api/org-profile] Error:", error);
    return handleApiError(error);
  }
});

export const PATCH = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    const validation = validateInput(updateOrgProfileSchema, body);
    if (!validation.success) {
      console.error("[PATCH /api/org-profile] Validation Failed:", validation.error);
      return apiError(400, validation.error);
    }

    const { industry, custom_industry, service_category, service_type, target_customer } = validation.data;

    // Build update payload — only include fields that were actually sent
    const updates: Record<string, unknown> = {};
    if (industry !== undefined) {
      updates.industry = industry;
      // Handle the "other" -> industry_raw relationship
      updates.industry_raw = industry === "other" ? (custom_industry || null) : null;
    }
    if (service_category !== undefined) updates.service_category = service_category;
    if (service_type !== undefined) updates.service_type = service_type;
    if (target_customer !== undefined) updates.target_customer = target_customer;

    if (Object.keys(updates).length === 0) {
      return apiError(400, "No fields to update");
    }

    const updated = await OrgProfileRepository.update(ctx.orgId, updates as any);

    await EventService.track({
      orgId: ctx.orgId,
      type: "settings_updated" as any,
      metadata: { section: "business_profile", ...updates },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error("[PATCH /api/org-profile] Unexpected Error:", error);
    return handleApiError(error);
  }
});
