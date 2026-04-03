"use client";

import { motion } from "framer-motion";
import { AuricaiLogo } from "@/components/ui/AuricaiLogo";

interface PoweredByAuricaiProps {
  /** Position variant — fixed bottom-right or inline centered */
  position?: "fixed" | "inline";
  /** Hides the badge completely (Enterprise plan) */
  hidden?: boolean;
  /** Delay in seconds for the fade-in animation */
  delay?: number;
}

/**
 * Premium "Powered by Auricai" branding badge.
 *
 * Design principles:
 * - Subtle, high-trust, non-intrusive (Stripe / Linear / Notion quality)
 * - font-size: 12px, opacity: 0.5 at rest → 1 on hover
 * - cursor: pointer, click opens auricai.tech in new tab
 * - Enterprise plan: hidden server-side (never rendered)
 * - Responsive: centered on mobile, bottom-right on desktop (fixed variant)
 */
export function PoweredByAuricai({
  position = "fixed",
  hidden = false,
  delay = 1.2,
}: PoweredByAuricaiProps) {
  if (hidden) return null;

  const badge = (
    <a
      href="https://auricai.tech"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by Auricai"
      className="group inline-flex items-center gap-1.5 select-none"
    >
      {/* Micro icon */}
      <AuricaiLogo size={16} className="text-zinc-400 group-hover:text-white transition-colors duration-300 flex-shrink-0" />

      {/* Text */}
      <span className="text-[11px] font-medium tracking-wide text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300 whitespace-nowrap">
        Powered by{" "}
        <span className="font-bold text-zinc-400 group-hover:text-white transition-colors duration-300">
          Auricai
        </span>
      </span>
    </a>
  );

  if (position === "fixed") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 0.55 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay, duration: 0.5 }}
        className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6"
        style={{ cursor: "pointer" }}
      >
        <div className="flex items-center px-3 py-2 rounded-full border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm hover:border-white/10 hover:bg-white/[0.06] transition-all duration-300 shadow-sm">
          {badge}
        </div>
      </motion.div>
    );
  }

  // Inline / centered variant (used on welcome + completion screens)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.55 }}
      whileHover={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center justify-center mt-10"
      style={{ cursor: "pointer" }}
    >
      {badge}
    </motion.div>
  );
}

/**
 * Static server-compatible version (no framer-motion).
 * Use on SSR-rendered public-site pages where JS may not hydrate.
 */
export function PoweredByAuricaiStatic({ hidden = false }: { hidden?: boolean }) {
  if (hidden) return null;

  return (
    <a
      href="https://auricai.tech"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by Auricai"
      className="
        group inline-flex items-center gap-1.5 select-none
        opacity-50 hover:opacity-100
        transition-opacity duration-300
        cursor-pointer
      "
    >
      {/* Icon */}
      <AuricaiLogo size={16} className="text-gray-400 group-hover:text-gray-700 transition-colors duration-300 flex-shrink-0" />

      {/* Text */}
      <span className="text-[11px] font-medium tracking-wide text-gray-400 group-hover:text-gray-600 transition-colors duration-300 whitespace-nowrap">
        Powered by{" "}
        <span className="font-bold text-gray-500 group-hover:text-gray-800 transition-colors duration-300">
          Auricai
        </span>
      </span>
    </a>
  );
}
