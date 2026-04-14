import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/services/auth.service";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { RealtimeDashboardBridge } from "@/components/dashboard/RealtimeDashboardBridge";
import {
  SystemStatusBlock,
  SystemPerformanceBlock,
  PipelineHealthBlock,
  RiskAlertsBlock,
  LatestResultBlock,
} from "@/components/dashboard/CommandCenterBlocks";

export const metadata = {
  title: "Command Center | Auricai",
  description: "Live monitoring layer for your proof-driven system.",
};

export default async function CommandCenterPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await AuthService.getOrgIdForUser(userId);
  if (!orgId) redirect("/onboarding");

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 animate-in fade-in duration-500 overflow-x-hidden min-w-0">
      {/* 1. Realtime Bridge (Subscription Layer) */}
      <RealtimeDashboardBridge orgId={orgId} />
      
      {/* 2. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 mt-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Command Center</h1>
          <p className="text-sm text-zinc-500">Autonomous system monitoring.</p>
        </div>
      </div>

      {/* 3. The Automation Interface (5 Blocks) */}
      <Suspense fallback={<div className="text-zinc-500">Initializing system...</div>}>
        <CommandCenterBlocks orgId={orgId} />
      </Suspense>
    </div>
  );
}

// ─── Granular Data Components (RSC) ──────────────────────────────────

async function CommandCenterBlocks({ orgId }: { orgId: string }) {
  const [caseStudies, { data: interviews }] = await Promise.all([
    CaseStudyRepository.findByOrg(orgId),
    InterviewRepository.findByOrg(orgId, { limit: 1000 })
  ]);

  // 1. System Status
  const isGenerating = interviews.some(i => i.status === "generating");
  const isProcessing = interviews.some(i => ["opened", "in_progress"].includes(i.status));
  const systemStatus: "generating" | "processing" | "idle" = isGenerating ? "generating" : isProcessing ? "processing" : "idle";

  // 2. System Performance
  const followUps = interviews.filter(i => i.reminder_sent).length;
  // Clients that have some activity and ALSO had a reminder sent
  const engagedAfterFollowUp = interviews.filter(i => i.reminder_sent && i.opened_at !== null).length;
  const responses = interviews.filter(i => ["completed", "generating", "review_ready", "approved", "published"].includes(i.status)).length;
  const generatedStudies = caseStudies.length;

  // 3. Pipeline Health
  const totalSent = interviews.length;
  const totalOpened = interviews.filter(i => i.opened_at !== null).length;
  const totalCompleted = responses;

  let isHealthy = true;
  let dropOffSource = "";
  let dropOffTarget = "";

  if (totalSent > 0 && totalOpened / totalSent <= 0.25) {
    isHealthy = false;
    dropOffSource = "Sent";
    dropOffTarget = "Opened";
  } else if (totalOpened > 0 && totalCompleted / totalOpened <= 0.3) {
    isHealthy = false;
    dropOffSource = "Opened";
    dropOffTarget = "Completed";
  }

  // 4. Risk Alerts
  const cutoff24hMs = Date.now() - 24 * 60 * 60 * 1000;
  const unopenedCount = interviews.filter(i => i.status === "sent" && new Date(i.created_at).getTime() < cutoff24hMs).length;
  const stalledCount = interviews.filter(i => ["opened", "in_progress"].includes(i.status) && i.last_activity && new Date(i.last_activity).getTime() < cutoff24hMs).length;

  // 5. Latest Result
  const latestCaseStudy = caseStudies.length > 0 ? caseStudies[0] : null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <SystemStatusBlock status={systemStatus} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <SystemPerformanceBlock 
          followUps={followUps} 
          engaged={engagedAfterFollowUp} 
          responses={responses} 
          caseStudies={generatedStudies} 
        />
        <PipelineHealthBlock 
          isHealthy={isHealthy} 
          dropOffSource={dropOffSource} 
          dropOffTarget={dropOffTarget} 
        />
      </div>

      {(unopenedCount > 0 || stalledCount > 0) && (
        <RiskAlertsBlock unopenedCount={unopenedCount} stalledCount={stalledCount} />
      )}

      {latestCaseStudy && (
        <LatestResultBlock caseStudy={latestCaseStudy} />
      )}
    </div>
  );
}
