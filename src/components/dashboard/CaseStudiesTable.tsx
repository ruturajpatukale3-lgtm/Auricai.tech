"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Eye, Pencil, Trash2, ArrowRight, CheckCircle, UploadCloud, Mail, ExternalLink, Linkedin } from "lucide-react";
import { SendInterviewModal } from "@/components/dashboard/SendInterviewModal";
import { DeleteConfirmModal } from "@/components/dashboard/DeleteConfirmModal";
import { apiPatch } from "@/lib/hooks/useSWR";
import toast from "react-hot-toast";

import { CaseStudy } from "@/types";
import { getValidHeadline } from "@/lib/utils/case-study-validation";

export function CaseStudiesTable({ data }: { data: CaseStudy[] }) {
  const router = useRouter();

  const [targetStudy, setTargetStudy] = useState<CaseStudy | null>(null);

  const [isSendInterviewOpen, setIsSendInterviewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleCopyLink = (slug: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://auricai.com";
    navigator.clipboard.writeText(`${origin}/c/${slug}`);
    toast.success("Link copied!");
  };

  const handleApprove = async (id: string) => {
    toast.promise(apiPatch(`/api/case-studies/${id}/approve`, {}), {
      loading: "Approving...",
      success: () => {
        router.refresh();
        return "Case study approved!";
      },
      error: "Failed to approve case study"
    });
  };

  const handlePublish = async (id: string) => {
    toast.promise(apiPatch(`/api/case-studies/${id}/publish`, {}), {
      loading: "Publishing...",
      success: () => {
        router.refresh();
        return "Case study published!";
      },
      error: "Failed to publish case study"
    });
  };

  if (!data || data.length === 0) {
    return (
      <>
        <div className="w-full h-[400px] bg-[#0A0A0A] border border-white/5 rounded-2xl flex flex-col items-center justify-center p-8 text-center mt-6 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
            <Mail className="w-6 h-6 text-white/40" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
            No case studies yet.
          </h3>
          <p className="text-zinc-500 max-w-sm mb-8 leading-relaxed text-sm">
            Create your first one by sending an interview to your client. We&apos;ll handle the generation.
          </p>
          <button
            onClick={() => setIsSendInterviewOpen(true)}
            className="group inline-flex items-center gap-3 bg-white text-black px-8 py-3.5 rounded-xl text-base font-bold hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]"
          >
            Send First Interview
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <SendInterviewModal
          isOpen={isSendInterviewOpen}
          onClose={() => setIsSendInterviewOpen(false)}
          onSuccess={() => router.refresh()}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-4">
        {data.map((study, i) => {
          const headline = getValidHeadline(study.headline);
          const domain = typeof window !== "undefined" ? window.location.origin : "https://auricai.com";
          const shareUrl = `${domain}/c/${study.slug}`;
          
          const handleCopyLinkedIn = () => {
            const text = `🎯 ${study.metric_type}\n\n${headline}\n\n${study.summary || study.story || ""}\n\nRead the full case study: ${shareUrl}`;
            navigator.clipboard.writeText(text);
            toast.success("LinkedIn post copied!");
          };

          return (
            <motion.div
              key={study.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative flex flex-col justify-between bg-[#111111] border border-white/5 rounded-2xl p-6 hover:border-white/20 hover:-translate-y-[2px] hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 min-h-[300px]"
            >
              {/* Top Section: Metrics */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-zinc-400 text-sm tracking-tight">{study.company_name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/edit/${study.id}`)}
                      title="Edit Case Study"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setTargetStudy(study); setIsDeleteOpen(true); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md hover:bg-red-500/10 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-white font-mono tracking-tight drop-shadow-md">
                    {study.metric_type || "N/A"}
                  </span>
                  {study.before_value && study.after_value && (
                    <span className="text-sm font-semibold text-blue-400/90 font-mono tracking-tight">
                      {study.before_value} → {study.after_value} {study.timeframe ? `in ${study.timeframe}` : ''}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white/90 leading-snug mb-4">
                  {headline}
                </h3>
              </div>

              {/* Bottom Section: Actions */}
              <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                <button
                  onClick={() => window.open(`/c/${study.slug}`, '_blank')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-sm font-bold transition-all"
                >
                  View <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCopyLink(study.slug || "")}
                  title="Copy Link"
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopyLinkedIn}
                  title="Copy LinkedIn Post"
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#0077b5]/10 hover:bg-[#0077b5]/20 border border-[#0077b5]/20 text-[#0077b5] transition-all"
                >
                  <Linkedin className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setTargetStudy(null); }}
        onSuccess={() => router.refresh()}
        caseStudy={targetStudy}
      />
    </>
  );
}
