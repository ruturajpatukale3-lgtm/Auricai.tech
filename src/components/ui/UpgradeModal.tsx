"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Shield, ArrowRight, TrendingUp, Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: "interviews" | "case_studies" | "watermark" | "fair_usage" | "RATE_LIMIT" | "DAILY_LIMIT" | "ABUSE_BLOCK_ACTIVE" | "SYSTEM_OVERLOAD" | "USAGE_REVIEW_REQUIRED" | "general";
  planType: "free" | "starter" | "growth" | "enterprise";
  interviewsUsed: number;
  interviewsLimit: number;
  caseStudiesUsed: number;
  caseStudiesLimit: number;
  retryAfter?: string | number;
}

export function UpgradeModal({
  isOpen,
  onClose,
  reason,
  planType,
  interviewsUsed,
  interviewsLimit,
  caseStudiesUsed,
  caseStudiesLimit,
  retryAfter,
}: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async (tier: string) => {
    if (upgrading) return;
    setUpgrading(true);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier }),
      });
      const responseData = await res.json();
      const data = responseData.data || responseData;

      if (!res.ok) throw new Error(data.error || "Failed to create checkout");

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      if (data.action === "subscription_updated") {
        import("react-hot-toast").then((module) => module.default.success("Plan updated! Changes will reflect shortly."));
        window.location.href = data.redirect_url || "/dashboard?checkout=success";
        return;
      }

      throw new Error("No checkout URL received");
    } catch (err: any) {
      import("react-hot-toast").then((module) => module.default.error(err.message || "Something went wrong. Please try again."));
    } finally {
      setUpgrading(false);
      onClose();
    }
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:support@auricai.com?subject=Enterprise Fair Usage Increase";
    onClose();
  };

  const getTitle = () => {
    if (reason === "fair_usage") return "Fair Usage Reached";
    if (reason === "ABUSE_BLOCK_ACTIVE") return "Account Restricted";
    if (reason === "RATE_LIMIT" || reason === "DAILY_LIMIT") return "Cooldown Active";
    if (reason === "SYSTEM_OVERLOAD") return "System Overload";
    if (reason === "USAGE_REVIEW_REQUIRED") return "Account Alert";
    if (reason === "interviews") return "Unlock More Interviews";
    if (reason === "case_studies") return "Unlock More Case Studies";
    if (reason === "watermark") return "Remove Watermark & Unlock Domain";
    return "Upgrade Your Plan";
  };

  const getDescription = () => {
    if (reason === "fair_usage") {
      return "You've reached the fair usage limits for the Enterprise plan. Please contact our support team to extend your organization's capacity.";
    }
    if (reason === "USAGE_REVIEW_REQUIRED") {
      return "Your organization has hit an abnormal AI resource threshold. Please contact support immediately for a manual review to securely unlock your volume.";
    }
    if (reason === "ABUSE_BLOCK_ACTIVE") {
      return `Temporarily restricted due to unusual activity. Please wait ${retryAfter ? Math.ceil(Number(retryAfter) / 60) : "30"} minutes before trying again.`;
    }
    if (reason === "SYSTEM_OVERLOAD") {
      return `Our backend is currently handling a massive throughput spike to protect database availability. Please attempt your broadcast again in ${retryAfter || "30"} seconds.`;
    }
    if (reason === "RATE_LIMIT") {
      return `You're creating interviews too fast. Please wait ${retryAfter || "60"} seconds before trying again.`;
    }
    if (reason === "DAILY_LIMIT") {
      return `You've reached the daily limit for your plan. This will reset at midnight UTC.`;
    }
    if (reason === "interviews") {
      return `You've used ${interviewsUsed}/${interviewsLimit} interviews on the ${planType} plan. Upgrade to send more.`;
    }
    if (reason === "case_studies") {
      return `You've reached your limit of ${caseStudiesLimit} published case studies. Upgrade to unlock more slots.`;
    }
    if (reason === "watermark") {
      return "Unlock the Enterprise plan to remove Auricai branding and serve case studies on your own custom domain.";
    }
    return "Upgrade to unlock higher limits and premium features to build more proof faster.";
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-white tracking-tight mb-2 flex items-center gap-2">
                {reason === "RATE_LIMIT" || reason === "DAILY_LIMIT" ? (
                  <Clock className="w-5 h-5 text-orange-400" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                )}
                {getTitle()}
              </h2>
              <p className="text-sm text-zinc-400 max-w-md">{getDescription()}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {reason === "fair_usage" || reason === "RATE_LIMIT" || reason === "DAILY_LIMIT" || reason === "ABUSE_BLOCK_ACTIVE" || reason === "SYSTEM_OVERLOAD" || reason === "USAGE_REVIEW_REQUIRED" ? (
              <div className="bg-gradient-to-b from-[#1C1C1C] to-[#111111] border border-blue-500/30 rounded-xl p-8 flex flex-col items-center text-center shadow-[0_0_30px_rgba(37,99,235,0.15)]">
                <div className={`p-4 rounded-full mb-6 ${reason === "fair_usage" || reason === "USAGE_REVIEW_REQUIRED" ? "bg-blue-500/10" : "bg-orange-500/10"}`}>
                  {reason === "fair_usage" || reason === "USAGE_REVIEW_REQUIRED" ? (
                    <Shield className="w-12 h-12 text-blue-500" />
                  ) : (
                    <Clock className="w-12 h-12 text-orange-500" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {reason === "fair_usage" ? "High Volume Detection" : reason === "USAGE_REVIEW_REQUIRED" ? "Compliance Hold" : "Safety Protocol Active"}
                </h3>
                <p className="text-zinc-400 mb-8 max-w-sm">
                  {reason === "fair_usage" 
                    ? "To ensure quality of service for all Enterprise customers, we implement a fair usage soft cap of 1,000 interviews per month."
                    : reason === "USAGE_REVIEW_REQUIRED" 
                    ? "Your automated broadcast threshold has required the interruption of your batch. Securely resolve this by confirming your proof velocity via support."
                    : "Wait times are enforced to protect our AI infrastructure and prevent automated abuse."}
                </p>
                {reason === "fair_usage" || reason === "USAGE_REVIEW_REQUIRED" ? (
                  <button 
                    onClick={handleContactSupport}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg flex items-center gap-2 group"
                  >
                    Contact Support <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-lg transition-all border border-white/5"
                  >
                    Close & Wait
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Growth Tier */}
                {(planType === "free" || planType === "starter") && (
                  <div className="bg-[#161616] border border-white/10 rounded-xl p-5 flex flex-col hover:border-white/20 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1 block">Growth</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-white">$199</span>
                          <span className="text-xs text-zinc-500">/mo</span>
                        </div>
                      </div>
                    </div>
                    
                    <ul className="space-y-3 mb-6 flex-1">
                      {["60 interviews/month", "AI Follow-ups", "Full analytics", "2 team seats"].map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    
                    <button 
                      onClick={() => handleUpgrade("growth")}
                      disabled={upgrading}
                      className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-bold rounded-lg transition-colors border border-white/5 flex items-center justify-center disabled:opacity-50"
                    >
                      {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upgrade to Growth"}
                    </button>
                  </div>
                )}

                {/* Enterprise Tier */}
                <div className={`relative bg-gradient-to-b from-[#1C1C1C] to-[#111111] border border-blue-500/30 rounded-xl p-5 flex flex-col shadow-[0_0_30px_rgba(37,99,235,0.15)] hover:shadow-[0_0_40px_rgba(37,99,235,0.25)] transition-shadow ${(planType !== "starter" && planType !== "free") ? "col-span-1 sm:col-span-2 max-w-sm mx-auto w-full" : ""}`}>
                  <div className="absolute top-0 right-0 p-3 pointer-events-none opacity-20">
                    <Shield className="w-16 h-16 text-blue-500" />
                  </div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 block">Enterprise</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white">$499</span>
                        <span className="text-xs text-zinc-500">/mo</span>
                      </div>
                    </div>
                  </div>
                  
                  <ul className="space-y-3 mb-6 flex-1 relative z-10">
                    {[
                      "Unlimited interviews*", 
                      "White-label branding", 
                      "Custom domain support", 
                    ].map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <Check className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  
                  <button 
                    onClick={() => handleUpgrade("enterprise")}
                    disabled={upgrading}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 group relative z-10 disabled:opacity-50"
                  >
                    {upgrading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Creating checkout...</>
                    ) : (
                      <>Upgrade to Enterprise <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>
                  <p className="text-[10px] text-zinc-500 mt-2 text-center">*Subject to fair usage policy</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
