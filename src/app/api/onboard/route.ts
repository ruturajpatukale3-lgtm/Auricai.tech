// POST /api/onboard — Create org + save business profile for new user
import { NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { AuthService } from "@/lib/services/auth.service";
import { TeamRepository } from "@/lib/repositories/team.repository";
import { OrgProfileRepository } from "@/lib/repositories/org-profile.repository";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { apiSuccess, apiError, handleApiError } from "@/lib/errors";
import { businessContextSchema, validateInput } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError(401, "Auth required");

    const user = await currentUser();
    const body = await req.json();

    let orgId: string;
    let orgName: string;
    let alreadyOnboarded = false;

    // Check if user already has an org
    const existing = await TeamRepository.findByUserId(userId);

    if (existing) {
      orgId = existing.org_id;
      orgName = ""; // not needed for response
      alreadyOnboarded = true;
    } else {
      // Step 1: Create org
      const name =
        body.name || (user?.firstName ? `${user.firstName}'s Org` : "My Organization");
      const email =
        user?.emailAddresses?.[0]?.emailAddress || body.email || "";

      const org = await AuthService.onboardUser(userId, email, name);
      orgId = org.id;
      orgName = org.name;
    }

    // Step 2: Save business context (if provided)
    if (body.business_context) {
      const validation = validateInput(businessContextSchema, body.business_context);
      if (!validation.success) {
        return apiError(400, validation.error, "VALIDATION_ERROR");
      }

      const ctx = validation.data;
      await OrgProfileRepository.upsert(orgId, {
        industry: ctx.industry,
        industry_raw: ctx.industry === "other" ? (ctx.custom_industry || null) : null,
        service_category: ctx.service_category,
        service_type: ctx.service_type,
        target_customer: ctx.target_customer,
      });

      // --- First Value Guarantee ---
      // If profile is now complete, ensure they have at least one sample case study
      const existingCS = await CaseStudyRepository.findByOrg(orgId);
      if (existingCS.length === 0) {
        const companyLabel = body.name || "Sample Client";
        await CaseStudyRepository.create(orgId, {
          company_name: companyLabel,
          headline: `How we helped ${companyLabel} achieve ${ctx.service_category} results`,
          metric_type: "ROI / Efficiency",
          slug: `sample-client-${Math.random().toString(36).substring(2, 8)}`,
        });
      }
    }

    // Check if profile is complete
    const profile = await OrgProfileRepository.findByOrgId(orgId);

    return apiSuccess(
      {
        org_id: orgId,
        ...(orgName ? { name: orgName } : {}),
        already_onboarded: alreadyOnboarded,
        profile_complete: !!profile,
      },
      alreadyOnboarded && !body.business_context ? 200 : 201
    );
  } catch (error: any) {
    console.error("[Onboard API] FULL ERROR:", error?.message || error);
    console.error("[Onboard API] Stack:", error?.stack);
    return handleApiError(error);
  }
}
