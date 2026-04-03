"use client";

import { useState, useEffect } from "react";
import { X, Loader2, MessageSquare, CheckCircle, Clock } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/hooks/useSWR";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ViewResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewId: string | null;
}

export function ViewResponsesModal({ isOpen, onClose, interviewId }: ViewResponsesModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [approving, setApproving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && interviewId) {
      fetchResponses();
    } else {
      setData(null);
    }
  }, [isOpen, interviewId]);

  const fetchResponses = async () => {
    setLoading(true);
    const result = await apiGet(`/api/interviews/${interviewId}`);
    if (result.success) {
      setData(result.data);
    } else {
      toast.error("Failed to fetch responses");
      onClose();
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!interviewId) return;
    setApproving(true);
    const result = await apiPatch(`/api/interviews/${interviewId}`, { action: "approve" });
    setApproving(false);
    
    if (result.success) {
      toast.success("Interview approved!");
      router.refresh();
      onClose();
    } else {
      toast.error(result.error || "Failed to approve interview");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Interview Responses</h2>
              <p className="text-xs text-zinc-500">{data?.client_email || "Client Session"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-zinc-500 italic">Fetching client data...</p>
            </div>
          ) : data ? (
            <>
              {/* Info Bar */}
              <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold">Status:</span>
                  <span className="text-[11px] text-blue-400 font-bold uppercase">{data.status}</span>
                </div>
                {data.completed_at && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold">Completed:</span>
                    <span suppressHydrationWarning className="text-[11px] text-zinc-300">{new Date(data.completed_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Answers */}
              <div className="space-y-8">
                {data.answers && data.answers.length > 0 ? (
                  data.answers.map((ans: any, i: number) => (
                    <div key={ans.id} className="group animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="flex items-start gap-4">
                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-500 flex-shrink-0 mt-0.5 group-hover:border-blue-500/30 group-hover:text-blue-400 transition-colors">
                          {i + 1}
                        </div>
                        <div className="flex-1 space-y-2.5">
                          <h4 className="text-sm font-semibold text-zinc-300 leading-relaxed">{ans.question}</h4>
                          <div className="bg-[#111111] border border-white/5 rounded-xl p-4 text-sm text-white leading-relaxed font-medium shadow-inner">
                            {ans.answer}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-sm text-zinc-500">No responses recorded for this session.</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 flex gap-3 bg-[#0A0A0A]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5"
          >
            Close
          </button>
          {data?.status === "completed" && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50"
            >
              {approving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Approve for AI Generation
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
