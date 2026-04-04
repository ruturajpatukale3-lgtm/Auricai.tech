import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner";
import { CheckoutSuccessHandler } from "@/components/dashboard/CheckoutSuccessHandler";

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

  // Usage is now handled by SubscriptionService & Lazy Reset logic

  return (
    <SubscriptionProvider>
      <CheckoutSuccessHandler />
      <div className="flex min-h-screen w-full bg-[#0A0A0A] text-white overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 md:pl-64">
          <Topbar />
          <main className="flex-1 overflow-x-hidden">
            <SubscriptionBanner />
            {!isProfileComplete && (
              <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 md:px-6 py-3 flex items-center justify-between text-yellow-500 text-sm">
                <p className="truncate mr-4">⚠️ Business context missing. AI disabled.</p>
                <a href="/onboarding?step=2" className="underline font-bold shrink-0">Setup</a>
              </div>
            )}
            {/* Main container with max-w-7xl mx-auto px-6 py-8 */}
            <div className="min-w-0">
              {children}
            </div>
          </main>
        </div>
        <AssistantPanel />
      </div>
    </SubscriptionProvider>
  );
}
