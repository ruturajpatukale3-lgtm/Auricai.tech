// ═══════════════════════════════════════════════════════════
// CaseFlow — UpgradePaywallModal (Plan-Aware)
// ═══════════════════════════════════════════════════════════

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Zap, CheckCircle2, X, Loader2 } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import type { PlanType } from "@/context/SubscriptionContext";
import { useRouter } from "next/navigation";

interface UpgradePaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric?: string;
  limit?: number;
  planType?: PlanType;
}

export function UpgradePaywallModal({ isOpen, onClose, metric, limit, planType }: UpgradePaywallModalProps) {
  const [upgrading, setUpgrading] = useState(false);
  const { orgId } = useAuth();
  const router = useRouter();

  if (!isOpen) return null;

  const isFree = planType === "free";
  const isTrial = planType === "trial";

  // ─── Plan-aware headline and description ─────────────────
  const headline = isFree
    ? "Start Your Free Trial"
    : "Upgrade Your Plan";

  const description = isFree
    ? "You've used your 2 free interviews. Start your 7-day trial to unlock 25 interviews — no credit card required."
    : isTrial
      ? `You're close to your limit${limit ? ` of ${limit}` : ""} for ${metric || "this feature"}. Upgrade to continue without interruption.`
      : `You've reached your monthly limit${limit ? ` of ${limit}` : ""} for ${metric || "this feature"}. Upgrade to unlock more volume.`;

  const ctaLabel = isFree
    ? "Start 7-Day Trial"
    : "Upgrade to Growth";

  const features = isFree
    ? [
        "25 AI interviews for 7 days",
        "Full analytics & engagement signals",
        "Case study generation",
        "No credit card to start",
      ]
    : [
        "60 AI interviews per month",
        "2 team seats",
        "Advanced analytics & engagement signals",
        "Priority email support",
      ];

  const handleUpgradeClick = async () => {
    if (upgrading) return;
    setUpgrading(true);
    try {
      const plan = isFree ? "starter" : "growth";
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          plan,
          interval: "monthly"
        }),
      });
      const responseData = await res.json();
      const data = responseData.data || responseData;

      if (!res.ok) throw new Error(data.error || "Failed to create checkout");

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      if (data.action === "subscription_updated") {
        toast.success("Plan updated! Changes will reflect shortly.");
        window.location.href = data.redirect_url || "/dashboard?checkout=success";
        return;
      }

      throw new Error("No checkout URL received");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           onClick={onClose}
           className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#161616] border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 blur-[80px] pointer-events-none" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 border rounded-full flex items-center justify-center mb-6 ${isFree ? "bg-purple-500/10 border-purple-500/20" : "bg-blue-500/10 border-blue-500/20"}`}>
              <Lock className={isFree ? "text-purple-400" : "text-blue-400"} size={28} />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{headline}</h2>
            <p className="text-zinc-400 mb-8">{description}</p>

            <div className="w-full space-y-3 mb-8 text-left">
              {features.map((feat, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 size={16} className={isFree ? "text-purple-500" : "text-blue-500"} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <MagneticButton 
              variant="gradient" 
              className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2"
              disabled={upgrading}
              onClick={handleUpgradeClick}
            >
              {upgrading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                </span>
              ) : (
                <>
                  <Zap size={18} />
                  {ctaLabel}
                </>
              )}
            </MagneticButton>
            
            <p className="mt-4 text-xs text-zinc-600">
              {isFree ? "7-day free trial. Cancel anytime." : "Risk-free. Pro-rated billing."}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
