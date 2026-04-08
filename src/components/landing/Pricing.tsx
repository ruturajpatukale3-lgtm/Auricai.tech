"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/ui/ScrollReveal";
import MagneticButton from "@/components/ui/MagneticButton";
import { Check, Zap, Loader2 } from "lucide-react";
import { SignUpButton, useAuth } from "@clerk/nextjs";
import { useCTARedirect } from "@/lib/useCTARedirect";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { PlanType } from "@/context/SubscriptionContext";

// ─── Core features included on EVERY plan ──────────────────
const CORE_FEATURES = [
  "Full AI Interview Intelligence",
  "Proof & engagement analytics",
  "AI auto follow-ups (reminders)",
  "Case study generation",
  "Hosted live case study pages",
];

const plans = {
  starter: {
    name: "Starter",
    upgradeLabel: "Best for getting started",
    monthlyPrice: 49,
    annualPrice: 470,
    monthlyEquivalent: 39,
    description: "Launch your social proof engine with all core features. Just $2 per interview.",
    limits: ["25 AI interviews/month", "1 team seat"],
    brandingNote: "Includes Auricai branding — upgrade to Enterprise to remove watermark",
    cta: "Start 7-Day Trial",
  },
  growth: {
    name: "Growth",
    upgradeLabel: "Scale volume",
    monthlyPrice: 159,
    annualPrice: 1526,
    monthlyEquivalent: 127,
    description: "Double your interview volume and add a team member to collaborate on success stories.",
    limits: ["60 AI interviews/month", "2 team seats"],
    brandingNote: "Includes Auricai branding — upgrade to Enterprise to remove watermark",
    cta: "Upgrade to Growth",
  },
  enterprise: {
    name: "Enterprise",
    upgradeLabel: "Full branding control & scale",
    monthlyPrice: 459,
    annualPrice: 4406,
    monthlyEquivalent: 367,
    description: "For agencies and teams requiring complete branding control and maximum volume.",
    limits: ["Unlimited AI interviews", "5+ team seats"],
    brandingPerks: [
      "Remove Auricai watermark (white label)",
      "Use your own custom domain",
      "PDF export for sales decks",
    ],
    cta: "Start Proving Value →",
  },
};

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const { handleCTA, isRedirecting, isSignedIn } = useCTARedirect();
  const { orgId } = useAuth();
  const router = useRouter();
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  // Safely try to access subscription context (only available in dashboard)
  let currentPlan: PlanType | null = null;
  let trialConsumed = false;
  try {
    const { useSubscription } = require("@/context/SubscriptionContext");
    const sub = useSubscription();
    currentPlan = sub?.planType || null;
    trialConsumed = !!sub?.trialConsumed;
  } catch {
    // Not inside SubscriptionProvider (landing page) — no current plan info
  }

  // ─── Dynamic CTA Labels ─────────────────────────────────────
  const getCTA = (cardPlan: string, defaultCta: string): string => {
    if (!isSignedIn || !currentPlan) return defaultCta;
    if (currentPlan === cardPlan) return "Current Plan";
    if (currentPlan === "free") {
      return trialConsumed ? "Upgrade Plan" : "Start 7-Day Trial";
    }
    if (currentPlan === "trial") return "Upgrade Plan";
    // Already on a paid plan — show change
    return "Change Plan";
  };

  const isCurrentPlan = (cardPlan: string): boolean => {
    return !!isSignedIn && currentPlan === cardPlan;
  };

  // ─── Paddle Checkout Flow ─────────────────────────────────
  const handleUpgrade = async (plan: "starter" | "growth" | "enterprise") => {
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }

    if (isCurrentPlan(plan) || upgradingPlan) return;

    setUpgradingPlan(plan);
    console.log(`💳 [PRICING] Triggering upgrade for plan: ${plan}, interval: ${annual ? "annual" : "monthly"}`);

    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          interval: annual ? "annual" : "monthly"
        }),
      });

      const responseData = await res.json();
      console.log("   - API Response Data:", JSON.stringify(responseData, null, 2));

      const data = responseData.data || responseData;

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate checkout");
      }

      if (data.action === "checkout_created") {
        console.log("   - Initiating Paddle.Checkout.open()");
        if (typeof (window as any).Paddle !== "undefined") {
          const checkoutParams = {
            settings: {
              displayMode: "overlay",
              theme: "dark",
              locale: "en",
            },
            items: [{ 
              priceId: data.price_id, 
              quantity: 1 
            }],
            customer: data.email ? { email: data.email } : undefined,
            customData: { org_id: data.org_id },
          };
          console.log("   - Params:", JSON.stringify(checkoutParams, null, 2));
          
          try {
            (window as any).Paddle.Checkout.open(checkoutParams);
            console.log("   - Paddle.Checkout.open() called successfully");
          } catch (e) {
            console.error("   ❌ Paddle.Checkout.open() threw an error:", e);
          }
        } else {
          console.warn("   ⚠️ Paddle SDK NOT available in window. Falling back to checkout_url.");
          window.location.href = data.checkout_url;
        }
      } else if (data.action === "subscription_updated") {
        console.log("   - Subscription updated immediately via API logic.");
        toast.success(data.message || "Plan updated successfully!");
        window.location.href = data.redirect_url || "/dashboard?checkout=success";
      } else {
        console.warn("   ⚠️ Unknown action or missing URL:", data.action);
        alert("Checkout failed");
      }
    } catch (err: any) {
      console.error("   ❌ [PRICING ERROR] Catch block reached:", err);
      alert(err.message || "Upgrade failed");
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <section id="pricing" data-build-id="pricing-update-v1.0.2" className="section-padding bg-[#0A0A0A] relative overflow-hidden">
      <div className="container-max relative z-10">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-h2 text-[#FAFAFA] mb-4">
            7-day free trial. Scale when you build proof.
          </h2>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm transition-colors ${!annual ? "text-[#FAFAFA]" : "text-[#52525B]"}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-12 h-7 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] cursor-pointer transition-colors"
            >
              <motion.div
                animate={{ x: annual ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute top-1 w-5 h-5 rounded-full bg-white"
              />
            </button>
            <span className={`text-sm transition-colors ${annual ? "text-[#FAFAFA]" : "text-[#52525B]"}`}>
              Annual
            </span>

            <div className="ml-2 h-6 flex items-center overflow-hidden">
              <motion.span
                animate={{ opacity: annual ? 1 : 0, y: annual ? 0 : 10 }}
                transition={{ duration: 0.2 }}
                className="px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-xs text-[#10B981]"
              >
                Save 20% yearly
              </motion.span>
            </div>
          </div>
        </ScrollReveal>

        {/* Pricing Cards Container */}
        <div className="flex flex-col lg:flex-row items-center lg:items-end justify-center gap-6 max-w-[1200px] mx-auto relative mt-8">

          {/* Starter Card */}
          <ScrollReveal delay={0} className="w-full lg:w-[340px]">
            <div className="rounded-2xl border border-white/5 bg-[#161616] p-8 h-[660px] flex flex-col opacity-80 hover:opacity-100 hover:-translate-y-[2px] transition-all duration-300">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#52525B] mb-3">
                <Zap className="w-3 h-3" />
                {plans.starter.upgradeLabel}
              </span>
              <h3 className="text-xl font-bold text-white mb-2">{plans.starter.name}</h3>

              <div className="flex flex-col mb-4 h-[72px] justify-center">
                <div className="flex items-baseline gap-1.5">
                  {annual && (
                    <span className="text-sm text-zinc-500 line-through decoration-zinc-500/50">
                      ${plans.starter.monthlyPrice}
                    </span>
                  )}
                  <motion.span
                    key={annual ? "s-annual" : "s-monthly"}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold text-white font-mono tracking-tight"
                  >
                    ${annual ? plans.starter.monthlyEquivalent : plans.starter.monthlyPrice}
                  </motion.span>
                  <span className="text-sm text-[#52525B]">/mo</span>
                </div>
                {annual && (
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">
                    Billed annually
                  </p>
                )}
              </div>

              <p className="text-sm text-[#A1A1AA] mb-5 min-h-[60px] leading-relaxed">{plans.starter.description}</p>

              <div className="space-y-3 mb-4 flex-1">
                {plans.starter.limits.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-semibold text-[#FAFAFA]">{item}</span>
                  </div>
                ))}
                <div className="border-t border-white/5 my-2" />
                {CORE_FEATURES.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[#A1A1AA]">{feature}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-[#52525B] leading-relaxed mb-5 border border-white/5 rounded-lg px-3 py-2 bg-white/[0.02]">
                {plans.starter.brandingNote}
              </p>

              <div className="mt-auto">
                <MagneticButton
                  variant="ghost"
                  className={`w-full text-sm font-medium border border-[rgba(255,255,255,0.1)] transition-colors py-3 h-auto ${isCurrentPlan("starter") ? "opacity-50 cursor-not-allowed" : "hover:bg-[rgba(255,255,255,0.05)]"}`}
                  disabled={!!upgradingPlan || isCurrentPlan("starter")}
                  onClick={() => handleUpgrade("starter")}
                >
                  {upgradingPlan === "starter" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating checkout...
                    </span>
                  ) : getCTA("starter", plans.starter.cta)}
                </MagneticButton>
              </div>
            </div>
          </ScrollReveal>

          {/* Growth Card */}
          <ScrollReveal delay={100} className="w-full lg:w-[360px]">
            <div className="relative rounded-2xl border border-blue-500/20 bg-[#161616] p-8 h-[680px] flex flex-col hover:-translate-y-[6px] shadow-[0_0_30px_rgba(37,99,235,0.05)] hover:shadow-[0_0_40px_rgba(37,99,235,0.1)] transition-all duration-300">
              {/* Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-sm">
                Most Popular
              </div>

              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400/60 mb-3 mt-4">
                <Zap className="w-3 h-3" />
                {plans.growth.upgradeLabel}
              </span>
              <h3 className="text-xl font-bold text-white mb-2">{plans.growth.name}</h3>

              <div className="flex flex-col mb-4 h-[72px] justify-center">
                <div className="flex items-baseline gap-1.5">
                  {annual && (
                    <span className="text-sm text-blue-400/40 line-through decoration-blue-500/30">
                      ${plans.growth.monthlyPrice}
                    </span>
                  )}
                  <motion.span
                    key={annual ? "g-annual" : "g-monthly"}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold text-white font-mono tracking-tight"
                  >
                    ${annual ? plans.growth.monthlyEquivalent : plans.growth.monthlyPrice}
                  </motion.span>
                  <span className="text-sm text-[#52525B]">/mo</span>
                </div>
                {annual && (
                  <p className="text-[10px] text-blue-500/60 mt-1 uppercase tracking-wider font-bold">
                    Billed annually
                  </p>
                )}
              </div>

              <p className="text-sm text-[#A1A1AA] mb-5 min-h-[60px] leading-relaxed">{plans.growth.description}</p>

              <div className="space-y-3 mb-4 flex-1">
                {plans.growth.limits.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-semibold text-zinc-300">{item}</span>
                  </div>
                ))}
                <div className="border-t border-white/5 my-2" />
                {CORE_FEATURES.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-[#52525B] leading-relaxed mb-5 border border-white/5 rounded-lg px-3 py-2 bg-white/[0.02]">
                {plans.growth.brandingNote}
              </p>

              <div className="mt-auto">
                <button
                  className={`w-full text-sm font-bold text-white transition-colors border border-white/5 py-3 rounded-lg flex items-center justify-center ${isCurrentPlan("growth") ? "opacity-50 cursor-not-allowed bg-white/5" : "bg-white/10 hover:bg-white/15"}`}
                  disabled={!!upgradingPlan || isCurrentPlan("growth")}
                  onClick={() => handleUpgrade("growth")}
                >
                  {upgradingPlan === "growth" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating checkout...
                    </span>
                  ) : getCTA("growth", plans.growth.cta)}
                </button>
              </div>
            </div>
          </ScrollReveal>

          {/* Enterprise Card */}
          <ScrollReveal delay={200} className="w-full lg:w-[420px] z-10 relative">
            <div className="relative group hover:-translate-y-[8px] transition-all duration-500 z-10">

              {/* Soft Ambient Glow */}
              <div className="absolute inset-0 -z-10 blur-2xl bg-blue-500/15 rounded-2xl" />

              <div className="relative h-[760px] flex flex-col bg-gradient-to-b from-[#1C1C1C] to-[#111111] border border-white/20 rounded-2xl p-10 overflow-visible shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_40px_80px_rgba(37,99,235,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-500">

                {/* Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap z-20 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  White Label & Scale
                </div>

                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3 mt-4">
                  <Zap className="w-3 h-3" />
                  {plans.enterprise.upgradeLabel}
                </span>
                <h3 className="text-xl font-bold text-white mb-2">{plans.enterprise.name}</h3>
                <p className="text-xl text-green-400 font-bold mb-4 tracking-tight min-h-[32px]">Build 1 case study → pays for itself</p>

                <div className="flex flex-col mb-4 h-[72px] justify-center">
                  <div className="flex items-baseline gap-1.5">
                    {annual && (
                      <span className="text-lg text-white/30 line-through decoration-white/20">
                        ${plans.enterprise.monthlyPrice}
                      </span>
                    )}
                    <motion.span
                      key={annual ? "e-annual" : "e-monthly"}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-5xl font-bold text-white font-mono tracking-tight"
                    >
                      ${annual ? plans.enterprise.monthlyEquivalent : plans.enterprise.monthlyPrice}
                    </motion.span>
                    <span className="text-sm text-[#52525B]">/mo</span>
                  </div>
                  {annual && (
                    <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider font-bold">
                      Billed annually
                    </p>
                  )}
                </div>

                <p className="text-sm text-[#A1A1AA] mb-5 min-h-[60px] leading-relaxed">{plans.enterprise.description}</p>

                <div className="space-y-3 mb-4 flex-1">
                  {plans.enterprise.limits.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-semibold text-white">{item}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 my-2" />
                  {CORE_FEATURES.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-medium text-white">{feature}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 my-2" />
                  {plans.enterprise.brandingPerks.map((perk) => (
                    <div key={perk} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-medium text-green-300">{perk}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  <MagneticButton
                    variant="white"
                    className={`w-full text-base font-bold transition-all py-3.5 rounded-lg shadow-lg ${isCurrentPlan("enterprise") ? "opacity-50 cursor-not-allowed" : "hover:shadow-xl hover:scale-[1.02]"}`}
                    disabled={!!upgradingPlan || isCurrentPlan("enterprise")}
                    onClick={() => handleUpgrade("enterprise")}
                  >
                    {upgradingPlan === "enterprise" ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating checkout...
                      </span>
                    ) : getCTA("enterprise", plans.enterprise.cta)}
                  </MagneticButton>
                </div>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
}
