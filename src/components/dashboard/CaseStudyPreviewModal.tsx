"use client";

import { X, Eye, FileText, CheckCircle2, Copy, UploadCloud, ExternalLink, MessageSquare, TrendingUp, Layout, AlertCircle } from "lucide-react";
import type { CaseStudy } from "@/types";
import toast from "react-hot-toast";
import { isCaseStudyComplete, getValidHeadline, formatMetricValue } from "@/lib/utils/case-study-validation";

interface CaseStudyPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseStudy: CaseStudy | null;
  onPushToHubSpot?: () => void;
}

export function CaseStudyPreviewModal({ isOpen, onClose, caseStudy, onPushToHubSpot }: CaseStudyPreviewModalProps) {
  if (!isOpen || !caseStudy) return null;

  const isComplete = isCaseStudyComplete(caseStudy);
  const headline = getValidHeadline(caseStudy.headline);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const copyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://auricai.com";
    const shareUrl = `${origin}/c/${caseStudy.slug}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl);
    toast.success("Public link copied to clipboard");

    // Track usage
    fetch(`/api/case-studies/${caseStudy.id}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "case_study_shared" }),
    }).catch((err) => console.error("[CaseStudyPreview] Failed to track share event:", err));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Preview Case Study</h2>
              <p className="text-xs text-zinc-500">
                {isComplete ? "View public-facing data" : "Draft — Awaiting more data"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isComplete && caseStudy.status === "live" && onPushToHubSpot && (
              <button
                onClick={onPushToHubSpot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FF7A59]/10 hover:bg-[#FF7A59]/20 border border-[#FF7A59]/20 text-xs font-bold text-[#FF7A59] transition-colors"
              >
                 <UploadCloud className="w-3.5 h-3.5" /> Push to HubSpot
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8">
          {/* Main Hero Header Representation */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-white tracking-wide">
                {caseStudy.company_name} Case Study
              </span>
            </div>
            
            <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight px-4 leading-tight ${isComplete ? 'text-white' : 'text-zinc-500 italic'}`}>
              {headline}
            </h1>
            
            <div className="flex items-center justify-center gap-2">
               <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border ${
                    caseStudy.status === 'live' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                    caseStudy.status === 'pending' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    isComplete ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                  }`}>
                 {caseStudy.status === 'live' ? 'Live' : 
                  caseStudy.status === 'pending' ? 'Approved' : 
                  isComplete ? 'Review Ready' : 'Draft Generated'}
               </span>
            </div>
          </div>

          {!isComplete ? (
            /* Draft State View */
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-10 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Waiting for measurable results</h3>
              <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
                The AI is currently analyzing your client&apos;s story to extract hard ROI metrics. Once specific outcomes are identified, this case study will be ready for review.
              </p>
            </div>
          ) : (
            <>
              {/* Metrics Grid Representation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Metric 1: Delta / Main Result */}
                <div className="bg-[#1A1A1A] border border-white/5 p-5 rounded-xl flex flex-col items-center justify-center text-center">
                    <span className="text-sm text-zinc-400 uppercase tracking-widest font-mono mb-2">Main Result</span>
                    <span className="text-3xl font-extrabold text-white tracking-tighter">
                      {caseStudy.delta_percent ? `+${caseStudy.delta_percent}%` : caseStudy.metric_type || "N/A"}
                    </span>
                    {caseStudy.delta_percent && <span className="text-xs text-zinc-500 mt-1">{caseStudy.metric_type}</span>}
                </div>

                {/* Metric 2: Before & After or Deals */}
                <div className="bg-[#1A1A1A] border border-white/5 p-5 rounded-xl flex flex-col items-center justify-center text-center">
                    <span className="text-sm text-zinc-400 uppercase tracking-widest font-mono mb-2">Transformation</span>
                    {caseStudy.before_value && caseStudy.after_value ? (
                      <div className="flex items-center gap-2 text-white font-bold">
                        <span className="text-zinc-500 line-through">{caseStudy.before_value}</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-green-400">{caseStudy.after_value}</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-white tracking-tighter">
                        {caseStudy.timeframe || "N/A"}
                      </span>
                    )}
                </div>

                {/* Metric 3: Pipeline Impact */}
                <div className="bg-[#1A1A1A] border border-white/5 p-5 rounded-xl flex flex-col items-center justify-center text-center">
                    <span className="text-sm text-zinc-400 uppercase tracking-widest font-mono mb-2">Pipeline Impact</span>
                    <span className="text-2xl font-extrabold text-white font-mono text-green-400 tracking-tighter">
                      ${(Number(caseStudy.pipeline_value) || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-500 mt-1">{caseStudy.deals_influenced || 0} deals influenced</span>
                </div>
              </div>

              {/* Sales Enablement & Next Steps */}
              <div className="pt-4 border-t border-white/5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" /> Sales Enablement Suggestions
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3 group hover:bg-white/10 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-1">LinkedIn Post</h4>
                      <p className="text-xs text-zinc-500 leading-normal">
                        Share this proof on your feed. Use the "Main Result" as your hook for maximum CTR.
                      </p>
                    </div>
                  </div>
      
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3 group hover:bg-white/10 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#FF7A59]/10 flex items-center justify-center shrink-0">
                      <Layout className="w-4 h-4 text-[#FF7A59]" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-[#FF7A59] uppercase tracking-wider mb-1">Email / CRM</h4>
                      <p className="text-xs text-zinc-500 leading-normal">
                        Drop the public link into your cold outreach or follow-up sequences.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/5 shrink-0 flex justify-between gap-3 bg-[#0A0A0A] rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <span>Slug: /c/{caseStudy.slug}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
            >
              Close
            </button>
            <button
              onClick={copyLink}
              disabled={caseStudy.status !== 'live' || !isComplete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white text-black hover:bg-zinc-200 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="w-4 h-4" /> Share Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
