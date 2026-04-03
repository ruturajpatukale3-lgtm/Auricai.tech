// GET /api/settings — Full org settings
// PATCH /api/settings — Update org settings
import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { SettingsService } from "@/lib/services/settings.service";
import { validateInput, updateSettingsSchema } from "@/lib/validation";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

export const GET = withOrg(async (_req: NextRequest, ctx: OrgContext) => {
  try {
    const settings = await SettingsService.getOrgSettings(ctx.orgId);
    return apiSuccess(settings);
  } catch (error) { 
    console.error("[GET /api/settings] Error:", error);
    return handleApiError(error); 
  }
});

export const PATCH = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    const validation = validateInput(updateSettingsSchema, body);
    if (!validation.success) {
      console.error("[PATCH /api/settings] Validation Failed:", validation.error);
      return apiError(400, validation.error);
    }
    const result = await SettingsService.updateOrg(ctx.orgId, validation.data);
    if (!result.success) {
      console.error("[PATCH /api/settings] Mutation Failed Error 1451461783:", result.error);
      return apiError(400, result.error!);
    }
    return apiSuccess(result.data);
  } catch (error) { 
    console.error("[PATCH /api/settings] Unexpected Error 1451461783:", error);
    return handleApiError(error); 
  }
});
