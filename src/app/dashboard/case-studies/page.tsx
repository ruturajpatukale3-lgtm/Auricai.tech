import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/services/auth.service";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { CaseStudiesTable } from "@/components/dashboard/CaseStudiesTable";
import { Plus } from "lucide-react";
import { RealtimeDashboardBridge } from "@/components/dashboard/RealtimeDashboardBridge";
import { TableSkeleton } from "@/components/dashboard/SkeletonLoaders";
import { CaseStudiesPageActions } from "@/components/dashboard/CaseStudiesPageActions";

export const metadata = {
  title: "Case Studies | Auricai",
  description: "Manage and track your proof-driven sales assets.",
};

export default async function CaseStudiesPage({
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
    <div className="w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
      <RealtimeDashboardBridge orgId={orgId} />
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 mt-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Case Studies</h1>
          <p className="text-sm text-zinc-500">Your case studies are generated automatically from client interviews.</p>
        </div>
        
        <CaseStudiesPageActions />
      </div>

      {/* 2. Main List (Suspense with Skeleton) */}
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <CaseStudyDataList orgId={orgId} limit={limit} offset={offset} />
      </Suspense>
    </div>
  );
}

// ─── Data Components (RSC) ──────────────────────────────────

async function CaseStudyDataList({ orgId, limit, offset }: { orgId: string; limit: number; offset: number }) {
  try {
    const studies = await CaseStudyRepository.findByOrg(orgId, { limit, offset });
    const { data: interviews } = await InterviewRepository.findByOrg(orgId, { limit: 50 }); // Fetch recent interviews
    
    const hasCompletedInterviews = interviews.some(
      (i) => i.status === "completed" || i.status === "generating"
    );

    console.log("CASE STUDIES FETCHED:", studies?.length || 0);
    return <CaseStudiesTable data={studies} hasCompletedInterviews={hasCompletedInterviews} />;
  } catch (error) {
    console.error("CASE STUDY FETCH ERROR [RSC:CaseStudyDataList]:", error);
    throw error; // FAIL LOUD — DO NOT SWALLOW
  }
}
