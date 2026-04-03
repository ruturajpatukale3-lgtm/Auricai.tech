/**
 * TestimonialAlchemist — The hero visual showing transformation.
 * Phase 1: Messy chat bubbles (the old way)
 * Phase 2: Morphs into glassmorphism case study card
 * Numbers count up. 3D perspective tilt on mousemove.
 * Loops every 6s.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import NumberCounter from "@/components/ui/NumberCounter";
import { Check } from "lucide-react";

export default function TestimonialAlchemist() {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [cycleKey, setCycleKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });

  // Phase cycling: phase 1 for 2.5s, then phase 2 for 3.5s
  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(2), 2500);
    const timer2 = setTimeout(() => {
      setPhase(1);
      setCycleKey((k) => k + 1);
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [cycleKey]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(y * -16);
    rotateY.set(x * 16);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      className="relative mx-auto w-full max-w-[680px]"
    >
      <AnimatePresence mode="wait">
        {phase === 1 ? (
          <motion.div
            key={`chat-${cycleKey}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="rounded-2xl border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.03)] p-6 md:p-8"
          >
            {/* Chat bubbles - the old way */}
            <div className="space-y-3">
              <ChatBubble
                align="right"
                color="blue"
                text="Hey can you write us a testimonial?"
                time="Mon 10:32 AM"
              />
              <ChatBubble
                align="left"
                color="gray"
                text="sure! will do it this week 👍"
                time="Mon 11:15 AM"
              />
              <div className="flex items-center justify-center gap-2 py-3">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs text-[#EF4444] font-mono tracking-wider"
                >
                  ⏳ 2 WEEKS PASS...
                </motion.div>
              </div>
              <ChatBubble
                align="right"
                color="blue"
                text="Following up on that testimonial..."
                time="2 weeks later"
              />
              <ChatBubble
                align="left"
                color="gray"
                text="Sorry been so busy 😅"
                time="3 days later"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`card-${cycleKey}`}
            initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] backdrop-blur-[20px] p-6 md:p-8 relative overflow-hidden"
          >
            {/* Blue glow underneath */}
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-[rgba(37,99,235,0.15)] rounded-full blur-[60px]" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-[#2563EB] text-lg">✦</span>
                <span className="text-xs font-mono tracking-widest text-[#A1A1AA] uppercase">
                  Case Study Generated
                </span>
              </div>

              <h4 className="text-[#FAFAFA] font-semibold text-lg mb-6">
                Acme Corp × YourProduct
              </h4>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs text-[#52525B] mb-1">New Pipeline</p>
                  <p className="text-2xl md:text-3xl font-bold font-mono text-[#FAFAFA]">
                    <NumberCounter target={1240000} prefix="$" />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#52525B] mb-1">ROI Performance</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl md:text-3xl font-bold font-mono text-[#10B981]">
                      <span className="text-zinc-500 text-sm font-normal mr-1">12% →</span>
                      <NumberCounter target={31} suffix="%" />
                    </span>
                    <span className="text-xs text-[#10B981] mb-1 font-bold">LIFT</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full mb-6 overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-[#2563EB] to-[#10B981] rounded-full"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-4">
                <span>Time to Value: <strong className="text-[#FAFAFA]">14 days</strong></span>
                <span>Deals Influenced: <strong className="text-[#FAFAFA]">12</strong></span>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#10B981]">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <div>
                  <p className="text-xs text-[#10B981] font-medium">Approved by Client</p>
                  <p className="text-xs text-[#52525B]">Sarah Chen, VP Sales · 2 minutes ago</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Individual chat bubble */
function ChatBubble({
  text,
  time,
  align,
  color,
}: {
  text: string;
  time: string;
  align: "left" | "right";
  color: "blue" | "gray";
}) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
          color === "blue"
            ? "bg-[#2563EB] text-white rounded-br-md"
            : "bg-[rgba(255,255,255,0.08)] text-[#A1A1AA] rounded-bl-md"
        }`}
      >
        <p>{text}</p>
        <p className={`text-[10px] mt-1 ${color === "blue" ? "text-blue-200" : "text-[#52525B]"}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
