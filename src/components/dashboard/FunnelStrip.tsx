"use client";

import { motion } from "framer-motion";
import { ArrowRight, Inbox, Plus, AlertTriangle, ArrowDown } from "lucide-react";
import { useState } from "react";
import { SendInterviewModal } from "@/components/dashboard/SendInterviewModal";
import { useRouter } from "next/navigation";
import type { FunnelStageMetrics } from "@/types";

/**
 * FunnelStrip — Zero-Fake Trust Standard
 * 
 * RULES:
 * - NEVER display numeric 0
 * - If sent === 0: show "No data yet"
 * - If sent > 0 && value === 0: show "Waiting"
 * - If value > 0: show number + conversion rate
 * - Visual link to ResponseFlow for deep insight
 */
export function FunnelStrip({ metrics }: { metrics: FunnelStageMetrics }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const total = metrics?.total || 0;
  const opened = metrics?.opened || 0;
  const inProgress = metrics?.inProgress || 0;
  const completed = metrics?.completed || 0;
  const published = metrics?.published || 0;
  const rates = metrics?.conversionRates;

  const isEmpty = total === 0;

  // Inconsistency Detection
  const isInconsistent = (opened > total) || (inProgress > opened) || (completed > inProgress) || (published > completed);

  // Drop-off between adjacent stages (only show when both stages have data)
  const getDrop = (prev: number, curr: number) => {
    const diff = prev - curr;
    if (diff <= 0 || prev === 0 || curr === 0) return null;
    return `${diff} lost`;
  };

  // ZERO-FAKE DISPLAY ENGINE
  const getStageDisplay = (value: number, hasRate: boolean, rate: number | undefined): {
    display: string | number;
    isPlaceholder: boolean;
    rateLabel: string | null;
  } => {
    if (isEmpty) {
      return { display: "No data yet", isPlaceholder: true, rateLabel: null };
    }
    if (value === 0) {
      return { display: "Waiting", isPlaceholder: true, rateLabel: null };
    }
    return {
      display: value,
      isPlaceholder: false,
      rateLabel: hasRate && rate !== undefined && rate > 0 ? `${rate}%` : null
    };
  };

  const scrollToBreakdown = () => {
    document.getElementById("response-flow")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Build steps
  const steps = [
    {
      label: "Sent",
      ...getStageDisplay(total, false, undefined),
      drop: null,
      color: "text-zinc-400",
    },
    {
      label: "Opened",
      ...getStageDisplay(opened, true, rates?.sentToOpened),
      drop: !isEmpty && opened > 0 ? getDrop(total, opened) : null,
      color: "text-amber-400",
    },
    {
      label: "In Progress",
      ...getStageDisplay(inProgress, true, rates?.openedToInProgress),
      drop: !isEmpty && inProgress > 0 ? getDrop(opened, inProgress) : null,
      color: "text-amber-500",
    },
    {
      label: "Completed",
      ...getStageDisplay(completed, true, rates?.inProgressToCompleted),
      drop: !isEmpty && completed > 0 ? getDrop(inProgress, completed) : null,
      color: "text-blue-400",
    },
    {
      label: "Case Study",
      ...getStageDisplay(published, true, rates?.total),
      drop: !isEmpty && published > 0 ? getDrop(completed, published) : null,
      color: "text-purple-400",
    },
  ];

  if (isEmpty) return null;

  return (
    <div className="w-full bg-[#111111] border border-white/10 rounded-xl overflow-hidden">
      {/* Inconsistency Banner */}
      {isInconsistent && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-2"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
            Data inconsistency detected. Metrics are syncing.
          </p>
        </motion.div>
      )}

      {/* Header */}
      <div className="px-6 pt-6 flex items-center justify-between mb-8">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Interview Progress</h3>
        <div className="flex items-center gap-4">
          {/* Visual link to breakdown */}
          <button
            onClick={scrollToBreakdown}
            className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors group"
          >
            <ArrowDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
            See Breakdown
          </button>
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* Funnel Strip — Zero-Fake Display */}
      <div className="px-6 pb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex-1 min-w-[140px]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{step.label}</span>
                {step.rateLabel && (
                  <span className="text-xs font-bold text-white/40 bg-white/5 border border-white/5 px-2 py-0.5 rounded shadow-sm">
                    {step.rateLabel}
                  </span>
                )}
              </div>

              <div className="flex flex-col">
                {step.isPlaceholder ? (
                  /* Placeholder: "Waiting" or "No data yet" — never numeric 0 */
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium italic text-zinc-600 tracking-tight">
                      {step.display}
                    </span>
                    {/* Inline hint to breakdown when waiting */}
                    {step.display === "Waiting" && (
                      <button
                        onClick={scrollToBreakdown}
                        className="text-[9px] text-zinc-700 hover:text-zinc-500 transition-colors font-mono"
                        title="View full state breakdown below"
                      >
                        breakdown ↓
                      </button>
                    )}
                  </div>
                ) : (
                  /* Real value — show number */
                  <span className={`text-3xl font-bold font-mono tracking-tighter ${step.color}`}>
                    {step.display}
                  </span>
                )}

                {step.drop ? (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="h-px w-3 bg-red-500/20" />
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      {step.drop}
                    </span>
                  </div>
                ) : (
                  <div className="h-4" aria-hidden="true" />
                )}
              </div>
            </motion.div>

            {i < steps.length - 1 && (
              <>
                <div className="hidden md:flex px-6 text-white/5">
                  <ArrowRight className="w-6 h-6 stroke-[3px]" />
                </div>
                <div className="flex md:hidden w-full items-center justify-center py-2 text-white/5">
                  <ArrowDown className="w-5 h-5 stroke-[3px]" />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
