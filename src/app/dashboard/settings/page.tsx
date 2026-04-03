import { SettingsView } from "@/components/dashboard/settings/SettingsView";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { DomainRepository } from "@/lib/repositories/domain.repository";
import { AuthService } from "@/lib/services/auth.service";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings | Auricai",
  description: "Manage your workspace, brand, team, and billing.",
};

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await AuthService.getOrgIdForUser(userId);
  if (!orgId) redirect("/onboarding");

  const org = await OrganizationRepository.findById(orgId);
  const domain = await DomainRepository.findByOrg(orgId);
  
  if (!org) redirect("/");

  // We should pass the data via props, avoiding local state anomalies.
  return <SettingsView initialOrg={org} />;
}
