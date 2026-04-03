// ═══════════════════════════════════════════════════════════
// POST /api/settings/branding — Upload logo to Supabase Storage
// Stores at logos/{org_id}/logo.png and saves URL to organizations
// ═══════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { EventService } from "@/lib/services/event.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const formData = await req.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return apiError(400, "No file provided", "VALIDATION_ERROR");
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError(400, "File too large. Maximum 2MB allowed.", "VALIDATION_ERROR");
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError(400, "Invalid file type. Use PNG, JPEG, WebP, or SVG.", "VALIDATION_ERROR");
    }

    // Determine file extension
    const ext = file.type.split("/")[1] === "svg+xml" ? "svg" : file.type.split("/")[1];
    const filePath = `logos/${ctx.orgId}/logo.${ext}`;

    // Upload to Supabase Storage (upsert mode)
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from("logos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[Branding] Upload failed:", uploadError);
      return apiError(500, "Failed to upload logo. Ensure the 'logos' bucket exists in Supabase Storage.", "STORAGE_ERROR");
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("logos")
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    // Save URL to organization record
    await OrganizationRepository.update(ctx.orgId, { logo_url: logoUrl });

    // Log branding event
    await EventService.track({
      orgId: ctx.orgId,
      type: "branding_uploaded",
      entityId: ctx.orgId,
      metadata: { logo_url: logoUrl },
    });

    return apiSuccess({ logo_url: logoUrl });
  } catch (error) {
    return handleApiError(error);
  }
});
