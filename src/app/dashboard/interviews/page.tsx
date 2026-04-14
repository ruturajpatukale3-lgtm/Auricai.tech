import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/services/auth.service";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { InterviewList } from "@/components/dashboard/InterviewList";
import { AlertCircle } from "lucide-react";
import { RealtimeDashboardBridge } from "@/components/dashboard/RealtimeDashboardBridge";
import { TableSkeleton } from "@/components/dashboard/SkeletonLoaders";
import { InterviewPageActions } from "@/components/dashboard/InterviewPageActions";

export const metadata = {
  title: "Interviews | Auricai",
  description: "Manage your client social proof progress.",
};

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await AuthService.getOrgIdForUser(userId);
  if (!orgId) redirect("/onboarding");

  const currentPage = Number(page) || 1;
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 animate-in fade-in duration-500 overflow-x-hidden min-w-0">
      <RealtimeDashboardBridge orgId={orgId} />
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 mt-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Interviews</h1>
          <p className="text-sm text-zinc-500">Automate your client proof extraction progress.</p>
        </div>
        
        <InterviewPageActions isVisible={true} />
      </div>

      {/* 4. Alerts Sector (Suspense) */}
      <Suspense fallback={null}>
        <InterviewAlerts orgId={orgId} />
      </Suspense>

      {/* 5. Interview List (Suspense with Skeleton) */}
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <InterviewDataList 
          orgId={orgId} 
          limit={limit} 
          offset={offset} 
        />
      </Suspense>
    </div>
  );
}

// ─── Data Components (RSC) ──────────────────────────────────

async function InterviewAlerts({ orgId }: { orgId: string }) {
  const [stalledCount, waitingCount] = await Promise.all([
    InterviewRepository.countStalled(orgId, new Date(Date.now() - 24 * 60 * 60 * 10 * 1000)),
    InterviewRepository.countWaitingApproval(orgId)
  ]);

  if (stalledCount === 0 && waitingCount === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {stalledCount > 0 && (
        <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-500">{stalledCount} Stalled Interviews</p>
            <p className="text-xs text-amber-500/70">Clients waiting for &gt;24h. Send a reminder?</p>
          </div>
        </div>
      )}
      {waitingCount > 0 && (
        <div className="flex items-center gap-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-500">{waitingCount} Pending Approvals</p>
            <p className="text-xs text-blue-500/70">Ready to be converted into case studies.</p>
          </div>
        </div>
      )}
    </div>
  );
}

async function InterviewDataList({ orgId, limit, offset }: { 
  orgId: string; 
  limit: number; 
  offset: number;
}) {
  const { data, count: totalCount } = await InterviewRepository.findByOrg(orgId, { limit, offset });

  return (
    <InterviewList 
      data={data} 
      totalCount={totalCount}
    />
  );
}
