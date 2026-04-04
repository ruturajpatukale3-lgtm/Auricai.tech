"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Eye, Pencil, Trash2, ArrowRight, CheckCircle, UploadCloud, Mail, BarChart3, TrendingUp } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";
import { SendInterviewModal } from "@/components/dashboard/SendInterviewModal";
import { EditCaseStudyModal } from "@/components/dashboard/EditCaseStudyModal";
import { DeleteConfirmModal } from "@/components/dashboard/DeleteConfirmModal";
import { CaseStudyPreviewModal } from "@/components/dashboard/CaseStudyPreviewModal";
import { apiPatch } from "@/lib/hooks/useSWR";
import toast from "react-hot-toast";

import { CaseStudy } from "@/types";
import { isCaseStudyComplete, getValidHeadline } from "@/lib/utils/case-study-validation";

export function CaseStudiesTable({ data }: { data: CaseStudy[] }) {
  const router = useRouter();

  const [targetStudy, setTargetStudy] = useState<CaseStudy | null>(null);

  const [isSendInterviewOpen, setIsSendInterviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
            <Mail className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
            You don&apos;t have any case studies yet.
          </h3>
          <p className="text-zinc-500 max-w-sm mb-10 leading-relaxed text-sm">
            Send your first interview to generate a case study automatically in under 24 hours.
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
      <div className="flex flex-col gap-4 w-full mt-4">
        {data.map((study, i) => {
          const isComplete = isCaseStudyComplete(study);
          const headline = getValidHeadline(study.headline);
          
          return (
            <motion.div
              key={study.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative bg-[#111111] border border-white/5 rounded-xl p-5 hover:border-white/20 hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300"
            >
              {/* Main Row Content */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Left Box: Company & Headline */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white tracking-tight">{study.company_name}</span>
                    <span 
                      title={
                        study.status === 'live' ? 'Public case study' : 
                        study.status === 'pending' ? 'Ready to publish' : 
                        isComplete ? 'Ready for review' : 'Draft — awaiting data'
                      }
                      className={`text-[10px] cursor-help uppercase tracking-wider px-2.5 py-1 rounded-full border font-bold transition-all hover:scale-105 ${
                        study.status === 'live' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                        study.status === 'pending' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        isComplete ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}
                    >
                      {study.status === 'live' ? 'Live' : 
                       study.status === 'pending' ? 'Approved' : 
                       isComplete ? 'Review Needed' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm line-clamp-1 ${isComplete ? 'text-zinc-500' : 'text-zinc-600 italic'}`}>
                      {headline}
                    </p>
                    <span className="text-[10px] text-zinc-600 font-mono">• Generated in under 24h</span>
                  </div>
                </div>

                {/* Middle Box: The Money Metrics (Largest Text) */}
                <div className="flex-1 flex flex-col items-start md:items-center">
                  {!isComplete ? (
                    <div className="flex flex-col items-start md:items-center gap-1 opacity-50">
                      <span className="text-lg font-bold text-zinc-600 font-mono italic">Awaiting Results...</span>
                      <span className="text-[10px] text-zinc-700 uppercase font-bold tracking-widest">Collecting hard engagement proof</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight drop-shadow-md">
                        {study.delta_percent ? `+${study.delta_percent}%` : study.metric_type || "N/A"}
                      </span>
                      <div className="flex items-center gap-2 mt-1.5 transition-all group-hover:scale-105">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-blue-400 font-mono tracking-tight bg-blue-400/10 px-2.5 py-1 rounded-full border border-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                          <TrendingUp className="w-3 h-3" />
                          {study.views || 0} Organic Views
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Right Box: Usage & Actions */}
                <div className="flex-1 flex flex-col md:items-end justify-center min-w-[120px]">
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 mb-4 group-hover:opacity-0 transition-opacity duration-200">
                    <span>{study.views || 0} views today</span>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                    {/* Status Actions */}
                    {study.status === 'draft' && (
                      <button
                        onClick={() => isComplete && handleApprove(study.id)}
                        disabled={!isComplete}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                          isComplete 
                            ? "bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400"
                            : "bg-zinc-800 border border-white/5 text-zinc-500 cursor-not-allowed opacity-50"
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> 
                        {isComplete ? "Approve" : "Waiting for Results"}
                      </button>
                    )}
                    {study.status === 'pending' && (
                      <button
                        onClick={() => handlePublish(study.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-bold text-blue-400 transition-colors"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Publish
                      </button>
                    )}

                    <button 
                      onClick={() => { setTargetStudy(study); setIsPreviewOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-black hover:bg-zinc-200 border border-transparent text-xs font-bold transition-all shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>

                    <button 
                      onClick={() => handleCopyLink(study.slug || "")}
                      disabled={study.status !== 'live'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all disabled:opacity-30`}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </button>

                    <button 
                      onClick={() => { setTargetStudy(study); setIsEditOpen(true); }}
                      disabled={study.status === 'draft' && !isComplete}
                      title={study.status === 'draft' && !isComplete ? "Awaiting measurable results before edit." : "Edit Case Study"}
                      className="flex items-center justify-center w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button 
                      onClick={() => { setTargetStudy(study); setIsDeleteOpen(true); }}
                      className="flex items-center justify-center w-8 h-8 rounded-md bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modals */}
      <EditCaseStudyModal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setTargetStudy(null); }}
        onSuccess={() => router.refresh()}
        caseStudy={targetStudy}
      />
      
      <CaseStudyPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => { setIsPreviewOpen(false); setTargetStudy(null); }}
        caseStudy={targetStudy}
      />
      
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setTargetStudy(null); }}
        onSuccess={() => router.refresh()}
        caseStudy={targetStudy}
      />
    </>
  );
}
