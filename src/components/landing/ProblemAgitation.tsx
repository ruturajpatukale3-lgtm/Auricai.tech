/**
 * ProblemAgitation — Bento grid highlighting the broken status quo.
 * 2-column CSS Grid with spotlight cards.
 * Card 1: Old Way (red tint, email thread).
 * Card 2: New Way (blue tint, AI interview).
 * Card 3 & 4: Stats with sources.
 * Stagger fade up on scroll.
 */

"use client";

import { motion } from "framer-motion";
import ScrollReveal from "@/components/ui/ScrollReveal";
import SpotlightCard from "@/components/ui/SpotlightCard";
import { staggerContainer, staggerItem, scrollTrigger } from "@/lib/animations";

export default function ProblemAgitation() {
  return (
    <section id="problem" className="section-padding bg-[#0A0A0A]">
      <div className="container-max">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-h2 text-[#FAFAFA] mb-4">
            The current process is broken.
          </h2>
          <p className="text-body-lg text-[#A1A1AA] max-w-[600px] mx-auto">
            Every B2B founder knows case studies close deals. Nobody talks about
            how painful getting them actually is.
          </p>
        </ScrollReveal>

        <motion.div
          variants={staggerContainer(50)}
          initial="hidden"
          whileInView="visible"
          viewport={scrollTrigger}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Card 1 — The Old Way */}
          <motion.div variants={staggerItem}>
            <SpotlightCard
              className="h-full"
              tint="linear-gradient(to bottom, rgba(239,68,68,0.04), rgba(239,68,68,0.01))"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-xs text-[#EF4444] font-medium mb-6">
                ❌ Without Auricai
              </div>

              <div className="space-y-3 mb-6">
                <EmailRow week="Week 1" text="Hey Sarah, can we get a case study from you?" />
                <EmailRow week="Week 2" text="Just following up on my last email..." />
                <EmailRow week="Week 3" text="Quick bump on the case study!" />
                <EmailRow week="Week 4" text="?" />
              </div>

              {/* Timeline bar */}
              <div className="relative h-2 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden mb-3">
                <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#EF4444] to-[rgba(239,68,68,0.3)] rounded-full" />
              </div>

              <p className="text-xs text-[#52525B]">
                Average: <span className="text-[#A1A1AA]">6 weeks, $1,500, 1 boring PDF</span>
              </p>
            </SpotlightCard>
          </motion.div>

          {/* Card 2 — The New Way */}
          <motion.div variants={staggerItem}>
            <SpotlightCard
              className="h-full"
              tint="linear-gradient(to bottom, rgba(37,99,235,0.04), rgba(37,99,235,0.01))"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.2)] text-xs text-[#2563EB] font-medium mb-6">
                ✓ With Auricai
              </div>

              <div className="space-y-3 mb-6">
                <AIMessage role="ai" text="What was your content engagement rate before implementing our system?" />
                <AIMessage role="user" text="It was around 12%" />
                <AIMessage role="ai" text="And after deploying your proof engine?" />
                <AIMessage role="user" text="Jumped to 31% in 48 hours" />
              </div>

              {/* Extraction animation */}
              <div className="flex items-center gap-2 mb-3">
                {["12%→31%", "+158%", "60 days"].map((metric, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.15, type: "spring", stiffness: 200, damping: 20 }}
                    className="inline-flex px-2 py-1 rounded bg-[rgba(37,99,235,0.12)] border border-[rgba(37,99,235,0.2)] text-[10px] font-mono text-[#2563EB]"
                  >
                    {metric}
                  </motion.span>
                ))}
              </div>

              <p className="text-xs text-[#52525B]">
                Average: <span className="text-[#A1A1AA]">24 hours, $99/mo, stunning live page</span>
              </p>
            </SpotlightCard>
          </motion.div>

          {/* Card 3 — Stat */}
          <motion.div variants={staggerItem}>
            <SpotlightCard className="h-full flex flex-col justify-center">
              <p className="text-h2 text-[#FAFAFA] mb-2">87% of B2B buyers</p>
              <p className="text-body text-[#A1A1AA] mb-4">
                require case studies before signing enterprise contracts
              </p>
              <p className="text-caption text-[#52525B]">Source: Gartner 2024</p>
            </SpotlightCard>
          </motion.div>

          {/* Card 4 — Stat */}
          <motion.div variants={staggerItem}>
            <SpotlightCard className="h-full flex flex-col justify-center">
              <p className="text-h2 text-[#FAFAFA] mb-2">47% Higher</p>
              <p className="text-body text-[#A1A1AA] mb-4">
                engagement rate for sales teams using verifiable proof over claims
              </p>
              <p className="text-caption text-[#52525B]">Source: Forrester Research</p>
            </SpotlightCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function EmailRow({ week, text }: { week: string; text: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
      <span className="text-[10px] font-mono text-[#52525B] mt-0.5 whitespace-nowrap">{week}</span>
      <p className="text-sm text-[#A1A1AA]">{text}</p>
    </div>
  );
}

function AIMessage({ role, text }: { role: "ai" | "user"; text: string }) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          role === "ai"
            ? "bg-[rgba(37,99,235,0.08)] text-[#A1A1AA] rounded-bl-md"
            : "bg-[rgba(255,255,255,0.06)] text-[#FAFAFA] rounded-br-md"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
