"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, AlertCircle, Sparkles, Search } from "lucide-react";
import { SmartInsight } from "@/types";
import { SmartInsightActionCard } from "./SmartInsightActionCard";

/**
 * SmartInsightBlock
 * 
 * Renders a grid of actionable business insights derived from engagement analytics.
 */
export function SmartInsightBlock({ insights }: { insights: SmartInsight[] }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-4 h-4 text-blue-400 fill-blue-400/20" />
        <h3 className="text-sm font-bold text-white tracking-widest uppercase py-1 px-3 bg-blue-500/10 border border-blue-500/20 rounded-md">Proof Insights</h3>
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
