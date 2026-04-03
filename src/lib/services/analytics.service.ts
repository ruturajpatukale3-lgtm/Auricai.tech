// ═══════════════════════════════════════════════════════════
// CaseFlow — Analytics Service
// ALL metrics computed server-side from DB. Never trust frontend.
// ═══════════════════════════════════════════════════════════

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { EventRepository } from "@/lib/repositories/event.repository";
import { UsageRepository } from "@/lib/repositories/usage.repository";
import { DealService } from "@/lib/services/deal.service";
import type { DashboardMetrics, SmartInsight, ActivityFeedItem } from "@/types";

export const AnalyticsService = {
  /**
   * Compute all dashboard metrics from DB (Cached)
   */
  getDashboard: cache(async (orgId: string): Promise<DashboardMetrics> => {
    return unstable_cache(
      async () => {
        const [
          dealPipeline,
          dealRevenue,
          dealCount,
          avgROIResult,
          totalViews,
          totalShares,
          usedInDeals,
          interviewsSent,
          interviewsCompleted,
          caseStudiesLive,
          uniqueVisitors,
          stalledInterviewsResult,
        ] = await Promise.all([
          DealService.getPipelineInfluenced(orgId).catch(() => 0),
          DealService.getVerifiableRevenue(orgId).catch(() => 0),
          DealService.getDealsInfluenced(orgId).catch(() => 0),
          CaseStudyRepository.avgDeltaPercent(orgId).catch(() => 0),
          EventRepository.countByTypes(orgId, ["case_study_viewed"]).catch(() => 0),
          EventRepository.countByTypes(orgId, ["case_study_shared"]).catch(() => 0),
          EventRepository.countByTypes(orgId, ["used_in_deal", "deal_attributed"]).catch(() => 0),
          InterviewRepository.countByOrg(orgId).catch(() => 0),
          InterviewRepository.countByStatus(orgId, "completed").catch(() => 0),
          CaseStudyRepository.countByStatus(orgId, "live").catch(() => 0),
          EventRepository.getUniqueVisitorCount(orgId).catch(() => 0),
          InterviewRepository.findStalled(orgId, new Date(Date.now() - 24 * 60 * 60 * 1000)).catch(() => []),
        ]);

        // Strict Backend-Authoritative Source: Deals + Deal Attributions
        const totalPipeline = dealPipeline || 0;
        const verifiableRevenue = dealRevenue || 0;
        const avgROI = avgROIResult || 0;
        const totalDeals = dealCount || 0;
        const stalledInterviewsCount = (stalledInterviewsResult || []).length;
        
        const avgPipelinePerStudy = caseStudiesLive > 0 ? totalPipeline / caseStudiesLive : 0;
        const pipelineAtRisk = stalledInterviewsCount * avgPipelinePerStudy;

        const conversionRate = interviewsSent > 0
          ? Math.round((interviewsCompleted / interviewsSent) * 100)
          : 0;

        const totalUsage = totalViews + totalShares + usedInDeals;

        return {
          totalPipeline,
          verifiableRevenue,
          avgROI,
          totalDeals,
          totalViews,
          totalShares,
          totalUsage, 
          uniqueVisitors,
          interviewsSent,
          interviewsCompleted,
          stalledInterviews: stalledInterviewsCount,
          pipelineAtRisk,
          caseStudiesLive,
          conversionRate,
        } as DashboardMetrics;
      },
      [`dashboard-metrics-${orgId}`],
      { revalidate: 60, tags: [`analytics-${orgId}`, "dashboard"] }
    )();
  }),

  /**
   * Performance analytics for visitors
   */
  async getVisitorStatsByDay(orgId: string, days: number = 30) {
    return EventRepository.getUniqueVisitorCount(orgId, days);
  },

  /**
   * Generate smart insights from data
   */
  async getInsights(orgId: string): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];
    const metrics = await this.getDashboard(orgId);
    
    // 1. Opportunity Logic
    const missingCount = metrics.interviewsSent - metrics.interviewsCompleted;
    const avgPipeline = metrics.caseStudiesLive > 0 
      ? metrics.totalPipeline / metrics.caseStudiesLive 
      : 0;
    
    if (missingCount > 0 && avgPipeline > 0) {
      const opportunity = missingCount * avgPipeline;
      insights.push({
        type: "opportunity",
        title: "Untapped Revenue",
        description: `You have ${missingCount} interviews pending. Completing them could unlock an estimated $${this.formatCurrency(opportunity)} in pipeline.`,
        value: `$${this.formatCurrency(opportunity)}`,
        action: "Send Reminders",
      });
    }

    // 2. ROI Performance Comparison (Strict execution layer)
    const usageData = await EventRepository.getROIBasedUsage(orgId);
    if (usageData.highROIUsage > 0 && usageData.lowROIUsage > 0) {
      const ratio = (usageData.highROIUsage / usageData.lowROIUsage).toFixed(1);
      insights.push({
        type: "achievement",
        title: "ROI Velocity",
        description: `High ROI case studies (>200%) are viewed and shared ${ratio}x more frequently than lower performing benchmarks.`,
        value: `${ratio}x`,
      });
    } else if (usageData.highROIUsage > 0) {
       insights.push({
        type: "achievement",
        title: "Proof Resonance",
        description: `Your high-ROI stories are generating most of your engagement. Consider doubling down on similar case studies.`,
        value: "High",
      });
    }

    // 3. Drop-off Logic
    if (metrics.interviewsSent > 0) {
      const dropoffRate = 100 - metrics.conversionRate;
      if (dropoffRate > 20) {
        insights.push({
          type: "warning",
          title: "High Funnel Drop-off",
          description: `${dropoffRate}% of prospects drop off before completing the interview.`,
          value: `${dropoffRate}%`,
          action: "Optimize Questions",
        });
      }
    }

    return insights;
  },

  /**
   * Get Usage History (Time-series)
   */
  async getUsageHistory(orgId: string, days: number = 30): Promise<{ date: string; count: number }[]> {
    return EventRepository.getUsageByDate(
      orgId, 
      ["case_study_viewed", "case_study_shared", "used_in_deal"], 
      days
    );
  },

  /**
   * Get recent activity feed (Strict Source of Truth: Events Table)
   */
  async getActivityFeed(orgId: string, limit: number = 20): Promise<ActivityFeedItem[]> {
    const events = await EventRepository.findByOrg(orgId, { limit });
    
    // Map internal event types to human-readable activity items
    return events.map((e) => {
      let message = "System action logged";
      
      switch (e.type) {
        case "interview_sent": 
          message = `Interview sent to ${e.metadata?.client_email || "prospect"}`; 
          break;
        case "interview_opened":
          message = `Prospect opened the interview link`;
          break;
        case "interview_started": 
          message = "Prospect started the interview"; 
          break;
        case "interview_completed": 
          message = "Interview completed — ready for case study generation"; 
          break;
        case "ai_generation_failed":
          message = "AI generation failed due to vague answers";
          break;
        case "case_study_created": 
          message = `Draft created for ${e.metadata?.company_name || "client"}`; 
          break;
        case "case_study_published": 
          message = `New case study live: ${e.metadata?.company_name || ""}`; 
          break;
        case "case_study_viewed": 
          message = "Case study viewed by a prospect"; 
          break;
        case "case_study_shared": 
          message = "Case study shared in a Winning Deal!"; 
          break;
        case "used_in_deal": 
          message = `Case study helped close a $${this.formatCurrency(Number(e.metadata?.deal_value || 0))} deal!`; 
          break;
        case "deal_created":
          message = `New deal created: ${e.metadata?.deal_name || "Deal"} ($${this.formatCurrency(Number(e.metadata?.deal_value || 0))})`;
          break;
        case "deal_attributed":
          message = `Case study linked to deal: ${e.metadata?.deal_name || "Deal"} ($${this.formatCurrency(Number(e.metadata?.deal_value || 0))})`;
          break;
        case "deal_status_changed":
          message = `Deal "${e.metadata?.deal_name || ""}" status changed to ${String(e.metadata?.new_status || "").replace("_", " ")}`;
          break;
        case "reminder_sent":
          message = `24h reminder sent to ${e.metadata?.client_email || "prospect"}`;
          break;
      }

      return {
        id: e.id,
        type: e.type,
        message,
        created_at: e.created_at,
        deal_value: (e.metadata?.deal_value as number) ?? null,
      };
    });
  },

  /**
   * Compute conversion funnel metrics + state intelligence (Cached)
   * 
   * CRITICAL: Funnel = progression clarity, Breakdown = state intelligence
   * These are NEVER mixed together.
   */
  getFunnelMetrics: cache(async (orgId: string) => {
    return unstable_cache(
      async () => {
        // 1. Single batch: get all status counts + total
        const [statusCounts, total, duplicatesRaw, avgCompletionTime] = await Promise.all([
          InterviewRepository.getFullStatusCounts(orgId),
          InterviewRepository.countByOrg(orgId),
          InterviewRepository.findPotentialDuplicates(orgId, 7).catch(() => []),
          InterviewRepository.getAvgCompletionTime(orgId).catch(() => null),
        ]);

        const sent = statusCounts.sent || 0;
        const inProgress = statusCounts.in_progress || 0;
        const completed = statusCounts.completed || 0;
        const approved = statusCounts.approved || 0;
        const published = statusCounts.published || 0;

        // 2. CORRECT STATUS MAPPING
        // notStarted = interviews with status='sent' (never opened/started)
        // inProgress = interviews with status='in_progress' (opened and started)
        const notStarted = sent; // DB status 'sent' means no activity yet

        const getRate = (num: number, den: number) => 
          den > 0 ? Math.round((num / den) * 100) : 0;

        // 3. Drop-off rate: % of total that never completed
        const neverCompleted = notStarted + inProgress;
        const dropOffRate = total > 0 ? Math.round((neverCompleted / total) * 100) : 0;

        // 4. Build duplicate flags (informational only)
        const duplicates = duplicatesRaw.map((d) => ({
          interviewId: d.interview_id,
          email: d.email,
          orgId,
          existingCount: d.count,
          windowDays: 7,
        }));

        return {
          // FUNNEL: progression clarity — "how many reached this stage"
          funnel: {
            total,
            opened: inProgress,
            completed,
            approved,
            published,
            conversionRates: {
              sentToOpened: getRate(inProgress, total),
              openedToCompleted: getRate(completed, inProgress),
              completedToApproved: getRate(approved, completed),
              approvedToPublished: getRate(published, approved),
              total: getRate(published, total),
            },
          },
          // BREAKDOWN: state intelligence — "what are all possible states"
          breakdown: {
            notStarted,
            inProgress,
            completed,
            approved,
            published,
          },
          // DUPLICATES: informational only
          duplicates,
          // META: decision intelligence
          meta: {
            avgCompletionTimeMs: avgCompletionTime,
            dropOffRate,
          },
        };
      },
      [`funnel-metrics-v2-${orgId}`],
      { revalidate: 60, tags: [`analytics-${orgId}`, "funnel"] }
    )();
  }),

  formatCurrency(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toLocaleString();
  },
};
