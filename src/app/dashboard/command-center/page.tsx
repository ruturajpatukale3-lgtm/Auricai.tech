import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/services/auth.service";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { OverviewStrip } from "@/components/dashboard/OverviewStrip";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RealtimeDashboardBridge } from "@/components/dashboard/RealtimeDashboardBridge";
import { OverviewStripSkeleton, RecentActivitySkeleton } from "@/components/dashboard/SkeletonLoaders";
import { DashboardActions } from "@/components/dashboard/DashboardActions";
import { AlertCircle, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Command Center | Auricai",
  description: "Your proof-driven sales command center.",
};

export default async function CommandCenterPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await AuthService.getOrgIdForUser(userId);
  if (!orgId) redirect("/onboarding");

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 animate-in fade-in duration-500 overflow-x-hidden min-w-0">
      {/* 1. Realtime Bridge (Subscription Layer) */}
      <RealtimeDashboardBridge orgId={orgId} />
      
      {/* 2. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 mt-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Command Center</h1>
          <p className="text-sm text-zinc-500">Your proof-driven sales engine at a glance.</p>
        </div>
        
        <DashboardActions />
      </div>

      {/* 3. Stalled Revenue Alert (Critical Visibility) */}
      <Suspense fallback={null}>
        <DashboardAlerts orgId={orgId} />
      </Suspense>

      {/* 4. Overview Strip Sector (Suspense Bound) */}
      <Suspense fallback={<OverviewStripSkeleton />}>
        <DashboardOverview orgId={orgId} />
      </Suspense>

      {/* 5. Activity & Insights Sector (Suspense Bound) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        <div className="lg:col-span-12">
          <Suspense fallback={<RecentActivitySkeleton />}>
            <DashboardActivity orgId={orgId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// ─── Granular Data Components (RSC) ──────────────────────────────────

async function DashboardOverview({ orgId }: { orgId: string }) {
  const metrics = await AnalyticsService.getDashboard(orgId);
  return <OverviewStrip metrics={metrics} />;
}

async function DashboardActivity({ orgId }: { orgId: string }) {
  const activities = await AnalyticsService.getActivityFeed(orgId, 6);
  return <RecentActivity activities={activities} />;
}

async function DashboardAlerts({ orgId }: { orgId: string }) {
  const metrics = await AnalyticsService.getDashboard(orgId);
  
  if (metrics.stalledInterviews === 0) return null;

  return (
    <div className="mb-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4 text-center md:text-left">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Stalled Proof Recovery</h3>
          <p className="text-xs text-zinc-500">
            You have <span className="text-blue-400 font-bold">{metrics.stalledInterviews} stalling interviews</span> that are delaying your public proof.
          </p>
        </div>
      </div>
      
      <Link 
        href="/dashboard/interviews"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-bold text-blue-400 transition-all hover:gap-3 shrink-0"
      >
        Send Reminders <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
