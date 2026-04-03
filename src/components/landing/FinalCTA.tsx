/**
 * FinalCTA — Full-width closing section with gradient background.
 * Large magnetic CTA button. Trust signals below.
 * Drifting background decoration.
 */

"use client";

import { motion } from "framer-motion";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { SignUpButton } from "@clerk/nextjs";
import { useCTARedirect } from "@/lib/useCTARedirect";
import { Check } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";

export default function FinalCTA() {
  const { handleCTA, isRedirecting, isSignedIn } = useCTARedirect();

  return (
    <section className="relative section-padding overflow-hidden">
      {/* ... previous layers ... */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0A0A0A 0%, rgba(37,99,235,0.08) 50%, #0A0A0A 100%)",
        }}
      />
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 15, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[rgba(37,99,235,0.06)] blur-[120px] pointer-events-none"
      />
      <div
        className="absolute inset-0 dot-grid opacity-30"
        style={{
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, black 20%, transparent 70%)",
        }}
      />

      <div className="relative z-10 container-max text-center">
        <ScrollReveal>
          <p className="text-xs font-medium tracking-[3px] uppercase text-[#52525B] mb-6">
            Close more enterprise deals
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <h2 className="text-h1 mb-6 max-w-[800px] mx-auto">
            <span className="text-white">
              The hardest part of closing a deal is proving you can deliver.
            </span>
            <br />
            <span className="gradient-text">Let AI do the talking.</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <p className="text-body-lg text-[#A1A1AA] max-w-[480px] mx-auto mb-10">
            Your next enterprise deal is one case study away. Deploy your AI
            Journalist today.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          {!isSignedIn ? (
            <SignUpButton mode="modal">
              <MagneticButton 
                variant="gradient" 
                size="large"
                disabled={isRedirecting}
                onClick={handleCTA}
              >
                {isRedirecting ? "Connecting..." : "Start Extracting ROI →"}
              </MagneticButton>
            </SignUpButton>
          ) : (
            <MagneticButton 
              variant="gradient" 
              size="large"
              disabled={isRedirecting}
              onClick={handleCTA}
            >
              {isRedirecting ? "Connecting..." : "Start Extracting ROI →"}
            </MagneticButton>
          )}
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {[
              "7-day free trial",
              "Cancel anytime",
              "Setup in 8 minutes",
            ].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 text-sm text-[#52525B]">
                <Check className="w-3.5 h-3.5 text-[#52525B]" />
                {item}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
