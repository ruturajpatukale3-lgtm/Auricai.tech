"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, AlertCircle, Sparkles, Search, ArrowUpRight, Clock } from "lucide-react";
import { DashboardMetrics, SmartInsight, ActivityFeedItem } from "@/types";
import { SmartInsightActionCard } from "./SmartInsightActionCard";

/**
 * SmartInsightBlock
 * 
 * Renders a grid of actionable business insights derived from analytics.
 */
export function SmartInsightBlock({ insights }: { insights: SmartInsight[] }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-4 h-4 text-blue-400 fill-blue-400/20" />
        <h3 className="text-sm font-bold text-white tracking-widest uppercase py-1 px-3 bg-blue-500/10 border border-blue-500/20 rounded-md">Smart Insights</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, i) => (
            <motion.div
              key={insight.title}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.1 }}
              className={`relative overflow-hidden p-6 border rounded-xl group hover:-translate-y-1 transition-all duration-300 ${
                insight.type === 'opportunity' ? 'bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border-blue-500/20 hover:border-blue-500/40' :
                insight.type === 'warning' ? 'bg-gradient-to-br from-red-600/10 to-orange-600/10 border-red-500/20 hover:border-red-500/40 shadow-[0_10px_40px_rgba(239,68,68,0.05)]' :
                'bg-gradient-to-br from-green-600/10 to-emerald-600/10 border-green-500/20 hover:border-green-500/40 shadow-[0_10px_40_rgba(16,185,129,0.05)]'
              }`}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-white/5 border border-white/10 ${
                    insight.type === 'opportunity' ? 'text-blue-400' :
                    insight.type === 'warning' ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {insight.type === 'opportunity' ? <Search className="w-4 h-4" /> :
                     insight.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                     <TrendingUp className="w-4 h-4" />}
                  </div>
                  <span className={`text-[11px] font-mono font-bold tracking-tight px-2 py-0.5 rounded ${
                    insight.type === 'opportunity' ? 'text-blue-300 bg-blue-500/10' :
                    insight.type === 'warning' ? 'text-red-300 bg-red-500/10' : 'text-emerald-300 bg-emerald-500/10'
                  }`}>
                    {insight.value}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-1.5 tracking-tight group-hover:text-blue-100 transition-colors uppercase tracking-wider">{insight.title}</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-6 line-clamp-2 italic">
                  &quot;{insight.description}&quot;
                </p>

                <SmartInsightActionCard insight={insight} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * DealIntelligence
 * 
 * A dense activity feed specialized for revenue influence tracking.
 */
export function DealIntelligence({ activities }: { activities: ActivityFeedItem[] }) {
  if (!activities || activities.length === 0) return null;

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Revenue Audit</h3>
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="space-y-6">
        {activities.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-4 group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-blue-500/30 transition-colors">
              <Clock className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white font-medium leading-normal mb-1 line-clamp-2">
                {item.message}
              </p>
              <div className="flex items-center gap-2">
                 <span className="text-[9px] text-zinc-600 font-mono tracking-tighter">
                   {new Date(item.created_at).toLocaleDateString("en-US", {
                     month: "2-digit",
                     day: "2-digit",
                     year: "numeric",
                   })}
                 </span>
                 {item.deal_value && (
                   <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">
                     +${(Number(item.deal_value) / 1000).toFixed(0)}k Influence
                   </span>
                 )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * DealInsights (Legacy wrapper for compatibility)
 */
export function DealInsights({ metrics }: { metrics: DashboardMetrics }) {
  // This is now purely data-driven logic to map metrics to SmartInsight[]
  const insights: SmartInsight[] = [];
  
  if (metrics.stalledInterviews > 0) {
    insights.push({
      type: "warning",
      title: "Pipeline Stalled",
      description: `Detected ${metrics.stalledInterviews} prospect interviews stalled >24h.`,
      value: `$${(metrics.pipelineAtRisk / 1000).toFixed(0)}K at risk`,
      action: "Send Reminders"
    });
  }

  if (metrics.conversionRate > 60) {
    insights.push({
      type: "achievement",
      title: "Velocity Milestone",
      description: "Response rates are in the top 5%. Premium proof is attracting faster buy-in.",
      value: `${metrics.conversionRate}% Conv Rate`,
    });
  }

  return <SmartInsightBlock insights={insights} />;
}
