"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Copy, RefreshCw, Eye, ExternalLink, Check } from "lucide-react";
import { ViewResponsesModal } from "@/components/dashboard/ViewResponsesModal";
import { SendInterviewModal } from "@/components/dashboard/SendInterviewModal";
import { apiPost, apiGet } from "@/lib/hooks/useSWR";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Interview } from "@/types";

/** Formats a date or timestamp string into "X min ago" style */
function timeAgo(dateString?: string | null): string {
  if (!dateString) return "—";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export function InterviewList({
  data,
}: {
  data: Interview[];
  totalCount?: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const router = useRouter();

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex-col bg-white border border-zinc-200/60 rounded-[14px] mt-6 p-10 text-center flex items-center justify-center min-h-[400px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] relative">
        <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-6 border border-zinc-100">
          <Mail className="w-8 h-8 text-zinc-400" />
        </div>

        <h3 className="text-[20px] font-bold text-zinc-900 mb-2 tracking-tight relative z-10">
          No interviews yet
        </h3>
        <p className="text-[15px] font-medium text-zinc-500 mb-8 relative z-10 flex items-center gap-2">
          Send an interview <ArrowRight className="w-4 h-4 text-zinc-400" /> track engagement in real time
        </p>

        <button 
          onClick={() => setIsSendOpen(true)} 
          className="bg-black text-white py-3.5 px-8 rounded-[12px] font-bold text-[15px] flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:bg-zinc-800 transition-all hover:-translate-y-0.5"
        >
          Send First Interview
        </button>

        <SendInterviewModal
          isOpen={isSendOpen}
          onClose={() => setIsSendOpen(false)}
          onSuccess={() => router.refresh()}
        />
      </div>
    );
  }

  const handleRemind = async (id: string, email: string) => {
    setLoadingAction(`remind-${id}`);
    const result = await apiPost(`/api/interviews/${id}/remind`, {});
    setLoadingAction(null);

    if (result.success) {
      toast.success(`Reminder sent to ${email}`);
    } else {
      toast.error(result.error || "Failed to send reminder");
    }
  };

  const handleCopyLink = async (interview: Interview) => {
    // If it's ready, fetch the direct link. If not, just copy the interview form link.
    if (["review_ready", "approved", "published"].includes(interview.status)) {
      try {
        const res = await apiGet<{ slug: string; id: string }>(`/api/interviews/${interview.id}/link`);
        if (res.success && res.data?.slug) {
          const origin = typeof window !== "undefined" ? window.location.origin : "https://auricai.com";
          navigator.clipboard.writeText(`${origin}/c/${res.data.slug}`);
          toast.success("Case study link copied!");
          return;
        }
      } catch {
         // Fallback if the endpoint fails
      }
    }
    
    // Default: copy the interview form link
    const origin = typeof window !== "undefined" ? window.location.origin : "https://auricai.com";
    navigator.clipboard.writeText(`${origin}/interview/${interview.token}`);
    toast.success("Interview link copied!");
  };

  return (
    <div className="w-full flex flex-col gap-5 mt-6 pb-20">
      {data.map((interview, i) => {
        const clientNameDisplay = interview.client_name || interview.client_email;
        const status = interview.status;

        // Determine step progression
        const stepOpenedDone = !!interview.opened_at || ["opened", "in_progress", "completed", "generating", "review_ready", "approved", "published"].includes(status);
        const stepCompletedDone = !!interview.completed_at || ["completed", "generating", "review_ready", "approved", "published"].includes(status);
        const stepGeneratedDone = ["review_ready", "approved", "published"].includes(status);

        // Timeline Configuration
        // Sent -> Opened -> Completed -> Generated
        const timeline = [
          {
            label: "Sent",
            state: "completed",
            subtext: timeAgo(interview.sent_at),
          },
          {
            label: "Opened",
            state: stepOpenedDone ? "completed" : (status === "sent" ? "active" : "future"),
            subtext: stepOpenedDone ? timeAgo(interview.opened_at || interview.last_activity) /* Fallback */ : (status === "sent" ? "waiting" : "—"),
          },
          {
            label: "Completed",
            state: stepCompletedDone ? "completed" : (["opened", "in_progress"].includes(status) ? "active" : "future"),
            subtext: stepCompletedDone ? timeAgo(interview.completed_at) : (["opened", "in_progress"].includes(status) ? "in progress" : "—"),
          },
          {
            label: "Generated",
            state: stepGeneratedDone ? "completed" : (status === "generating" ? "active" : "future"),
            subtext: stepGeneratedDone ? "ready" : (status === "generating" ? "generating" : "—"),
          }
        ];

        return (
          <motion.div
            key={interview.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
            className="flex flex-col bg-white border border-black/5 rounded-[14px] p-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition-all duration-300"
          >
            {/* Header: Name + Primary Action */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h3 className="text-[18px] font-bold text-zinc-900 tracking-tight leading-none mb-1">
                  {clientNameDisplay}
                </h3>
              </div>
              
              {/* Primary Action (Strictly 1 button) */}
              <div className="flex items-center">
                {stepGeneratedDone ? (
                  <button
                    onClick={() => router.push(`/dashboard/case-studies`)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-black text-white font-semibold text-[13px] hover:bg-zinc-800 transition-colors shadow-sm"
                  >
                    View Case Study <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : stepCompletedDone ? (
                  <button
                    onClick={() => setSelectedId(interview.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-black text-white font-semibold text-[13px] hover:bg-zinc-800 transition-colors shadow-sm"
                  >
                    View Responses
                  </button>
                ) : (
                  <button
                    onClick={() => handleCopyLink(interview)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-black text-white font-semibold text-[13px] hover:bg-zinc-800 transition-colors shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Timeline */}
            <div className="mt-8 md:mt-10 relative px-2">
              {/* Background joining line */}
              <div className="absolute top-[8px] left-[20px] right-[20px] h-[1.5px] bg-zinc-100 -z-10" />

              <div className="grid grid-cols-4 w-full text-center">
                {timeline.map((step, idx) => {
                  return (
                    <div key={idx} className="flex flex-col items-center relative gap-2">
                      
                      {/* Active line fill */}
                      {idx !== 0 && step.state === "completed" && (
                         <motion.div 
                           initial={{ scaleX: 0 }}
                           animate={{ scaleX: 1 }}
                           transition={{ duration: 0.5 }}
                           style={{ originX: 0 }}
                           className="absolute top-[8px] right-[50%] w-full h-[1.5px] bg-green-500 -z-10" 
                         />
                      )}

                      {/* Icon Container */}
                      <div className="h-4 w-full flex justify-center items-center bg-transparent z-10">
                        {step.state === "completed" && (
                          <div className="w-[18px] h-[18px] rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                            <Check className="w-3 h-3 text-white" strokeWidth={4} />
                          </div>
                        )}

                        {step.state === "active" && (
                          <div className="relative flex h-[14px] w-[14px] items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-[10px] w-[10px] bg-indigo-500"></span>
                          </div>
                        )}

                        {step.state === "future" && (
                          <div className="w-[14px] h-[14px] rounded-full border-[2px] border-zinc-200 bg-white" />
                        )}
                      </div>

                      {/* Labels */}
                      <div className="flex flex-col items-center">
                        <span className={`text-[12px] font-bold uppercase tracking-widest ${
                          step.state === "completed" ? "text-zinc-900" :
                          step.state === "active" ? "text-indigo-600" :
                          "text-zinc-400"
                        }`}>
                          {step.label}
                        </span>
                        <span className={`text-[12px] mt-0.5 font-medium ${
                          step.state === "completed" ? "text-zinc-500" :
                          step.state === "active" ? "text-indigo-500" :
                          "text-zinc-300"
                        }`}>
                          {step.subtext}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Secondary Actions */}
            <div className="mt-8 pt-4 border-t border-zinc-100 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Actions
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyLink(interview)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-zinc-50 text-zinc-500 font-medium text-[12px] hover:bg-zinc-100 hover:text-black transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy Link
                </button>
                <button
                  disabled={loadingAction === `remind-${interview.id}`}
                  onClick={() => handleRemind(interview.id, interview.client_email)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-zinc-50 text-zinc-500 font-medium text-[12px] hover:bg-zinc-100 hover:text-black transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingAction === `remind-${interview.id}` ? 'animate-spin' : ''}`} /> Resend
                </button>
              </div>
            </div>

          </motion.div>
        );
      })}

      <SendInterviewModal
         isOpen={isSendOpen}
         onClose={() => setIsSendOpen(false)}
         onSuccess={() => router.refresh()}
      />
      <ViewResponsesModal
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        interviewId={selectedId}
      />
    </div>
  );
}
