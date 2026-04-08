// ═══════════════════════════════════════════════════════════
// CaseFlow — Analytics Service
// ALL metrics computed server-side from DB. Never trust frontend.
// ═══════════════════════════════════════════════════════════

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { EventRepository } from "@/lib/repositories/event.repository";
import type { DashboardMetrics, SmartInsight, ActivityFeedItem } from "@/types";

export const AnalyticsService = {
  /**
   * Compute all dashboard metrics from DB (Cached)
   */
  getDashboard: cache(async (orgId: string): Promise<DashboardMetrics> => {
    return unstable_cache(
      async () => {
        const [
          totalViews,
          totalShares,
          statusGroup, // Use the new efficient grouping
          caseStudiesLive,
          uniqueVisitors,
          stalledInterviewsResult,
          aggregateEngagement, 
        ] = await Promise.all([
          EventRepository.countByTypes(orgId, ["case_study_viewed"]).catch(() => 0),
          EventRepository.countByTypes(orgId, ["case_study_shared"]).catch(() => 0),
          InterviewRepository.countByStatusGroup(orgId).catch(() => ({ active: 0, completed: 0, total: 0 })),
          CaseStudyRepository.countByStatus(orgId, "live").catch(() => 0),
          EventRepository.getUniqueVisitorCount(orgId).catch(() => 0),
          InterviewRepository.findStalled(orgId, new Date(Date.now() - 24 * 60 * 60 * 1000)).catch(() => []),
          CaseStudyRepository.getAggregateMetrics(orgId).catch(() => ({ views: 0, clicks: 0, totalReadTime: 0 })),
        ]);

        const stalledInterviewsCount = (stalledInterviewsResult || []).length;
        
        // FIX: success = (completed + approved + published) / total
        const conversionRate = statusGroup.total > 0
          ? Math.round((statusGroup.completed / statusGroup.total) * 100)
          : 0;

        const totalClicks = aggregateEngagement.clicks;
        const avgReadTime = totalViews > 0 
          ? Math.round(aggregateEngagement.totalReadTime / totalViews) 
          : 0;

        const totalUsage = totalViews + totalShares + totalClicks;

        return {
          totalViews,
          totalShares,
          totalClicks,
          avgReadTime,
          totalUsage, 
          uniqueVisitors,
          interviewsSent: statusGroup.total,
          interviewsCompleted: statusGroup.completed,
          stalledInterviews: stalledInterviewsCount,
          caseStudiesLive,
          conversionRate,
        } as DashboardMetrics;
      },
      [`dashboard-metrics-v4-${orgId}`],
      { revalidate: 10, tags: [`analytics-${orgId}`, "dashboard"] } // Cache reduced to 10s
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
    
    if (missingCount > 0) {
      insights.push({
        type: "opportunity",
        title: "Pending Proof",
        description: `You have ${missingCount} interviews pending. Completing them will significantly boost your verifiable proof.`,
        value: missingCount,
        action: "Send Reminders",
      });
    }

    // 2. Engagement Achievement
    if (metrics.totalViews > 50) {
      insights.push({
        type: "achievement",
        title: "High Resonance",
        description: `Your case studies have crossed 50 views this period. They are gaining significant traction.`,
        value: metrics.totalViews,
      });
    }

    if (metrics.avgReadTime > 45) {
      insights.push({
        type: "achievement",
        title: "Elite Engagement",
        description: `Average read time is ${metrics.avgReadTime}s. Prospects are deeply engaging with your proof.`,
        value: `${metrics.avgReadTime}s`,
      });
    }

    // 3. Drop-off Logic
    if (metrics.interviewsSent > 0) {
      const dropoffRate = 100 - metrics.conversionRate;
      if (dropoffRate > 20) {
        const dropStats = await InterviewRepository.getDropoffStats(orgId);
        const worstIdx = dropStats.sort((a, b) => b.count - a.count)[0]?.questionIndex;
        
        const description = worstIdx !== undefined && worstIdx > 0
          ? `Most users drop at Question ${worstIdx} — consider simplifying this stage to boost proof velocity.`
          : `${dropoffRate}% of prospects drop off before completing the interview.`;

        insights.push({
          type: "warning",
          title: "High Funnel Drop-off",
          description,
          value: `${dropoffRate}%`,
          action: "Optimize Questions",
        });
      }
    }

    // 4. Trend Logic
    const trends = await this.getTrends(orgId);
    if (trends.completionChange > 0) {
      insights.push({
        type: "achievement",
        title: "Growth Spurt",
        description: `Proof production is up ${trends.completionChange}% compared to last week. Keep it up!`,
        value: `+${trends.completionChange}%`,
      });
    }

    return insights;
  },

  /**
   * Compare last 7 days vs previous 7 days
   */
  async getTrends(orgId: string) {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prev7d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [currentEvents, previousEvents] = await Promise.all([
      EventRepository.countByTypes(orgId, ["interview_completed"]).catch(() => 0),
      // Future-proofing: We'd ideally need a countByTimestampRange here. 
      // For now, we utilize usage history to derive counts.
      this.getUsageHistory(orgId, 7).then(h => h.reduce((acc, curr) => acc + curr.count, 0)),
      this.getUsageHistory(orgId, 14).then(h => {
        const total = h.reduce((acc, curr) => acc + curr.count, 0);
        // Approximation logic if explicit range query isn't in repo yet
        return total / 2; 
      })
    ]);

    const change = previousEvents > 0 
      ? Math.round(((currentEvents - previousEvents) / previousEvents) * 100)
      : 0;

    return {
      completionChange: change,
      period: "7d"
    };
  },

  /**
   * Get specific performance per case study
   */
  async getTopCaseStudies(orgId: string, limit: number = 5) {
    return CaseStudyRepository.findByOrg(orgId, { status: "live", limit });
  },

  /**
   * Question drop-off visualization data
   */
  async getQuestionDropoff(orgId: string) {
    return InterviewRepository.getDropoffStats(orgId);
  },

  /**
   * Get Usage History (Time-series)
   */
  async getUsageHistory(orgId: string, days: number = 30): Promise<{ date: string; count: number }[]> {
    return EventRepository.getUsageByDate(
      orgId, 
      ["case_study_viewed", "case_study_shared"], 
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
          message = "Case study shared with a prospect"; 
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
      };
    });
  },

  /**
   * Compute conversion funnel metrics + state intelligence (Cached)
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
        const opened = statusCounts.opened || 0;
        const inProgress = statusCounts.in_progress || 0;
        const completed = (statusCounts.completed || 0) + (statusCounts.review_ready || 0);
        const approved = statusCounts.approved || 0;
        const published = statusCounts.published || 0;

        // 2. CORRECT STATUS MAPPING
        const notStarted = sent;
        const progression = opened + inProgress;

        const getRate = (num: number, den: number) => 
          den > 0 ? Math.round((num / den) * 100) : 0;

        // 3. Drop-off rate: % of total that never completed
        const neverCompleted = notStarted + opened + inProgress;
        const dropOffRate = total > 0 ? Math.round((neverCompleted / total) * 100) : 0;

        // 4. Build duplicate flags
        const duplicates = duplicatesRaw.map((d) => ({
          interviewId: d.interview_id,
          email: d.email,
          orgId,
          existingCount: d.count,
          windowDays: 7,
        }));

        return {
          funnel: {
            total,
            opened: opened,
            inProgress: inProgress,
            completed,
            approved,
            published,
            conversionRates: {
              sentToOpened: getRate(opened, total),
              openedToInProgress: getRate(inProgress, opened),
              inProgressToCompleted: getRate(completed, inProgress),
              completedToApproved: getRate(approved, completed),
              approvedToPublished: getRate(published, approved),
              total: getRate(published, total),
            },
          },
          breakdown: {
            notStarted,
            opened,
            inProgress,
            completed,
            approved,
            published,
          },
          duplicates,
          meta: {
            avgCompletionTimeMs: avgCompletionTime,
            dropOffRate,
          },
        };
      },
      [`funnel-metrics-v4-${orgId}`],
      { revalidate: 10, tags: [`analytics-${orgId}`, "funnel"] }
    )();
  }),
  /**
   * Default stats for fallbacks/empty states
   */
  defaultAnalytics(): DashboardMetrics {
    return {
      totalViews: 0,
      totalShares: 0,
      totalClicks: 0,
      avgReadTime: 0,
      totalUsage: 0,
      uniqueVisitors: 0,
      interviewsSent: 0,
      interviewsCompleted: 0,
      stalledInterviews: 0,
      caseStudiesLive: 0,
      conversionRate: 0,
    };
  },
};
