"use client";

import { useState } from "react";
import { X, Send, Loader2, CheckCircle, Mail } from "lucide-react";
import { apiPost } from "@/lib/hooks/useSWR";
import { useSubscription } from "@/context/SubscriptionContext";
import toast from "react-hot-toast";

interface SendInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendInterviewModal({ isOpen, onClose, onSuccess }: SendInterviewModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { canCreateInterview, showPaywall, interviewsLimit, interviewsUsed } = useSubscription();

  if (!isOpen) return null;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail || sending || sent) return;

    // Strict plan check
    if (!canCreateInterview) {
      showPaywall("interviews", interviewsLimit);
      return;
    }

    setSending(true);
    console.log("🚀 [DEBUG] Sending Interview Request...");
    const payload = {
      client_email: email.trim().toLowerCase(),
      client_name: name.trim() || undefined,
    };
    console.log("   - Payload:", JSON.stringify(payload, null, 2));

    try {
      const result = await apiPost("/api/interviews", payload);
      console.log("   - API Response:", JSON.stringify(result, null, 2));

      if (result.success) {
        setSent(true);
        toast.success(`Interview sent to ${email}`);

        setEmail("");
        setName("");

        setTimeout(() => {
          setSent(false);
          onClose();
          onSuccess?.();
        }, 1500);
      } else {
        toast.error(result.error || "Failed to send interview");
      }
    } catch (err) {
       toast.error("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Send Interview</h2>
              <p className="text-xs text-zinc-500">Client will receive a unique interview link via email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Client Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@company.com"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
              autoFocus
              required
            />
            {email && !isValidEmail && (
              <p className="text-xs text-red-400 mt-1">Enter a valid email address</p>
            )}
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Client Name <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>

          {/* Info */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
            <p className="text-xs text-zinc-400 leading-relaxed">
              The client will receive an email with a unique interview link. Their answers will be
              processed by AI to generate a structured case study draft automatically.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={(!isValidEmail && !canCreateInterview) || sending || sent}
            onClick={(e) => {
              if (!canCreateInterview && !sent) {
                e.preventDefault();
                showPaywall("interviews", interviewsLimit);
              }
            }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
              sent
                ? "bg-green-500/20 text-green-400 border border-green-500/20"
                : !canCreateInterview
                  ? "bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed"
                  : "bg-white hover:bg-zinc-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            } disabled:opacity-50`}
          >
            {sent ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Interview Sent!
              </>
            ) : !canCreateInterview ? (
              <>
                <Loader2 className="w-4 h-4 opacity-0" />
                Upgrade to Send More ({interviewsUsed}/{interviewsLimit})
              </>
            ) : sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Interview
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
