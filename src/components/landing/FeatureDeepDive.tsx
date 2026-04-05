/**
 * FeatureDeepDive — Three-tab feature showcase.
 * Tab bar: pill style switcher with smooth slide.
 * Content: cross-fades with translateY(8px) → 0.
 * Fixed height container to prevent layout shift.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Check, Sparkles, Shield, Share2 } from "lucide-react";

const tabs = [
  {
    id: "experience",
    label: "Frictionless Client Experience",
    icon: Sparkles,
    features: [
      "No login for client",
      "Works on any device",
      "Auto reminder emails",
      "Branded interview page",
      "3 minute completion average",
      "Multi-language support",
    ],
    visual: "interview",
  },
  {
    id: "output",
    label: "Enterprise Grade Output",
    icon: Shield,
    features: [
      "AI metric validation",
      "Hallucination detection",
      "Human review before publish",
      "10 premium page templates",
      "Custom domain hosting",
      "Real-time data updates",
    ],
    visual: "output",
  },
  {
    id: "distribution",
    label: "Instant Distribution",
    icon: Share2,
    features: [
      "Powered by badge (viral)",
      "Public proof center",
      "Embeddable widgets",
      "LinkedIn share optimised",
      "Sales deck export (PDF)",
    ],
    visual: "distribution",
  },
];

export default function FeatureDeepDive() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="features" className="section-padding bg-[#0A0A0A]">
      <div className="container-max">
        <ScrollReveal className="text-center mb-16">
          <p className="text-xs font-medium tracking-[2px] uppercase text-[#52525B] mb-3">
            Features
          </p>
          <h2 className="text-h2 text-[#FAFAFA] mb-4">
            Everything you need to turn clients into proof.
          </h2>
        </ScrollReveal>

        {/* Tab bar */}
        <ScrollReveal delay={100} className="flex justify-center mb-12">
          <div className="inline-flex bg-[rgba(255,255,255,0.04)] rounded-full p-1 border border-[rgba(255,255,255,0.06)]">
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(i)}
                className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                  activeTab === i ? "text-black" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                }`}
              >
                {activeTab === i && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Tab content — fixed height */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            >
              {/* Left: Feature list */}
              <div className="space-y-4">
                {tabs[activeTab].features.map((feature, i) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 25 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[rgba(37,99,235,0.12)] flex items-center justify-center">
                      <Check className="w-3 h-3 text-[#2563EB]" />
                    </div>
                    <span className="text-body text-[#A1A1AA]">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* Right: Visual mockup */}
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-6 min-h-[320px]">
                <FeatureVisual type={tabs[activeTab].visual} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function FeatureVisual({ type }: { type: string }) {
  if (type === "interview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm text-[#FAFAFA] font-medium">Interview Experience</p>
            <p className="text-[10px] text-[#52525B]">Mobile-first, no login required</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { q: "How did you discover our product?", status: "answered" },
            { q: "What was your biggest challenge before?", status: "answered" },
            { q: "What specific metrics improved?", status: "current" },
            { q: "Would you recommend us?", status: "upcoming" },
          ].map((item, i) => (
            <div key={i} className={`p-3 rounded-lg border text-xs ${
              item.status === "current"
                ? "border-[rgba(37,99,235,0.3)] bg-[rgba(37,99,235,0.06)] text-[#FAFAFA]"
                : item.status === "answered"
                ? "border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.04)] text-[#A1A1AA]"
                : "border-[rgba(255,255,255,0.04)] bg-transparent text-[#52525B]"
            }`}>
              <div className="flex items-center gap-2">
                {item.status === "answered" && <Check className="w-3 h-3 text-[#10B981]" />}
                {item.status === "current" && <div className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />}
                {item.q}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#52525B]">
          <div className="w-full bg-[rgba(255,255,255,0.06)] rounded-full h-1">
            <div className="w-3/4 h-full bg-[#2563EB] rounded-full" />
          </div>
          75% complete · ~1 min left
        </div>
      </div>
    );
  }

  if (type === "output") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#2563EB]" />
          <p className="text-xs text-[#A1A1AA]">Input → Output Comparison</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-[10px] text-[#52525B] uppercase tracking-wider">Raw Input</p>
            <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#A1A1AA] space-y-2">
              <p>&quot;We saw big improvements&quot;</p>
              <p>&quot;Revenue went up&quot;</p>
              <p>&quot;Much faster now&quot;</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-[#10B981] uppercase tracking-wider">Validated Output</p>
            <div className="p-3 rounded-lg bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.15)] text-xs text-[#FAFAFA] space-y-2">
              <p>87% interview completion</p>
              <p>+158% lift in engagement</p>
              <p>24-hour time to proof</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.12)]">
          <Check className="w-3 h-3 text-[#10B981]" />
          <span className="text-[10px] text-[#10B981]">All metrics validated · No hallucinations detected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-4 h-4 text-[#7C3AED]" />
        <p className="text-xs text-[#A1A1AA]">Viral Distribution Loop</p>
      </div>
      <div className="relative">
        {/* Central node */}
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white text-xs font-bold">
            Case Study
          </div>
        </div>
        {/* Distribution channels */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "Proof Center", desc: "Public gallery" },
            { label: "LinkedIn", desc: "Share-optimised" },
            { label: "Sales Deck", desc: "PDF export" },
            { label: "Website", desc: "Embed widget" },
            { label: "Badge", desc: "Viral loop" },
          ].map((channel) => (
            <div key={channel.label} className="p-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-center">
              <p className="text-[10px] text-[#FAFAFA] font-medium">{channel.label}</p>
              <p className="text-[9px] text-[#52525B]">{channel.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
