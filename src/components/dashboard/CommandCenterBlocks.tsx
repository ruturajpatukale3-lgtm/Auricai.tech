"use client";

import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, ArrowRight, Activity, Target, Workflow, Trophy, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Interview, CaseStudy } from "@/types";

// ==========================================
// 1. System Status
// ==========================================
export function SystemStatusBlock({ status }: { status: "generating" | "processing" | "idle" }) {
  if (status === "generating") {
    return (
      <div className="w-full bg-white border border-indigo-100 rounded-[14px] p-[20px] shadow-[0_4px_12px_rgba(79,70,229,0.08)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle Pulse Background */}
        <motion.div
           animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }}
           transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-1/2 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] -translate-y-1/2 -translate-x-1/2 pointer-events-none"
        />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative flex h-[14px] w-[14px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-[14px] w-[14px] bg-indigo-600"></span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Generating case study</h2>
          </div>
          <p className="text-sm font-medium text-zinc-500 ml-[26px]">The AI is currently processing completed interviews into proof.</p>
        </div>

        <div className="relative z-10 flex flex-col gap-2 w-full max-w-[200px]">
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
             <CheckCircle className="w-4 h-4" /> Extracting metrics...
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
             <CheckCircle className="w-4 h-4" /> Structuring proof...
          </div>
          <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
             <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                 className="w-4 h-4 flex items-center justify-center"
             >
                <div className="w-3 h-3 rounded-full border-2 border-indigo-500 border-t-transparent" />
             </motion.div>
             Preparing output...
          </div>
        </div>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="w-full bg-white border border-blue-100 rounded-[14px] p-[20px] shadow-[0_4px_12px_rgba(59,130,246,0.08)] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-[14px] h-[14px] rounded-full bg-blue-500 border-[3px] border-blue-200" />
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Processing interviews</h2>
          </div>
          <p className="text-sm font-medium text-zinc-500 ml-[26px]">Waiting for client responses. Automation pathways active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-zinc-200/60 rounded-[14px] p-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row items-center justify-between gap-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-[14px] h-[14px] rounded-full bg-green-500 border-[3px] border-green-200" />
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">System running</h2>
        </div>
        <p className="text-sm font-medium text-zinc-500 ml-[26px]">No active processes. Awaiting new signals.</p>
      </div>
    </div>
  );
}

// ==========================================
// 2. System Performance
// ==========================================
export function SystemPerformanceBlock({ 
  followUps, engaged, responses, caseStudies 
}: { 
  followUps: number; engaged: number; responses: number; caseStudies: number; 
}) {
  return (
    <div className="w-full bg-white border border-zinc-200/60 rounded-[14px] p-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">System Performance</h3>
      </div>
      <div className="flex flex-col gap-3">
        {followUps > 0 && (
          <div className="flex items-center gap-3 text-[15px] text-zinc-700 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span><strong className="text-zinc-900">{followUps} follow-up{followUps > 1 ? 's' : ''}</strong> sent automatically</span>
          </div>
        )}
        {engaged > 0 && (
          <div className="flex items-center gap-3 text-[15px] text-zinc-700 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span><strong className="text-zinc-900">{engaged} client{engaged > 1 ? 's' : ''}</strong> engaged after follow-ups</span>
          </div>
        )}
        {responses > 0 && (
          <div className="flex items-center gap-3 text-[15px] text-zinc-700 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span><strong className="text-zinc-900">{responses} response{responses > 1 ? 's' : ''}</strong> received system-wide</span>
          </div>
        )}
        {caseStudies > 0 && (
          <div className="flex items-center gap-3 text-[15px] text-zinc-700 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span><strong className="text-zinc-900">{caseStudies} case stud{caseStudies > 1 ? 'ies' : 'y'}</strong> successfully generated</span>
          </div>
        )}
        {followUps === 0 && engaged === 0 && responses === 0 && caseStudies === 0 && (
          <div className="text-[15px] text-zinc-500 font-medium ml-4">
            System is tracking baseline metrics...
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. Pipeline Health
// ==========================================
export function PipelineHealthBlock({ isHealthy, dropOffSource, dropOffTarget }: { isHealthy: boolean; dropOffSource?: string; dropOffTarget?: string; }) {
  return (
    <div className="w-full bg-white border border-zinc-200/60 rounded-[14px] p-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 mb-3">
        <Workflow className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Pipeline Health</h3>
      </div>
      
      {isHealthy ? (
        <p className="text-[16px] text-zinc-600 font-medium">All stages performing well</p>
      ) : (
        <p className="text-[16px] text-rose-600 font-semibold flex items-center gap-2">
          Drop-off at: {dropOffSource} <ArrowRight className="w-4 h-4" /> {dropOffTarget}
        </p>
      )}
    </div>
  );
}

// ==========================================
// 4. Risk Alerts
// ==========================================
export function RiskAlertsBlock({ unopenedCount, stalledCount }: { unopenedCount: number; stalledCount: number; }) {
  if (unopenedCount === 0 && stalledCount === 0) return null;

  return (
    <div className="w-full bg-white border border-rose-100 rounded-[14px] p-[24px] shadow-[0_4px_12px_rgba(225,29,72,0.06)]">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-rose-500" />
        <h3 className="text-base font-bold text-rose-600 uppercase tracking-wide">Risk Alerts</h3>
      </div>
      <div className="flex flex-col gap-3">
        {unopenedCount > 0 && (
          <div className="flex items-center gap-3 text-[15px] text-zinc-700 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span><strong className="text-zinc-900">{unopenedCount} interview{unopenedCount > 1 ? 's' : ''}</strong> unopened after 24h</span>
          </div>
        )}
        {stalledCount > 0 && (
          <div className="flex items-center gap-3 text-[15px] text-zinc-700 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span><strong className="text-zinc-900">{stalledCount} interview{stalledCount > 1 ? 's' : ''}</strong> stalled after starting</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. Latest Result
// ==========================================
export function LatestResultBlock({ caseStudy }: { caseStudy: CaseStudy | null }) {
  if (!caseStudy) return null;

  const validMetric = caseStudy.metric_type;
  const headline = caseStudy.headline || "Untitled Case Study";

  return (
    <div className="w-full bg-white border border-zinc-200/60 rounded-[14px] p-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-[2px] transition-transform">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">Latest Result</h3>
        </div>
        <Link 
          href={`/dashboard/case-studies`}
          className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          View <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex flex-col">
        {validMetric ? (
          <span className="text-[36px] font-bold tracking-tight text-zinc-900 mb-2 leading-none">
            {validMetric}
          </span>
        ) : null}
        <h4 className="text-[17px] font-medium text-zinc-700 leading-snug line-clamp-2">
          &quot;{headline}&quot;
        </h4>
      </div>
    </div>
  );
}
