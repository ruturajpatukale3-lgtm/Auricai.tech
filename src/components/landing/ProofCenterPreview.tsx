"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { useCTARedirect } from "@/lib/useCTARedirect";
import { SignUpButton } from "@clerk/nextjs";
import MagneticButton from "@/components/ui/MagneticButton";

const examples = [
  {
    type: "Agency style",
    title: "SaaS Growth Agency",
    metrics: [
      { label: "Pipeline", value: "$3.2M" },
      { label: "ROI", value: "340%" },
      { label: "Deals Closed", value: "23" },
      { label: "Time to Value", value: "21 days" },
    ]
  },
  {
    type: "Enterprise style",
    title: "Cloud Infrastructure",
    metrics: [
      { label: "Deals Influenced", value: "14" },
      { label: "Pipeline", value: "$5.1M" },
      { label: "Conversion Lift", value: "+62%" },
      { label: "Sales Cycle", value: "-14 days" },
    ]
  },
  {
    type: "Dark tech style",
    title: "AI Security Platform",
    metrics: [
      { label: "Threats Blocked", value: "2.4M" },
      { label: "Response Time", value: "12ms" },
      { label: "Cost Saved", value: "$840k" },
      { label: "ROI", value: "410%" },
    ]
  }
];

export default function ProofCenterPreview() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { handleCTA, isRedirecting, isSignedIn } = useCTARedirect();

  return (
    <section id="proof-center" className="section-padding bg-[#0A0A0A]">
      <div className="container-max">
        <ScrollReveal className="text-center mb-12">
          <p className="text-xs font-medium tracking-[2px] uppercase text-[#52525B] mb-3">
            Example Case Studies
          </p>
          <h2 className="text-h2 text-[#FAFAFA] mb-4">
            Preview how your case studies will look once generated.
          </h2>
          <p className="text-zinc-500 text-sm">
            Generated using sample data for demonstration
          </p>
        </ScrollReveal>
      </div>

      {/* Horizontal scroll */}
      <div className="overflow-x-auto w-full py-8 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div ref={scrollRef} className="flex gap-6 w-max px-6 md:px-12 snap-x snap-mandatory mx-auto">
          
          {examples.map((study, i) => (
            <ScrollReveal key={i} delay={i * 100} className="snap-start flex-shrink-0">
              <div
                className="
                  w-[360px]
                  h-[420px]
                  rounded-2xl
                  bg-gradient-to-b from-[#1C1C1C] to-[#111111]
                  border border-white/10
                  p-6
                  flex flex-col justify-between
                  relative
                  group
                  hover:-translate-y-[6px]
                  hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)]
                  transition-all duration-300
                "
              >
                <div className="absolute inset-0 -z-10 blur-2xl bg-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Top Section */}
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <p className="text-sm font-medium text-zinc-400">
                      {study.type}
                    </p>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-zinc-400">
                      Example
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {study.title}
                  </h3>
                </div>

                {/* Middle Section - Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 text-center my-6">
                  {study.metrics.map((metric, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="text-lg font-bold text-white font-mono">{metric.value}</div>
                      <div className="text-xs text-zinc-500 mt-1">{metric.label}</div>
                    </div>
                  ))}
                </div>

                {/* Bottom Section */}
                <div className="mt-auto border-t border-white/10 pt-4">
                  <p className="text-xs text-zinc-500 text-center italic">
                    Your results will appear here after client interview
                  </p>
                  
                  {/* Watermark Logic (Simulated for non-Enterprise tiers) */}
                  <div className="text-xs text-zinc-500 text-center mt-6 opacity-70">
                    Powered by Auricai
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}

          {/* Your Case Study (Placeholder) */}
          <ScrollReveal delay={300} className="snap-start flex-shrink-0">
            <div
              className="
                w-[360px]
                h-[420px]
                rounded-2xl
                border-2 border-dashed border-white/20
                bg-transparent
                p-6
                flex flex-col justify-center items-center text-center
                relative
                group
                hover:border-white/40
                transition-all duration-300
              "
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <span className="text-2xl text-white/40 font-serif">+</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Your Case Study
              </h3>
              <p className="text-sm text-zinc-500 max-w-[200px] mb-8">
                Your first case study will appear here once generated
              </p>

              <div className="grid grid-cols-2 gap-4 w-full opacity-40 grayscale">
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="text-lg font-bold text-white font-mono blur-[2px]">$$$</div>
                  <div className="text-xs text-zinc-500 mt-1 blur-[1px]">Metric</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="text-lg font-bold text-white font-mono blur-[2px]">%%%</div>
                  <div className="text-xs text-zinc-500 mt-1 blur-[1px]">Metric</div>
                </div>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </div>

      {/* Bottom CTA */}
      <ScrollReveal className="text-center mt-8">
        {!isSignedIn ? (
          <SignUpButton mode="modal">
            <MagneticButton 
              variant="white"
              className="w-80 text-base font-bold shadow-md"
              disabled={isRedirecting}
              onClick={handleCTA}
            >
              {isRedirecting ? "Connecting..." : "Create Your First Case Study →"}
            </MagneticButton>
          </SignUpButton>
        ) : (
          <MagneticButton 
            variant="white"
            className="w-80 text-base font-bold shadow-md"
            disabled={isRedirecting}
            onClick={handleCTA}
          >
            {isRedirecting ? "Connecting..." : "Create Your First Case Study →"}
          </MagneticButton>
        )}
        <p className="text-zinc-500 text-sm mt-3">Takes less than 8 minutes</p>
      </ScrollReveal>
    </section>
  );
}
