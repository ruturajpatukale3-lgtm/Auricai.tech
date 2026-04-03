"use client";

import { motion } from "framer-motion";
import { Clock, Percent, AlertTriangle } from "lucide-react";

export function ResponseInsights() {
  const insights = [
    {
      label: "Avg Completion Time",
      value: "3m 14s",
      trend: "-12s",
      icon: Clock,
      trendColor: "text-green-400",
    },
    {
      label: "Response Rate",
      value: "66.6%",
      trend: "+4.2%",
      icon: Percent,
      trendColor: "text-green-400",
    },
    {
      label: "Main Drop-off Point",
      value: "Q4 (Metrics)",
      trend: "22% drop",
      icon: AlertTriangle,
      trendColor: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {insights.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 + 0.2 }}
          className="bg-[#111111] border border-white/10 rounded-xl p-5 hover:-translate-y-[2px] hover:border-white/20 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-zinc-400">{card.label}</span>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
              <card.icon className="w-4 h-4 text-zinc-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {card.value}
            </span>
            <span className={`text-xs font-semibold ${card.trendColor}`}>
              {card.trend}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
