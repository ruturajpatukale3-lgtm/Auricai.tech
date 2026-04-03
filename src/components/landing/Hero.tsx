/**
 * Hero — Full viewport hero section with layered background effects.
 * Background: black + blue radial glow + dot grid.
 * Staggered animation sequence: badge → headline → sub → CTAs → social → visual.
 * (Forcing sync after positioning rewrite)
 */

"use client";

import { motion } from "framer-motion";
import { Play, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { SignUpButton } from "@clerk/nextjs";
import AnimatedBadge from "@/components/ui/AnimatedBadge";
import MagneticButton from "@/components/ui/MagneticButton";
import TestimonialAlchemist from "@/components/landing/TestimonialAlchemist";
import { useCTARedirect } from "@/lib/useCTARedirect";

const avatars = [
  { name: "Alex", color: "#2563EB" },
  { name: "Sarah", color: "#7C3AED" },
  { name: "Mike", color: "#EC4899" },
  { name: "Priya", color: "#10B981" },
  { name: "Jordan", color: "#F59E0B" },
];

export default function Hero() {
  const { handleCTA, isRedirecting, isSignedIn } = useCTARedirect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return base layout during SSR to match initial HTML frame
  // but prevent text/logic mismatches before hydration
  if (!mounted) return (
    <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-[#0A0A0A]" />
    </section>
  );

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16"
    >
      {/* Layer 1: Base black */}
      <div className="absolute inset-0 bg-[#0A0A0A]" />

      {/* Layer 2: Radial blue glow with pulse */}
      <div
        className="absolute inset-0 animate-pulse-glow"
        style={{
          background:
            "radial-gradient(800px circle at 50% 40%, rgba(37,99,235,0.12), transparent 70%)",
        }}
      />

      {/* Layer 3: Dot grid with edge fade */}
      <div
        className="absolute inset-0 dot-grid"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-[900px] mx-auto">
        <AnimatedBadge text="The Proof System for B2B Founders" delay={0} />

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
          className="text-display mt-8 mb-6"
        >
          <span className="text-white">Stop Begging for Testimonials.</span>
          <br />
          <span className="gradient-text">Turn Client Results Into Proof That Closes Deals.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
          className="text-body-lg text-[#A1A1AA] max-w-[620px] mb-4"
        >
          Send a 3-minute interview. Get a client-approved case study with real ROI metrics in 24 hours — ready to win your next deal.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-10"
        >
          No calls. No chasing clients. No fluff. Just real numbers.
        </motion.p>

        {/* CTA Row */}
        <div className="flex flex-col items-center gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            {!isSignedIn ? (
              <SignUpButton mode="modal">
                <MagneticButton 
                  variant="primary" 
                  size="default" 
                  disabled={isRedirecting}
                  onClick={handleCTA}
                >
                  {isRedirecting ? "Connecting..." : "Create Your First Case Study →"}
                </MagneticButton>
              </SignUpButton>
            ) : (
              <MagneticButton 
                variant="primary" 
                size="default" 
                disabled={isRedirecting}
                onClick={handleCTA}
              >
                {isRedirecting ? "Connecting..." : "Create Your First Case Study →"}
              </MagneticButton>
            )}
            
            <div className="flex flex-col items-center">
              <MagneticButton variant="ghost" size="default">
                <Play className="w-4 h-4" />
                Watch 60s Demo
              </MagneticButton>
              <span className="text-[10px] text-zinc-500 mt-1 font-medium">See exactly how it works</span>
            </div>
          </motion.div>

          {/* Outcome proof line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">1 case study = 1 closed client</span>
          </motion.div>
        </div>

        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.5 }}
           className="mb-8"
        >
          <span className="text-xs text-[#52525B]">7-day free trial • Cancel anytime • Secure Paddle Checkout</span>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
          className="flex items-center gap-3 mb-16"
        >
          {/* Avatar stack */}
          <div className="flex -space-x-2">
            {avatars.map((avatar, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: avatar.color, zIndex: 5 - i }}
              >
                {avatar.name[0]}
              </div>
            ))}
          </div>
          <span className="text-sm text-[#A1A1AA]">Join 340+ B2B founders</span>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
            ))}
          </div>
        </motion.div>

        {/* Hero Visual — The Alchemist */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.5 }}
          className="w-full"
        >
          <TestimonialAlchemist />
        </motion.div>
      </div>
    </section>
  );
}
