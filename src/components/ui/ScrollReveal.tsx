/**
 * ScrollReveal — Wraps children in a scroll-triggered fade-up animation.
 * Uses Intersection Observer via Framer Motion.
 * GPU-accelerated: only transform + opacity.
 */

"use client";

import { motion } from "framer-motion";
import { fadeUp, scrollTrigger } from "@/lib/animations";
import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 100,
            damping: 20,
            delay: delay / 1000,
          },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={scrollTrigger}
      className={className}
    >
      {children}
    </motion.div>
  );
}
