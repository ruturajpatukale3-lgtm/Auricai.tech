"use client";

import { motion } from "framer-motion";
import { Clock, TrendingDown, Copy } from "lucide-react";
import type { ResponseFlow as ResponseFlowType, DuplicateFlag } from "@/types";

/**
 * ResponseFlow — Decision Intelligence Layer (Zero-Fake)
 * 
 * RULES:
 * - NEVER show numeric 0 or 0%
 * - Zero states show "—" dash placeholder
 * - Visually emphasized as the PRIMARY insight source
 * - Connected to FunnelStrip via scroll anchor
 */

interface ResponseFlowProps {
  breakdown: ResponseFlowType;
  duplicates: DuplicateFlag[];
  meta: {
    avgCompletionTimeMs: number | null;
    dropOffRate: number;
  };
}

const STATE_CONFIG = [
  { key: "notStarted" as const, label: "Not Started", icon: "○", color: "bg-zinc-500", textColor: "text-zinc-400", barGlow: "shadow-zinc-500/20" },
  { key: "inProgress" as const, label: "In Progress", icon: "◐", color: "bg-amber-500", textColor: "text-amber-400", barGlow: "shadow-amber-500/20" },
  { key: "completed" as const, label: "Completed", icon: "●", color: "bg-blue-500", textColor: "text-blue-400", barGlow: "shadow-blue-500/20" },
  { key: "approved" as const, label: "Approved", icon: "✓", color: "bg-green-500", textColor: "text-green-400", barGlow: "shadow-green-500/20" },
  { key: "published" as const, label: "Published", icon: "★", color: "bg-purple-500", textColor: "text-purple-400", barGlow: "shadow-purple-500/20" },
];

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function ResponseFlow({ breakdown, duplicates, meta }: ResponseFlowProps) {
  const total = breakdown.notStarted + breakdown.inProgress + breakdown.completed + breakdown.approved + breakdown.published;
  
  if (total === 0) return null;

  return (
    <motion.div
      id="response-flow"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="w-full bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden scroll-mt-8"
    >
      {/* Header — Emphasized as primary insight source */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">Response Flow</h3>
          <span className="text-[10px] font-mono text-zinc-600 bg-white/5 px-2 py-0.5 rounded border border-white/5">
            {total} total
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Meta: Avg Completion Time */}
          {meta.avgCompletionTimeMs !== null && meta.avgCompletionTimeMs > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <Clock className="w-3 h-3" />
              <span className="font-mono font-bold">{formatDuration(meta.avgCompletionTimeMs)}</span>
              <span className="text-zinc-600">avg</span>
            </div>
          )}
          {/* Meta: Drop-off Rate — never show 0% */}
          {meta.dropOffRate > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <TrendingDown className="w-3 h-3 text-amber-400/60" />
              <span className="font-mono font-bold text-amber-400/80">{meta.dropOffRate}%</span>
              <span className="text-zinc-600">not completed yet</span>
            </div>
          )}
        </div>
      </div>

      {/* State Rows — Zero-Fake Display */}
      <div className="px-6 py-5 space-y-3.5">
        {STATE_CONFIG.map((state, i) => {
          const value = breakdown[state.key];
          const percent = total > 0 ? Math.round((value / total) * 100) : 0;
          const hasValue = value > 0;

          return (
            <motion.div
              key={state.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              className="group flex items-center gap-4"
            >
              {/* State Label */}
              <div className="flex items-center gap-2.5 w-[130px] flex-shrink-0">
                <span className={`text-xs ${hasValue ? state.textColor : "text-zinc-700"}`}>{state.icon}</span>
                <span className={`text-xs font-medium ${hasValue ? state.textColor : "text-zinc-600"}`}>
                  {state.label}
                </span>
              </div>

              {/* Count — NEVER show 0, use dash placeholder */}
              <span className={`text-sm font-bold font-mono w-8 text-right ${hasValue ? "text-white" : "text-zinc-700"}`}>
                {hasValue ? value : "—"}
              </span>

              {/* Progress Bar */}
              <div className="flex-1 h-2 bg-white/[0.03] rounded-full overflow-hidden">
                {hasValue ? (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.6, delay: 0.3 + i * 0.05, ease: "easeOut" }}
                    className={`h-full rounded-full ${state.color} opacity-70 shadow-sm ${state.barGlow}`}
                  />
                ) : (
                  /* Empty bar — subtle pattern instead of blank void */
                  <div className="h-full w-full rounded-full bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,rgba(255,255,255,0.02)_4px,rgba(255,255,255,0.02)_8px)]" />
                )}
              </div>

              {/* Percentage — NEVER show 0% */}
              <span className={`text-[10px] font-mono w-10 text-right ${hasValue ? "text-zinc-400" : "text-zinc-800"}`}>
                {hasValue ? `${percent}%` : "—"}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Duplicate Warning Banner */}
      {duplicates.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="border-t border-white/5 px-6 py-3 flex items-center gap-3 bg-amber-500/5"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-amber-500/70" />
            <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">
              {duplicates.length} potential duplicate{duplicates.length !== 1 ? "s" : ""} flagged
            </span>
          </div>
          <span className="text-[10px] text-zinc-600 ml-auto">
            Same email within 7-day window
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
