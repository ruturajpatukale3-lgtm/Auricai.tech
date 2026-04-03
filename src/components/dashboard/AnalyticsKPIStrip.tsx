"use client";

import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Target, FileStack } from "lucide-react";
import type { DashboardMetrics } from "@/types";

export function AnalyticsKPIStrip({ metrics }: { metrics: DashboardMetrics }) {
  const isEmpty = metrics.totalUsage === 0 && metrics.caseStudiesLive === 0;

  const formatValue = (val: string | number, type: 'currency' | 'percent' | 'number') => {
    if (isEmpty) return "No data yet";
    
    if (type === 'currency' && typeof val === 'number') {
      if (val === 0) return "No data yet";
      if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
      if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
      return `$${val.toLocaleString()}`;
    }

    if (type === 'percent' && typeof val === 'number') {
      return val > 0 ? `${val}%` : "No data yet";
    }

    if (type === 'number' && typeof val === 'number') {
      return val > 0 ? val.toString() : "No data yet";
    }

    return val.toString();
  };

  const kpis = [
    {
      title: "Pipeline Influenced",
      value: formatValue(metrics.totalPipeline, 'currency'),
      trend: isEmpty ? "Send first interview" : "Total Verifiable Revenue",
      icon: DollarSign,
      color: "text-green-400",
      bgHover: "hover:bg-green-500/5",
    },
    {
      title: "Avg ROI Extracted",
      value: formatValue(metrics.avgROI, 'percent'),
      trend: isEmpty ? "Waiting for proof" : "Across all case studies",
      icon: TrendingUp,
      color: "text-blue-400",
      bgHover: "hover:bg-blue-500/5",
    },
    {
      title: "Deals Influenced",
      value: formatValue(metrics.totalDeals, 'number'),
      trend: isEmpty ? "Collect more proof" : "Closed-won attribution",
      icon: Target,
      color: "text-purple-400",
      bgHover: "hover:bg-purple-500/5",
    },
    {
      title: "Total Engagement",
      value: formatValue(metrics.totalUsage, 'number'),
      trend: isEmpty ? "Unlock insights" : "Views, Shares & Deals",
      icon: FileStack,
      color: "text-zinc-300",
      bgHover: "hover:bg-white/5",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`bg-[#111111] border border-white/10 rounded-xl p-5 hover:-translate-y-[2px] transition-all duration-300 ${kpi.bgHover} shadow-[0_4px_20px_rgba(0,0,0,0.2)]`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">{kpi.title}</h3>
            <div className={`p-2 rounded-lg bg-white/5 ${kpi.color}`}>
              <kpi.icon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div suppressHydrationWarning className={`font-bold font-mono tracking-tight ${kpi.value === "No data yet" ? "text-xl text-zinc-500" : "text-3xl text-white"}`}>
              {kpi.value}
            </div>
            <div className={`text-xs font-semibold mt-2 ${kpi.value === "No data yet" ? "text-zinc-600 italic" : "text-zinc-500"}`}>
              {kpi.trend}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
