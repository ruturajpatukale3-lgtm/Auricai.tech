import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/services/auth.service";
import { DealService } from "@/lib/services/deal.service";
import { DealsTable } from "@/components/dashboard/DealsTable";
import { RealtimeDashboardBridge } from "@/components/dashboard/RealtimeDashboardBridge";
import { TableSkeleton } from "@/components/dashboard/SkeletonLoaders";

export const metadata = {
  title: "Deals | Auricai",
  description: "Track deal attribution and revenue from case studies.",
};

export default async function DealsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await AuthService.getOrgIdForUser(userId);
  if (!orgId) redirect("/onboarding");

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
      <RealtimeDashboardBridge orgId={orgId} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 mt-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
            Deal Pipeline
          </h1>
          <p className="text-sm text-zinc-500">
            Track how case studies influence your revenue.
          </p>
        </div>
      </div>

      {/* Metrics Strip */}
      <Suspense fallback={<DealMetricsSkeleton />}>
        <DealMetricsStrip orgId={orgId} />
      </Suspense>

      {/* Deals Table */}
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <DealDataList orgId={orgId} />
      </Suspense>
    </div>
  );
}

// ─── Data Components (RSC) ──────────────────────────────────

async function DealMetricsStrip({ orgId }: { orgId: string }) {
  const [pipeline, revenue, dealCount] = await Promise.all([
    DealService.getPipelineInfluenced(orgId),
    DealService.getVerifiableRevenue(orgId),
    DealService.getDealsInfluenced(orgId),
  ]);

  const format = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="bg-[#111111] border border-white/5 rounded-xl p-5">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Pipeline Influenced
        </p>
        <p className="text-2xl font-extrabold text-white font-mono tracking-tight">
          {format(pipeline)}
        </p>
      </div>
      <div className="bg-[#111111] border border-white/5 rounded-xl p-5">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Verifiable Revenue
        </p>
        <p className="text-2xl font-extrabold text-green-400 font-mono tracking-tight">
          {format(revenue)}
        </p>
      </div>
      <div className="bg-[#111111] border border-white/5 rounded-xl p-5">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Deals Influenced
        </p>
        <p className="text-2xl font-extrabold text-white font-mono tracking-tight">
          {dealCount}
        </p>
      </div>
    </div>
  );
}

async function DealDataList({ orgId }: { orgId: string }) {
  let internalDeals: any[] = [];
  let externalDeals: any[] = [];

  try {
    const { HubSpotRepository } = await import("@/lib/repositories/hubspot.repository");
    const results = await Promise.allSettled([
      DealService.getByOrg(orgId, { limit: 50 }),
      HubSpotRepository.getExternalDeals(orgId),
    ]);

    if (results[0].status === "fulfilled") internalDeals = results[0].value || [];
    if (results[1].status === "fulfilled") externalDeals = results[1].value || [];
  } catch (err) {
    console.error("[DealDataList] Critical error fetching deals:", err);
    return (
      <div className="p-8 bg-[#111] border border-red-500/10 rounded-xl text-center">
        <p className="text-sm text-red-400">Failed to load deals. Please try again later.</p>
      </div>
    );
  }

  const mappedExternalDeals = externalDeals.map(ed => ({
    id: `ext_${ed.external_id}`,
    name: ed.name,
    value: ed.amount,
    status: (ed.stage === "closedwon" ? "closed_won" : ed.stage === "closedlost" ? "closed_lost" : "open") as any,
    created_at: ed.last_synced_at,
    source: "hubspot" as const
  }));

  const allDeals = [
    ...internalDeals.map(d => ({ ...d, source: "internal" as const })),
    ...mappedExternalDeals
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return <DealsTable data={allDeals as any} />;
}

function DealMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-[#111111] border border-white/5 rounded-xl p-5 animate-pulse"
        >
          <div className="h-3 w-24 bg-white/5 rounded mb-3" />
          <div className="h-7 w-20 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  );
}
