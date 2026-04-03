"use server";

import { revalidateTag } from "next/cache";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { DomainService } from "@/lib/services/domain.service";
import { EventService } from "@/lib/services/event.service";
import { auth } from "@clerk/nextjs/server";

async function getOrgId() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");
  return orgId;
}

export async function updateGeneralSettings(formData: FormData) {
  const orgId = await getOrgId();
  const name = formData.get("name") as string;
  // const industry = formData.get("industry") as string;
  
  await OrganizationRepository.update(orgId, { name });
  
  await EventService.track({
    orgId,
    type: "settings_updated" as any,
    metadata: { name }
  });

  // @ts-ignore
  revalidateTag(`org-${orgId}`);
  // @ts-ignore
  revalidateTag(`analytics-${orgId}`);
  return { success: true };
}

export async function updateBrandingSettings(formData: FormData) {
  const orgId = await getOrgId();
  const primaryColor = formData.get("primaryColor") as string;
  const accentColor = formData.get("accentColor") as string; // if we added accent to db
  
  await OrganizationRepository.update(orgId, { brand_color: primaryColor });
  
  await EventService.track({
    orgId,
    type: "branding_updated" as any,
    metadata: { primaryColor }
  });

  // @ts-ignore
  revalidateTag(`org-${orgId}`);
  return { success: true };
}

export async function addCustomDomain(formData: FormData) {
  const orgId = await getOrgId();
  const domain = formData.get("domain") as string;
  
  await DomainService.add(orgId, domain);
  
  // @ts-ignore
  revalidateTag(`org-${orgId}`);
  return { success: true };
}

export async function verifyCustomDomain() {
  const orgId = await getOrgId();
  
  await DomainService.verify(orgId);
  
  // @ts-ignore
  revalidateTag(`org-${orgId}`);
  return { success: true };
}
