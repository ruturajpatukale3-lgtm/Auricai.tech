/**
 * MagneticButton — Button that tracks cursor and moves toward it.
 * Spring physics: stiffness 300, damping 25.
 * Max movement: 6px. Tracks within 80px radius.
 * GPU-accelerated via transform only.
 */

"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: (e?: MouseEvent) => void;
  variant?: "primary" | "ghost" | "gradient" | "white";
  size?: "default" | "large";
  disabled?: boolean;
}

export default function MagneticButton({
  children,
  className,
  onClick,
  variant = "primary",
  size = "default",
  disabled = false,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 300, damping: 25 });
  const springY = useSpring(y, { stiffness: 300, damping: 25 });

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    if (distance < 80) {
      const factor = (80 - distance) / 80;
      x.set(distX * factor * 0.15);
      y.set(distY * factor * 0.15);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium cursor-pointer transition-all duration-200 will-change-transform relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[#2563EB] text-white rounded-lg hover:brightness-110 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)]",
    ghost:
      "bg-transparent text-[#FAFAFA] border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.2)]",
    gradient:
      "bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white rounded-lg hover:brightness-110 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)]",
    white:
      "bg-white text-black rounded-md hover:scale-[1.02]",
  };

  const sizes = {
    default: "px-6 py-3 text-[15px]",
    large: "px-12 py-5 text-[18px] font-semibold",
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e: any) => onClick?.(e)}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
    >
      {children}
    </motion.button>
  );
}
