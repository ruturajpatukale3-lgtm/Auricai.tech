"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { DollarSign, ChevronDown, Loader2, ArrowRight } from "lucide-react";
import { updateDealStatusAction } from "@/app/actions/deals";
import { useRouter } from "next/navigation";
import type { Deal, DealStatus } from "@/types";
import MagneticButton from "@/components/ui/MagneticButton";

type ExtendedDeal = Deal & { source?: "internal" | "hubspot" };

export function DealsTable({ data }: { data: ExtendedDeal[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = (dealId: string, status: DealStatus) => {
    setUpdatingId(dealId);
    startTransition(async () => {
      await updateDealStatusAction({ deal_id: dealId, status });
      router.refresh();
      setUpdatingId(null);
    });
  };

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] bg-[#111111] border border-white/10 rounded-xl flex flex-col items-center justify-center p-8 text-center mt-6 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
          <DollarSign className="w-8 h-8 text-white/30" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
          No deals tracked yet.
        </h3>
        <p className="text-sm text-zinc-500 max-w-[300px] mb-8">
          Attribute case studies to deals from the Case Studies page to start
          tracking your revenue impact.
        </p>
        <MagneticButton
          variant="white"
          className="shadow-lg py-2.5 px-6 font-bold text-sm flex items-center gap-2"
          onClick={() => router.push("/dashboard/case-studies")}
        >
          Go to Case Studies <ArrowRight className="w-4 h-4" />
        </MagneticButton>
      </div>
    );
  }

  const formatValue = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toLocaleString()}`;
  };

  const statusConfig: Record<
    DealStatus,
    { label: string; bg: string; text: string; border: string }
  > = {
    open: {
      label: "Open",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/20",
    },
    closed_won: {
      label: "Won",
      bg: "bg-green-500/10",
      text: "text-green-400",
      border: "border-green-500/20",
    },
    closed_lost: {
      label: "Lost",
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/20",
    },
  };

  return (
    <div className="flex flex-col gap-3 w-full mt-4">
      {data.map((deal, i) => {
        const sc = statusConfig[deal.status];
        const isUpdating = updatingId === deal.id;

        return (
          <motion.div
            key={deal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="group bg-[#111111] border border-white/5 rounded-xl p-5 hover:border-white/20 hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Left: Deal Info */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white tracking-tight">
                    {deal.name}
                  </h3>
                  {deal.source === "hubspot" && (
                    <span className="text-[10px] font-bold text-white bg-[#FF7A59] px-1.5 py-0.5 rounded flex items-center gap-1 shadow-[0_0_10px_rgba(255,122,89,0.2)]">
                      HS
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  {deal.source === "hubspot" ? "Last synced" : "Created"}{" "}
                  {new Date(deal.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Center: Value */}
              <div className="flex-1 flex justify-center">
                <span className="text-2xl font-extrabold text-white font-mono tracking-tight">
                  {formatValue(Number(deal.value))}
                </span>
              </div>

              {/* Right: Status Selector */}
              <div className="flex-1 flex justify-end items-center gap-3">
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                ) : deal.source === "hubspot" ? (
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${sc.bg} ${sc.text} ${sc.border}`}>
                    {sc.label}
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={deal.status}
                      onChange={(e) =>
                        handleStatusChange(
                          deal.id,
                          e.target.value as DealStatus
                        )
                      }
                      disabled={isPending}
                      className={`appearance-none cursor-pointer px-3 py-1.5 pr-7 rounded-lg text-xs font-bold uppercase tracking-wider border ${sc.bg} ${sc.text} ${sc.border} bg-transparent focus:outline-none focus:ring-1 focus:ring-white/20 transition-all`}
                    >
                      <option value="open" className="bg-[#111] text-white">
                        Open
                      </option>
                      <option
                        value="closed_won"
                        className="bg-[#111] text-white"
                      >
                        Won
                      </option>
                      <option
                        value="closed_lost"
                        className="bg-[#111] text-white"
                      >
                        Lost
                      </option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
