"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle2, Loader2, Info, User, ExternalLink, Copy } from "lucide-react";
import { pushToHubSpotAction } from "@/app/actions/hubspot";
import toast from "react-hot-toast";
import type { CaseStudy } from "@/types";

interface PushToHubSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseStudy: CaseStudy | null;
}

export function PushToHubSpotModal({
  isOpen,
  onClose,
  caseStudy
}: PushToHubSpotModalProps) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [hubspotInfo, setHubspotInfo] = useState<{ portalId: string | null; contactId: string } | null>(null);
  const [alreadyPushed, setAlreadyPushed] = useState(false);
  const [contactNotFound, setContactNotFound] = useState(false);

  const handlePush = () => {
    if (!caseStudy) return;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid prospect email.");
      return;
    }

    startTransition(async () => {
      const result = await pushToHubSpotAction(caseStudy.id, email.trim());
      if (result.success) {
        setSuccess(true);
        setHubspotInfo(result.data!);
        toast.success("Proof added to HubSpot");
      } else {
        if (result.error?.includes("Already pushed")) {
          setAlreadyPushed(true);
        } else if (result.error?.includes("Contact not found")) {
          setContactNotFound(true);
        }
        toast.error(result.error || "Failed to push");
      }
    });
  };

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://auricai.com";
    navigator.clipboard.writeText(`${origin}/c/${caseStudy?.slug}`);
    toast.success("Link copied to clipboard!");
  };

  if (!isOpen || !caseStudy) return null;

  const roiMetric = caseStudy.delta_percent 
    ? `+${caseStudy.delta_percent}% ${caseStudy.metric_type}` 
    : caseStudy.metric_type || "MISSING ROI";
  
  const origin = typeof window !== "undefined" ? window.location.origin : "https://auricai.com";
  const caseStudyUrl = `${origin}/c/${caseStudy.slug}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FF7A59]/10 border border-[#FF7A59]/20 flex items-center justify-center">
                <Send className="w-4 h-4 text-[#FF7A59]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Push to HubSpot</h2>
                <p className="text-xs text-zinc-500">Inject proof into a contact timeline</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {success ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/20"
              >
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">Proof Pushed!</h3>
              <p className="text-sm text-zinc-500 mb-8">The success story has been added to the contact's timeline in HubSpot.</p>
              
              <div className="flex items-center gap-3 w-full max-w-xs">
                <button
                  onClick={() => {
                     onClose();
                     setTimeout(() => { 
                       setSuccess(false); 
                       setEmail(""); 
                       setHubspotInfo(null);
                       setAlreadyPushed(false);
                     }, 300);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition-colors"
                >
                  Close
                </button>
                <a
                  href={hubspotInfo?.portalId && hubspotInfo?.contactId 
                    ? `https://app.hubspot.com/contacts/${hubspotInfo.portalId}/contact/${hubspotInfo.contactId}`
                    : "https://app.hubspot.com/contacts/"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#FF7A59] hover:bg-[#FF7A59]/90 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  Open in HubSpot
                </a>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  Prospect Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value.toLowerCase());
                      if (alreadyPushed) setAlreadyPushed(false);
                      if (contactNotFound) setContactNotFound(false);
                    }}
                    placeholder="e.g. prospect@company.com"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF7A59]/50 focus:ring-1 focus:ring-[#FF7A59]/20 transition-all placeholder:text-zinc-600"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 flex items-center gap-1.5 ml-1">
                  <Info className="w-3 h-3" />
                  We'll find this contact in your CRM and add a secure note.
                </p>
              </div>

              {/* Preview */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                  Timeline Preview
                </label>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 font-mono text-sm">
                  <div className="text-[#FF7A59] font-bold">
                    🏆 NEW PROOF ASSET GENERATED
                  </div>
                  <div className="space-y-1 text-zinc-300">
                    <div>Client: {caseStudy.company_name || "MISSING NAME"}</div>
                    <div>ROI: {roiMetric}</div>
                    <div>Summary: {caseStudy.headline || "MISSING SUMMARY"}</div>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <a 
                      href={caseStudyUrl} 
                      target="_blank" 
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1.5 text-xs font-bold"
                      onClick={(e) => e.preventDefault()}
                    >
                      [View Case Study]
                    </a>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex gap-3">
                <button
                  onClick={handlePush}
                  disabled={isPending || !email.trim() || alreadyPushed}
                  className="flex-1 bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : alreadyPushed ? (
                    <>
                      <X className="w-4 h-4" /> Already Pushed
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Confirm & Push
                    </>
                  )}
                </button>
                {contactNotFound && (
                  <button
                    onClick={handleCopyLink}
                    className="px-6 bg-white/5 border border-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                )}
              </div>
              {alreadyPushed && (
                <p className="text-center text-[10px] text-orange-400 font-medium">
                  This proof has already been pushed to this contact.
                </p>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
