import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { CheckoutSuccessHandler } from "@/components/dashboard/CheckoutSuccessHandler";
import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user has an organization
  const { AuthService } = await import("@/lib/services/auth.service");

  const orgId = await AuthService.getOrgIdForUser(userId);

  if (!orgId) {
    redirect("/onboarding");
  }

  // Soft-gate business profile (onboarding step 2)
  const { OrgProfileRepository } = await import("@/lib/repositories/org-profile.repository");
  const profile = await OrgProfileRepository.findByOrgId(orgId);
  const isProfileComplete = !!profile;

  return (
    <SubscriptionProvider>
      <CheckoutSuccessHandler />
      <DashboardLayoutClient isProfileComplete={isProfileComplete}>
        {children}
      </DashboardLayoutClient>
      <AssistantPanel />
    </SubscriptionProvider>
  );
}
