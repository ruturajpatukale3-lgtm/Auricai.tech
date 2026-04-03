"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, DollarSign, Check, Loader2, LinkIcon } from "lucide-react";
import {
  createAndAttributeDealAction,
  attributeDealAction,
  attributeExternalDealAction,
  getAttributionContextAction,
} from "@/app/actions/deals";
import { useRouter } from "next/navigation";
import type { Deal } from "@/types";

interface DealAttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseStudyId: string;
  companyName: string;
}

export function DealAttributionModal({
  isOpen,
  onClose,
  caseStudyId,
  companyName,
}: DealAttributionModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"hubspot" | "select" | "create">("select");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [externalDeals, setExternalDeals] = useState<any[]>([]);
  const [hubspotConnected, setHubspotConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Create form state
  const [dealName, setDealName] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStatus, setDealStatus] = useState<"open" | "closed_won" | "closed_lost">("open");

  // Load existing deals
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setSuccess(false);
      getAttributionContextAction().then((result) => {
        if (result.success && result.data) {
          setDeals(result.data.internalDeals);
          setExternalDeals(result.data.externalDeals);
          setHubspotConnected(result.data.hubspotConnected);
          if (result.data.hubspotConnected) {
            setMode("hubspot");
          } else {
            setMode("select");
          }
        }
        setLoading(false);
      });
    }
  }, [isOpen]);

  const handleSelectExternalDeal = (deal: any) => {
    setError(null);
    startTransition(async () => {
      const result = await attributeExternalDealAction({
        external_deal_id: deal.external_id,
        case_study_id: caseStudyId,
      });

      if (result.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => onClose(), 1200);
      } else {
        setError(result.error || "Failed to attribute deal");
      }
    });
  };

  const handleSelectDeal = (deal: Deal) => {
    setError(null);
    startTransition(async () => {
      const result = await attributeDealAction({
        deal_id: deal.id,
        case_study_id: caseStudyId,
      });

      if (result.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => onClose(), 1200);
      } else {
        setError(result.error || "Failed to attribute deal");
      }
    });
  };

  const handleCreateAndAttribute = () => {
    const value = parseFloat(dealValue);
    if (!dealName.trim() || isNaN(value) || value < 0) {
      setError("Please enter a valid deal name and value.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createAndAttributeDealAction({
        name: dealName.trim(),
        value,
        status: dealStatus,
        case_study_id: caseStudyId,
      });

      if (result.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => onClose(), 1200);
      } else {
        setError(result.error || "Failed to create deal");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Link to Deal
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Attribute &quot;{companyName}&quot; to a deal
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Success State */}
          {success && (
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/20">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                Deal Linked!
              </h3>
              <p className="text-sm text-zinc-500">
                Analytics will update automatically.
              </p>
            </div>
          )}

          {/* Content */}
          {!success && (
            <>
              {/* Mode Tabs */}
              <div className="flex border-b border-white/5">
                {hubspotConnected && (
                  <button
                    onClick={() => setMode("hubspot")}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      mode === "hubspot"
                        ? "text-[#FF7A59] border-b-2 border-[#FF7A59]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    HubSpot Deals
                  </button>
                )}
                <button
                  onClick={() => setMode("select")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    mode === "select"
                      ? "text-white border-b-2 border-blue-500"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {hubspotConnected ? "Manual Deals" : "Select Existing Deal"}
                </button>
                <button
                  onClick={() => setMode("create")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    mode === "create"
                      ? "text-white border-b-2 border-blue-500"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  Quick Create
                </button>
              </div>

              <div className="p-6">
                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                {mode === "hubspot" && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                      </div>
                    ) : externalDeals.length === 0 ? (
                      <div className="text-center py-12">
                        <DollarSign className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500 mb-2">
                          No deals synced from HubSpot.
                        </p>
                        <p className="text-xs text-zinc-600">
                          Go to Settings -&gt; Integrations to sync your deals.
                        </p>
                      </div>
                    ) : (
                      externalDeals.map((deal) => (
                        <button
                          key={deal.external_id}
                          onClick={() => handleSelectExternalDeal(deal)}
                          disabled={isPending}
                          className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#FF7A59]/30 hover:bg-white/[0.04] transition-all group disabled:opacity-50"
                        >
                          <div className="text-left">
                            <p className="text-sm font-semibold text-white">
                              {deal.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-green-400 font-mono font-bold">
                                ${Number(deal.amount).toLocaleString()}
                              </span>
                              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                                {deal.stage.replace("_", " ")}
                              </span>
                            </div>
                            {deal.contact_email && <p className="text-xs text-zinc-500 mt-1">{deal.contact_email}</p>}
                          </div>
                          <LinkIcon className="w-4 h-4 text-zinc-600 group-hover:text-[#FF7A59] transition-colors" />
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Select Mode */}
                {mode === "select" && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                      </div>
                    ) : deals.length === 0 ? (
                      <div className="text-center py-12">
                        <DollarSign className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500 mb-4">
                          No deals yet. Create your first one.
                        </p>
                        <button
                          onClick={() => setMode("create")}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white font-medium transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 inline mr-1" />
                          Create Deal
                        </button>
                      </div>
                    ) : (
                      deals.map((deal) => (
                        <button
                          key={deal.id}
                          onClick={() => handleSelectDeal(deal)}
                          disabled={isPending}
                          className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all group disabled:opacity-50"
                        >
                          <div className="text-left">
                            <p className="text-sm font-semibold text-white">
                              {deal.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-green-400 font-mono font-bold">
                                ${Number(deal.value).toLocaleString()}
                              </span>
                              <span
                                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                                  deal.status === "closed_won"
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : deal.status === "closed_lost"
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                }`}
                              >
                                {deal.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                          <LinkIcon className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Create Mode */}
                {mode === "create" && (
                  <div className="space-y-4">
                    {/* Deal Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400 ml-0.5">
                        Deal Name
                      </label>
                      <input
                        type="text"
                        value={dealName}
                        onChange={(e) => setDealName(e.target.value)}
                        placeholder="e.g. Acme Corp Enterprise"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                      />
                    </div>

                    {/* Deal Value */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400 ml-0.5">
                        Deal Value ($)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="number"
                          value={dealValue}
                          onChange={(e) => setDealValue(e.target.value)}
                          placeholder="50000"
                          min={0}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Deal Status */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400 ml-0.5">
                        Status
                      </label>
                      <div className="flex gap-2">
                        {(
                          [
                            { value: "open", label: "Open", color: "blue" },
                            {
                              value: "closed_won",
                              label: "Won",
                              color: "green",
                            },
                            {
                              value: "closed_lost",
                              label: "Lost",
                              color: "red",
                            },
                          ] as const
                        ).map((s) => (
                          <button
                            key={s.value}
                            onClick={() => setDealStatus(s.value)}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                              dealStatus === s.value
                                ? s.color === "blue"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                  : s.color === "green"
                                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                                  : "bg-red-500/10 text-red-400 border-red-500/30"
                                : "bg-white/[0.02] text-zinc-500 border-white/5 hover:border-white/10"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      onClick={handleCreateAndAttribute}
                      disabled={isPending || !dealName.trim() || !dealValue}
                      className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <LinkIcon className="w-4 h-4" />
                          Create & Link Deal
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
