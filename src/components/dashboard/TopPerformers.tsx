"use client";

import { motion } from "framer-motion";
import { TrendingUp, Award, Zap } from "lucide-react";
import type { CaseStudy } from "@/types";

interface TopPerformersProps {
  topEngagement?: CaseStudy;
}

export function TopPerformers({ topEngagement }: TopPerformersProps) {
  const items = [
    {
      id: "engagement",
      data: topEngagement,
      title: "Trending Story",
      metric: topEngagement ? `${topEngagement.views} Views` : null,
      stat: "Organic Engagement",
      icon: TrendingUp,
      color: "blue",
      highlight: true
    },
  ].filter(item => item.data);

  if (items.length === 0) {
    return (
      <div className="w-full bg-[#111111] border border-white/10 rounded-xl p-8 text-center mt-4">
        <p className="text-zinc-500 text-sm italic">Publish and attribute case studies to see top performers here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8 mt-4">
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`relative overflow-hidden bg-[#111111] border ${item.highlight ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "border-white/10"} rounded-xl p-6 hover:-translate-y-[2px] transition-all duration-300 flex flex-col justify-between group hover:border-white/20`}
        >
          {item.highlight && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />}

          <div className="flex justify-between items-start mb-5 relative z-10">
            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${item.color === "emerald" ? "text-emerald-400" :
                item.color === "blue" ? "text-blue-400" :
                  "text-amber-400"
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.title}
            </span>
          </div>

          <div className="relative z-10 w-full">
            <h4 className="text-white font-semibold text-sm mb-2 opacity-80 truncate">{item.data?.company_name}</h4>
            <div className="flex flex-col gap-1 w-full">
              <span className="text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">{item.metric}</span>
              <span className={`text-xs font-medium w-max px-2 py-0.5 rounded-full ${item.color === "emerald" ? "bg-emerald-500/10 text-emerald-300" :
                  item.color === "blue" ? "bg-blue-500/10 text-blue-300" :
                    "bg-amber-500/10 text-amber-300"
                }`}>
                {item.stat}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
