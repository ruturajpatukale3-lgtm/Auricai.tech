"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Eye, Pencil, Trash2, ArrowRight, CheckCircle, UploadCloud, Mail, ExternalLink, Share2 } from "lucide-react";
import { SendInterviewModal } from "@/components/dashboard/SendInterviewModal";
import { DeleteConfirmModal } from "@/components/dashboard/DeleteConfirmModal";
import { apiPatch } from "@/lib/hooks/useSWR";
import toast from "react-hot-toast";

import { CaseStudy } from "@/types";
import { getValidHeadline, getValidMetric } from "@/lib/utils/case-study-validation";

export function CaseStudiesTable({ data, hasCompletedInterviews = false }: { data: CaseStudy[]; hasCompletedInterviews?: boolean }) {
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
    if (hasCompletedInterviews) {
      return (
        <div className="w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-2xl p-10 flex flex-col items-center justify-center min-h-[400px] mt-6 relative overflow-hidden">
          {/* Animated background glow */}
          <motion.div
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full point-events-none"
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            <h3 className="text-xl font-bold text-white tracking-tight mb-6 flex items-center gap-2">
              ✨ Generating your case study...
            </h3>
            
            <div className="flex flex-col gap-3 text-left w-full max-w-xs">
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Extracting metrics
                </motion.span>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 }}
                >
                  Structuring proof
                </motion.span>
              </div>

              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <motion.div
                  initial={{ opacity: 0.5, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
                  className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"
                />
                <span className="text-zinc-200">Preparing output</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

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
          // SAFE FALLBACKS: Never drop records, replace missing info with placeholders
          const safeHeadline = study.headline || "Untitled Case Study — Generation Pending";
          const headline = getValidHeadline(safeHeadline);
          const validMetric = getValidMetric(study.metric_type);
          const domain = typeof window !== "undefined" ? window.location.origin : "https://auricai.com";
          const shareUrl = `${domain}/c/${study.slug}`;

          const handleCopyLinkedIn = () => {
            const clientName = study.client_name || study.company_name || "a client";
            const metric = validMetric || "strong results";
            const storyText = study.story || study.summary || "";
            const text = `We helped ${clientName} achieve ${metric}.\n\nHere's how:\n\n${storyText}\n\nFull case study:\n${shareUrl}`;
            navigator.clipboard.writeText(text);
            toast.success("LinkedIn post copied!");
          };

          return (
            <motion.div
              key={study.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative flex flex-col justify-between bg-white border border-black/5 rounded-[14px] p-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition-all duration-200 ease-out min-h-[auto]"
            >
              {/* Top Right: Actions (Hidden until hover) */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => router.push(`/edit/${study.id}`)}
                  title="Edit"
                  className="p-1.5 rounded-md hover:bg-black/5 text-[#555] hover:text-black transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setTargetStudy(study); setIsDeleteOpen(true); }}
                  title="Delete"
                  className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Top Section: Primary Metric + Headline */}
              <div>
                {validMetric ? (
                  <div className="mb-[8px]">
                    <span className="text-[32px] md:text-[36px] font-bold leading-[1.2] text-[#222] tracking-tight block">
                      {validMetric}
                    </span>
                  </div>
                ) : null}

                <h3 className="text-[16px] md:text-[18px] font-medium text-[#222] line-clamp-2 leading-snug pr-12">
                  {headline}
                </h3>
              </div>

              {/* Bottom Section: Actions */}
              <div className="flex items-center gap-[10px] mt-[16px]">
                <button
                  onClick={() => {
                    if (study.slug) {
                      window.open(`/c/${study.slug}`, '_blank');
                    } else {
                      toast.error("No public link available");
                    }
                  }}
                  className="text-[13px] md:text-[14px] font-medium text-[#555] hover:text-black transition-colors flex items-center gap-1.5"
                >
                  View <ArrowRight className="w-4 h-4" />
                </button>

                <span className="text-[#ccc] text-xs">|</span>

                <button
                  onClick={() => {
                    if (study.slug) {
                      handleCopyLink(study.slug);
                    } else {
                      toast.error("No link to copy");
                    }
                  }}
                  className="text-[13px] md:text-[14px] font-medium text-[#555] hover:text-black transition-colors"
                >
                  Copy Link
                </button>

                <span className="text-[#ccc] text-xs">|</span>

                <button
                  onClick={handleCopyLinkedIn}
                  className="text-[13px] md:text-[14px] font-medium text-[#555] hover:text-[#0077b5] transition-colors"
                >
                  Copy DM
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
