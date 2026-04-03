/**
 * GlassCard — Glassmorphism card with hover elevation.
 * Uses backdrop-filter for blur effect.
 * Hover: translateY(-4px) + border brightens.
 */

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
}

export default function GlassCard({ children, className, padding = "p-8" }: GlassCardProps) {
  return (
    <motion.div
      initial={{ y: 0 }}
      whileHover={{ y: -4, borderColor: "rgba(255,255,255,0.2)" }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "bg-[rgba(255,255,255,0.04)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.10)] rounded-2xl",
        padding,
        className
      )}
    >
      {children}
    </motion.div>
  );
}
