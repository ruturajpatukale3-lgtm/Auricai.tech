"use client";

import { motion } from "framer-motion";

interface FunnelStep {
  label: string;
  value: number;
  max: number;
  lost: number;
  reason: string;
}

/**
 * FunnelVisual Component (Pure Render Layer)
 * 
 * Replaced internal useEffect/useState with a strict prop-driven architecture.
 * This ensures the component is 100% backend-driven and supports RSC hydration.
 */
export function FunnelVisual({ data }: { data: FunnelStep[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-[#111111] border border-white/10 rounded-xl p-6 h-[250px] flex items-center justify-center">
        <p className="text-zinc-500 text-sm italic">No funnel data available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-6 mb-8 hover:-translate-y-[2px] transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:border-white/20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-white font-semibold text-base mb-1">Interview Funnel</h3>
          <p className="text-xs text-zinc-500">Track conversion & identify response blockers</p>
        </div>
      </div>

      <div className="space-y-6">
        {data.map((step, i) => {
          const percentage = step.max > 0 ? Math.round((step.value / step.max) * 100) : 0;
          return (
            <div key={i} className="relative group">
              <div className="flex justify-between items-end mb-1.5 font-medium">
                <span className="text-zinc-300 text-sm group-hover:text-white transition-colors">
                  {step.label}
                </span>
                <div className="flex items-center gap-3">
                  {step.lost < 0 && (
                    <span className="text-red-400 text-xs bg-red-500/10 px-2 py-0.5 rounded flex items-center gap-1 group relative cursor-help">
                      {step.lost} lost
                      
                      {/* Tooltip */}
                      <span className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-[#1A1A1A] border border-red-500/20 rounded shadow-xl text-[10px] text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {step.reason}
                      </span>
                    </span>
                  )}
                  <span className="text-white font-mono text-base">{step.value}</span>
                  <span className="text-zinc-500 text-xs w-8 text-right">({percentage}%)</span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FunnelVisualSkeleton() {
  return (
    <div className="w-full bg-[#111111] border border-white/10 rounded-xl p-6 mb-8 animate-pulse">
      <div className="h-6 w-32 bg-white/5 rounded mb-8" />
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="flex justify-between mb-2">
              <div className="h-4 w-20 bg-white/5 rounded" />
              <div className="h-4 w-12 bg-white/5 rounded" />
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
