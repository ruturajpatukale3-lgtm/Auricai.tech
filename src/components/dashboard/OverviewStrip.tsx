"use client";

import { motion } from "framer-motion";
import { DashboardMetrics } from "@/types";
import Link from "next/link";

export function OverviewStrip({ metrics }: { metrics: DashboardMetrics }) {
  const formatCurrency = (n: number) => {
    if (n === null || n === undefined) return "No data yet";
    if (n === 0) return "$0";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  const hasData = metrics.interviewsSent > 0 || metrics.caseStudiesLive > 0;

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-zinc-900 to-black border border-white/10 rounded-xl p-8 mb-8 flex flex-col items-center justify-center text-center"
      >
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">🌱</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-2">
          Ready to prove your ROI?
        </h2>
        <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
          You don't have any case studies or pipeline data yet. Send your first interview to start extracting verifiable metrics.
        </p>
        <Link href="/dashboard/interviews" className="text-zinc-500 hover:text-white transition-colors text-sm underline underline-offset-4">
          View Interviews
        </Link>
      </motion.div>
    );
  }

  const kpis = [
    { 
      label: "Pipeline Influenced", 
      value: formatCurrency(metrics.totalPipeline), 
      sub: metrics.totalDeals > 0 ? `${metrics.totalDeals} deals tracked` : "No deals yet", 
      highlight: true 
    },
    { 
      label: "Verifiable Revenue", 
      value: formatCurrency(metrics.verifiableRevenue), 
      sub: metrics.verifiableRevenue > 0 ? "Closed won deals" : "Pending closures", 
      highlight: false 
    },
    { 
      label: "Client Response Rate", 
      value: metrics.interviewsSent > 0 ? `${metrics.conversionRate}%` : "No data yet", 
      sub: "Higher = more proof", 
      highlight: false 
    },
    { 
      label: "Avg Proven ROI", 
      value: `${metrics.avgROI}%`, 
      sub: metrics.totalDeals > 0 ? "Validated from clients" : "Waiting for responses", 
      highlight: false 
    },
  ];

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Real-time Revenue Intelligence Active</span>
      </div>

      {/* Revenue Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/20 rounded-xl p-6 mb-6 group hover:-translate-y-[2px] transition-all duration-300 shadow-[0_0_40px_rgba(37,99,235,0.1)]"
      >
        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-1">
              Your case studies are influencing <span suppressHydrationWarning className="text-blue-400">{formatCurrency(metrics.totalPipeline)}</span> in pipeline
            </h2>
            <p className="text-blue-200/60 text-sm italic">
              Used across {metrics.caseStudiesLive} active assets • <span suppressHydrationWarning>{formatCurrency(metrics.verifiableRevenue)}</span> revenue closed
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-[#111111] border ${kpi.highlight ? "border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.1)]" : "border-white/10"} rounded-xl p-5 hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all duration-300 relative overflow-hidden`}
          >
            {kpi.highlight && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />}
            
            <p className="text-sm text-zinc-400 font-medium mb-2 tracking-wide uppercase text-[10px] sm:text-[11px] relative z-10">
              {kpi.label}
            </p>
            <div suppressHydrationWarning className={`text-2xl md:text-3xl font-bold font-mono tracking-tight mb-1 relative z-10 ${kpi.highlight && kpi.value !== "No data yet" ? "text-blue-400" : (kpi.value === "No data yet" ? "text-zinc-500 text-xl" : "text-white")}`}>
              {kpi.value}
            </div>
            <p className="text-xs text-zinc-500 relative z-10">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>
    </>
  );
}
