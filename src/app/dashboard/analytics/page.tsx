import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/services/auth.service";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { AnalyticsKPIStrip } from "@/components/dashboard/AnalyticsKPIStrip";
import { UsageOverTimeChart } from "@/components/dashboard/UsageOverTimeChart";
import { TopPerformers } from "@/components/dashboard/TopPerformers";
import { DealIntelligence, SmartInsightBlock } from "@/components/dashboard/DealInsights";
import { RealtimeDashboardBridge } from "@/components/dashboard/RealtimeDashboardBridge";
import { OverviewStripSkeleton, RecentActivitySkeleton } from "@/components/dashboard/SkeletonLoaders";
import { SmartInsightActionCard } from "@/components/dashboard/SmartInsightActionCard";
import { AnalyticsHubSpotSection } from "@/components/dashboard/AnalyticsHubSpotSection";

export const metadata = {
  title: "Analytics | Auricai",
  description: "Understand how your proof impacts revenue.",
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
        <p className="text-sm text-zinc-500">Understand how your proof impacts revenue based on real-time data.</p>
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
  
  const [metrics, insights, activity, usageHistory, topROI, topPipeline, topEngagement] = await Promise.all([
    AnalyticsService.getDashboard(orgId),
    AnalyticsService.getInsights(orgId),
    AnalyticsService.getActivityFeed(orgId, 5),
    AnalyticsService.getUsageHistory(orgId, 7),
    repo.getTopPerformingByROI(orgId, 1),
    repo.getTopPerformingByPipeline(orgId, 1),
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <UsageOverTimeChart data={usageHistory} />
          <SmartInsightBlock insights={insights} />
          <div className="mt-4">
            <h2 className="text-lg font-bold text-white mb-4">Top Performers</h2>
            <TopPerformers 
              topROI={topROI[0]} 
              topPipeline={topPipeline[0]} 
              topEngagement={topEngagement[0]} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <DealIntelligence activities={activity} />
          
          <div className="p-6 bg-[#111111] border border-white/10 rounded-xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <h3 className="text-sm font-semibold text-white mb-4 relative z-10">ROI Efficiency</h3>
             <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                   <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Your Avg ROI</span>
                   <span className="text-sm font-bold text-green-400 font-mono tracking-tight bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">{metrics.avgROI}%</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">B2B Baseline</span>
                   <span className="text-sm font-bold text-zinc-400 font-mono tracking-tight bg-white/5 px-2 py-0.5 rounded border border-white/10">145%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mt-4">
                   <div 
                      className="h-full bg-green-500 transition-all duration-1000 ease-out" 
                      style={{ width: `${Math.min((metrics.avgROI / 400) * 100, 100)}%` }}
                   />
                </div>
                <p className="text-[10px] text-zinc-600 italic">
                  {metrics.avgROI > 145 
                    ? `You are outperforming the industry benchmark by ${(metrics.avgROI / 145).toFixed(1)}x`
                    : "Collect more data to establish your performance baseline."}
                </p>
             </div>
          </div>
        </div>
      </div>

      <AnalyticsHubSpotSection />
    </>
  );
}
