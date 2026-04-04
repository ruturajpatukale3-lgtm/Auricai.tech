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
      title: "Total Engagement",
      value: formatValue(metrics.totalUsage, 'number'),
      trend: isEmpty ? "Unlock insights" : "Views & Shares",
      icon: FileStack,
      color: "text-blue-400",
      bgHover: "hover:bg-blue-500/5",
    },
    {
      title: "Unique Visitors",
      value: formatValue(metrics.uniqueVisitors, 'number'),
      trend: isEmpty ? "Waiting for traffic" : "Total unique reach",
      icon: TrendingUp,
      color: "text-emerald-400",
      bgHover: "hover:bg-emerald-500/5",
    },
    {
      title: "Completion Rate",
      value: formatValue(metrics.conversionRate, 'percent'),
      trend: isEmpty ? "Send first interview" : "Interview to Case Study",
      icon: Target,
      color: "text-purple-400",
      bgHover: "hover:bg-purple-500/5",
    },
    {
      title: "Case Studies Live",
      value: formatValue(metrics.caseStudiesLive, 'number'),
      trend: isEmpty ? "Collect more proof" : "Publicly verifiable stories",
      icon: DollarSign,
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
