"use client";

import { motion } from "framer-motion";
import { CheckCircle2, FileCheck, Eye, Clock, Share2, TrendingUp, AlertCircle } from "lucide-react";
import { ActivityFeedItem } from "@/types";

export function RecentActivity({ activities }: { activities: ActivityFeedItem[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-[#111111] rounded-xl border border-white/10 mt-2">
        <Clock className="w-8 h-8 text-white/20 mb-4" />
        <p className="text-sm text-zinc-500">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-6 h-full flex flex-col hover:-translate-y-[2px] transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:border-white/20">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-white font-semibold text-base tracking-tight">Recent Activity</h3>
        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-500/20">Live Audit</span>
      </div>
      <p className="text-xs text-zinc-500 mb-8 font-medium">Verifiable system events across your sales funnel.</p>

      <div className="flex-1 space-y-8 relative">
        {/* Vertical Timeline Line */}
        <div className="absolute left-4 top-2 bottom-8 w-px bg-white/5" />

        {activities.map((item, i) => {
          // Dynamic Icon selection based on EventType
          let Icon = Clock;
          let color = "text-zinc-400";
          let bg = "bg-zinc-400/10 border-zinc-400/20";

          switch (item.type) {
            case "case_study_published":
              Icon = CheckCircle2;
              color = "text-emerald-400";
              bg = "bg-emerald-400/10 border-emerald-400/20";
              break;
            case "interview_completed":
              Icon = FileCheck;
              color = "text-blue-400";
              bg = "bg-blue-400/10 border-blue-400/20";
              break;
            case "case_study_viewed":
              Icon = Eye;
              color = "text-purple-400";
              bg = "bg-purple-400/10 border-purple-400/20";
              break;
            case "case_study_shared":
            case "used_in_deal":
              Icon = Share2;
              color = "text-amber-400";
              bg = "bg-amber-400/10 border-amber-400/20";
              break;
            case "ai_generation_failed":
              Icon = AlertCircle;
              color = "text-red-400";
              bg = "bg-red-400/10 border-red-400/20";
              break;
          }

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-6 relative group"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border transition-all duration-300 group-hover:scale-110 ${bg} ${color}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex flex-col justify-center flex-1">
                <p className="text-sm text-zinc-300 font-medium leading-tight mb-1.5 group-hover:text-white transition-colors">
                  {item.message}
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-[11px] text-zinc-500 font-mono tracking-tight uppercase flex items-center gap-1.5" suppressHydrationWarning>
                    <Clock className="w-3 h-3 text-zinc-600" />
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  
                  {item.deal_value && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-zinc-800" />
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +${(Number(item.deal_value) / 1000).toFixed(0)}K Pipeline
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
