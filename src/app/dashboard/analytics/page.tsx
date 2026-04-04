import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/services/auth.service";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { AnalyticsKPIStrip } from "@/components/dashboard/AnalyticsKPIStrip";
import { UsageOverTimeChart } from "@/components/dashboard/UsageOverTimeChart";
import { TopPerformers } from "@/components/dashboard/TopPerformers";
import { SmartInsightBlock } from "@/components/dashboard/SmartInsights";
import { RealtimeDashboardBridge } from "@/components/dashboard/RealtimeDashboardBridge";
import { OverviewStripSkeleton } from "@/components/dashboard/SkeletonLoaders";
import { SmartInsightActionCard } from "@/components/dashboard/SmartInsightActionCard";

export const metadata = {
  title: "Analytics | Auricai",
  description: "Understand how your proof performs and engages prospects.",
};

export default async function AnalyticsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await AuthService.getOrgIdForUser(userId);
  if (!orgId) redirect("/onboarding");

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
      <RealtimeDashboardBridge orgId={orgId} />
      
      {/* 1. Page Header */}
      <div className="mb-8 mt-2">
        <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Analytics</h1>
        <p className="text-sm text-zinc-500">Understand how your proof is performing based on real-time engagement data.</p>
      </div>

      {/* 2. Main Analytics Content (Suspense Bound) */}
      <Suspense fallback={<OverviewStripSkeleton />}>
        <AnalyticsContent orgId={orgId} />
      </Suspense>
    </div>
  );
}

// ─── Data Components (RSC) ──────────────────────────────────

async function AnalyticsContent({ orgId }: { orgId: string }) {
  const repo = await import("@/lib/repositories/case-study.repository").then(m => m.CaseStudyRepository);
  
  const [metrics, insights, activity, usageHistory, topEngagement] = await Promise.all([
    AnalyticsService.getDashboard(orgId),
    AnalyticsService.getInsights(orgId),
    AnalyticsService.getActivityFeed(orgId, 5),
    AnalyticsService.getUsageHistory(orgId, 7),
    repo.getTopPerformingByEngagement(orgId, 1),
  ]);

  const opportunity = insights.find(i => i.type === "opportunity");

  return (
    <>
      {/* Actionable Insight Alert */}
      {opportunity && (
        <div className="mb-8 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-blue-500/20 transition-colors duration-700" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
               <span className="flex h-2 w-2 relative">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
               </span>
               <h2 className="text-sm font-bold text-white uppercase tracking-wider">{opportunity.title}</h2>
            </div>
            <p className="text-base text-zinc-300">
              {opportunity.description}
            </p>
          </div>
          <SmartInsightActionCard insight={opportunity} />
        </div>
      )}

      {/* KPI Strip */}
      <AnalyticsKPIStrip metrics={metrics} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="flex flex-col gap-6">
          <UsageOverTimeChart data={usageHistory} />
          <SmartInsightBlock insights={insights} />
          <div className="mt-4">
            <h2 className="text-lg font-bold text-white mb-4">Top Performers</h2>
            <TopPerformers 
              topEngagement={topEngagement[0]} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Activity Feed</h2>
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-zinc-300">{item.message}</p>
                    <p className="text-[10px] text-zinc-600 uppercase font-mono mt-0.5">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
