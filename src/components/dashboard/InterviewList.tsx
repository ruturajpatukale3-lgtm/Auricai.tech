"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Clock, ArrowRight, Eye, RefreshCw, Layers, Loader2, Copy } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";
import { ViewResponsesModal } from "@/components/dashboard/ViewResponsesModal";
import { apiPost } from "@/lib/hooks/useSWR";
import toast from "react-hot-toast";

import { SendInterviewModal } from "@/components/dashboard/SendInterviewModal";
import { useRouter } from "next/navigation";
import { Interview } from "@/types";

export function InterviewList({ 
  data, 
  totalCount, 
}: { 
  data: Interview[]; 
  totalCount?: number; 
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const router = useRouter();

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex-col bg-[#111111] border border-white/10 rounded-xl mt-6 p-10 text-center flex items-center justify-center min-h-[400px] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/10 blur-[100px] pointer-events-none" />
        
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 border border-white/10 relative z-10">
          <Mail className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight relative z-10">
          Start collecting client proof
        </h3>

        {/* Pipeline visual */}
        <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider text-zinc-500 mb-8 relative z-10 uppercase">
          <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-md text-white">Sent</span>
          <ArrowRight className="w-3 h-3" />
          <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-md">Opened</span>
          <ArrowRight className="w-3 h-3" />
          <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-md">Completed</span>
          <ArrowRight className="w-3 h-3" />
          <span className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-md">Case Study</span>
        </div>

        <MagneticButton onClick={() => setIsSendOpen(true)} variant="white" className="shadow-[0_0_30px_rgba(255,255,255,0.15)] py-3 px-8 font-bold text-base flex items-center gap-2 relative z-10 hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] transition-shadow">
          Send First Interview
        </MagneticButton>

        {/* Flow Explanation */}
        <p className="text-sm font-medium text-zinc-500 mt-6 relative z-10 flex items-center gap-2">
          Send <ArrowRight className="w-3 h-3 text-zinc-600" /> Client answers <ArrowRight className="w-3 h-3 text-zinc-600" /> AI generates case study
        </p>

        <SendInterviewModal
          isOpen={isSendOpen}
          onClose={() => setIsSendOpen(false)}
          onSuccess={() => router.refresh()}
        />
      </div>
    );
  }

  const handleRemind = async (id: string, email: string) => {
    setRemindingId(id);
    const result = await apiPost(`/api/interviews/${id}/remind`, {});
    setRemindingId(null);

    if (result.success) {
      toast.success(`Reminder sent to ${email}`);
    } else {
      toast.error(result.error || "Failed to send reminder");
    }
  };

  return (
    <div className="w-full bg-[#111111] border border-white/10 rounded-xl overflow-hidden mt-6">

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        <div className="col-span-4 sm:col-span-3">Client Name</div>
        <div className="col-span-3 hidden sm:block">Status</div>
        <div className="col-span-3 sm:col-span-3 text-center md:text-left">Link</div>
        <div className="col-span-2 hidden md:block">Created Date</div>
        <div className="col-span-3 sm:col-span-4 md:col-span-1 text-right"></div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-white/5">
        {data.map((interview, i) => (
          <motion.div
            key={interview.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 + 0.3 }}
            className="group grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors relative"
          >
            {/* Client Name */}
            <div className="col-span-4 sm:col-span-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {interview.client_name ? interview.client_name.charAt(0).toUpperCase() : interview.client_email.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-white truncate">
                {interview.client_name || interview.client_email}
              </span>
            </div>

            {/* Status */}
            <div className="col-span-3 hidden sm:block">
              <span className={`inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                interview.status === 'published' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                interview.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                interview.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
              } shadow-sm`}>
                {interview.status}
              </span>
            </div>

            {/* Link */}
            <div className="col-span-3 sm:col-span-3 flex items-center gap-2">
              <button 
                onClick={() => {
                  const url = `${window.location.origin}/interview/${interview.token}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link copied!");
                }}
                title="Copy Interview Link"
                className="text-xs text-zinc-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <a
                href={`mailto:${interview.client_email}?subject=Interview%20Request&body=Hi%20${interview.client_name || 'there'},%0A%0AWe'd%20love%20to%20hear%20about%20your%20experience.%20Could%20you%20please%20complete%20this%20quick%203-minute%20interview?%0A%0A${window.location.origin}/interview/${interview.token}%0A%0ABest%20regards!`}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                title="Share via Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>

            {/* Created Date */}
            <div className="col-span-2 hidden md:flex items-center gap-1.5 text-sm text-zinc-500">
              <Clock className="w-3.5 h-3.5" />
              <span suppressHydrationWarning>
                {new Date(interview.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* Actions */}
            <div className="col-span-5 sm:col-span-4 md:col-span-1 flex items-center justify-end">
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button 
                  onClick={() => setSelectedId(interview.id)}
                  title="View Responses"
                  className="flex items-center justify-center w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <ViewResponsesModal 
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        interviewId={selectedId}
      />
    </div>
  );
}
