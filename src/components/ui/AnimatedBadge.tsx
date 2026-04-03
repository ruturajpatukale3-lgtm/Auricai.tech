/**
 * AnimatedBadge — Pill-shaped badge with gradient border and green pulse dot.
 * Fades up + scales from 0.95 on load.
 */

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedBadgeProps {
  text: string;
  className?: string;
  delay?: number;
}

export default function AnimatedBadge({ text, className, delay = 0 }: AnimatedBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 20,
        delay: delay / 1000,
      }}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-[rgba(37,99,235,0.08)]",
        "border border-transparent",
        "text-sm text-[#A1A1AA]",
        className
      )}
      style={{
        borderImage: "linear-gradient(135deg, #2563EB, #7C3AED) 1",
        borderImageSlice: 1,
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "9999px",
        /* Fix for gradient border + border-radius */
        background:
          "linear-gradient(#0A0A0A, #0A0A0A) padding-box, linear-gradient(135deg, #2563EB, #7C3AED) border-box",
        border: "1px solid transparent",
      }}
    >
      {/* Green pulse dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-dot-pulse absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
      </span>
      <span>{text}</span>
    </motion.div>
  );
}
