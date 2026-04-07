/**
 * HowItWorks — Sticky scroll layout.
 * Left: sticky visual (cross-fades between 3 states).
 * Right: scrolling steps with progress indicator.
 * Step numbers in gradient mono text.
 */

"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent, MotionValue } from "framer-motion";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Send, MessageSquare, Globe } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "The AI Interview",
    headline: "Your client gets a link. Not a Zoom invite.",
    body: "Auricai sends a beautifully branded interview link to your client. Our AI Journalist asks 5 surgical questions designed to extract hard ROI metrics — not generic fluff. Your client responds async in 3 minutes.",
    pills: ["No login required", "Mobile optimised", "3 min average"],
    icon: Send,
  },
  {
    number: "02",
    title: "The Extraction",
    headline: "AI extracts the metrics that close deals.",
    body: "Our AI extracts and validates metrics (exact or estimated). It follows up automatically to gather maximum detail, ensuring your case study relies on real proof and strong, believable outcomes.",
    pills: ["Auto follow-ups", "Metric validation", "Hallucination detection"],
    icon: MessageSquare,
  },
  {
    number: "03",
    title: "Live in 24 Hours",
    headline: "A page your prospects trust instantly.",
    body: "Your client gets a 1-click approval portal. No login. No friction. They approve in 30 seconds. You get a live, hosted case study page with Auricai branding — Enterprise plans can remove the watermark and use a custom domain.",
    pills: ["1-click approval", "Live hosted page", "Enterprise: custom domain"],
    icon: Globe,
  },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const progressHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="how-it-works" className="bg-[#0A0A0A]">
      <div className="container-max section-padding">
        <ScrollReveal className="text-center mb-20">
          <p className="text-xs font-medium tracking-[2px] uppercase text-[#52525B] mb-3">
            How It Works
          </p>
          <h2 className="text-h2 text-[#FAFAFA] mb-4">
            From zero to live case study in 24 hours.
          </h2>
          <p className="text-body-lg text-[#A1A1AA] max-w-[500px] mx-auto">
            Three steps. No calls. No ghosting. No waiting.
          </p>
        </ScrollReveal>
      </div>

      <div ref={containerRef} className="container-max pb-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left — Sticky Visual */}
          <div className="hidden lg:block">
            <div className="sticky top-[100px] h-[500px]">
              <StepVisual scrollProgress={scrollYProgress} />
            </div>
          </div>

          {/* Right — Scrolling Steps */}
          <div className="relative">
            {/* Progress line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-[rgba(255,255,255,0.06)] hidden md:block">
              <motion.div
                className="w-full bg-gradient-to-b from-[#2563EB] to-[#7C3AED]"
                style={{ height: progressHeight }}
              />
            </div>

            <div className="space-y-32 md:pl-12">
              {steps.map((step, i) => (
                <ScrollReveal key={i} delay={i * 100}>
                  <div className="relative">
                    {/* Step dot */}
                    <div className="absolute -left-12 top-2 hidden md:flex w-3 h-3 rounded-full bg-[#2563EB] border-2 border-[#0A0A0A] z-10" />

                    <p className="text-caption text-[#52525B] mb-2">{step.title}</p>
                    <p className="text-[80px] font-bold font-mono gradient-text leading-none mb-4">
                      {step.number}
                    </p>
                    <h3 className="text-h3 text-[#FAFAFA] mb-4">{step.headline}</h3>
                    <p className="text-body text-[#A1A1AA] mb-6 max-w-[480px]">{step.body}</p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2">
                      {step.pills.map((pill) => (
                        <span
                          key={pill}
                          className="inline-flex px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-[#A1A1AA]"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>

                    {/* Mobile visual */}
                    <div className="lg:hidden mt-8">
                      <StepCard index={i} />
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Sticky visual that cross-fades between 3 states */
function StepVisual({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const [activeStep, setActiveStep] = useState(0);

  // Map scroll progress to discrete step index (0, 1, 2)
  useMotionValueEvent(scrollProgress, "change", (latest: number) => {
    const step = Math.min(Math.floor(latest * 3), 2);
    if (step !== activeStep) {
      setActiveStep(step);
    }
  });

  return (
    <div className="relative h-full w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
      {[0, 1, 2].map((index) => {
        const isActive = activeStep === index;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ 
              opacity: isActive ? 1 : 0, 
              scale: isActive ? 1 : 0.98 
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 p-6"
            style={{ 
              zIndex: isActive ? 10 : 0,
              pointerEvents: isActive ? "auto" : "none"
            }}
          >
            <StepCard index={index} />
          </motion.div>
        );
      })}
    </div>
  );
}

function StepCard({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="h-full flex flex-col rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-xs font-bold text-white">CF</div>
          <div>
            <p className="text-xs text-[#FAFAFA] font-medium">Auricai</p>
            <p className="text-[10px] text-[#52525B]">to sarah@acmecorp.com</p>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <p className="text-sm text-[#FAFAFA] font-medium">Sarah, your 3-minute case study interview is ready</p>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Hi Sarah, thank you for being an amazing customer. We&apos;d love to feature Acme Corp as a case study.
            It takes just 3 minutes — no calls, no meetings.
          </p>
          <button className="w-full py-3 bg-[#2563EB] text-white text-sm font-medium rounded-lg mt-4 hover:brightness-110 transition-all">
            Start My Interview →
          </button>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="h-full flex flex-col rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
          <span className="text-[#2563EB] text-sm">✦</span>
          <p className="text-xs text-[#A1A1AA]">AI Journalist Interview</p>
        </div>
        <div className="flex-1 space-y-3">
          <div className="bg-[rgba(37,99,235,0.08)] rounded-2xl rounded-bl-md px-3 py-2 text-xs text-[#A1A1AA] max-w-[85%]">
            What was your biggest challenge before implementing our solution?
          </div>
          <div className="bg-[rgba(255,255,255,0.06)] rounded-2xl rounded-br-md px-3 py-2 text-xs text-[#FAFAFA] max-w-[85%] ml-auto">
            User engagement was stuck at 12% for months
          </div>
          <div className="bg-[rgba(37,99,235,0.08)] rounded-2xl rounded-bl-md px-3 py-2 text-xs text-[#A1A1AA] max-w-[85%]">
            Can you share the exact improvement in engagement proof after implementation?
          </div>
          <div className="flex gap-1.5 mt-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[rgba(16,185,129,0.2)]">12% → 31%</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[rgba(16,185,129,0.2)]">+158%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
          <p className="text-xs text-[#A1A1AA]">Review & Approve</p>
        </div>
        <span className="text-[10px] text-[#52525B]">1-click approval</span>
      </div>
      <div className="flex-1 space-y-4">
        <div>
          <p className="text-xs text-[#52525B] mb-1">Case Study Preview</p>
          <p className="text-sm text-[#FAFAFA] font-medium">Acme Corp: How They Increased Engagement by 158%</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <p className="text-[10px] text-[#52525B]">Views</p>
            <p className="text-lg font-bold font-mono text-[#FAFAFA]">2.4M</p>
          </div>
          <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <p className="text-[10px] text-[#52525B]">CTR</p>
            <p className="text-lg font-bold font-mono text-[#10B981]">14.2%</p>
          </div>
        </div>
        <button className="w-full py-3 bg-[#10B981] text-white text-sm font-medium rounded-lg hover:brightness-110 transition-all">
          ✓ Approve & Publish
        </button>
      </div>
    </div>
  );
}
