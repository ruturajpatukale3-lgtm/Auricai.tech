"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useRef } from "react";

const stack = [
  { name: "Next.js", src: "/logos/nextjs.svg" },
  { name: "Vercel", src: "/logos/vercel.svg" },
  { name: "Supabase", src: "/logos/supabase.svg" },
  { name: "Clerk", src: "/logos/clerk.svg" },
  { name: "Resend", src: "/logos/resend.svg" },
  { name: "Paddle", src: "/logos/paddle.svg" }
];

// CRITICAL: duplicate multiple times for seamless pixel-based loop
const loop = [...stack, ...stack, ...stack, ...stack];

const StackItem = ({ item }: { item: { name: string; src: string } }) => (
  <div className="flex items-center gap-3 px-6 py-2 opacity-30 hover:opacity-70 transition-all duration-200 will-change-transform hover:-translate-y-[2px] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]">
    <img src={item.src} alt={item.name} className="h-5 w-5 object-contain" />
    <span className="text-sm text-zinc-400 font-medium tracking-wide whitespace-nowrap">
      {item.name}
    </span>
  </div>
);

export default function LogoMarquee() {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);
  const speed = 50; // pixels per second

  useAnimationFrame((time, delta) => {
    if (!marqueeRef.current) return;

    xRef.current -= (speed * delta) / 1000;

    // Reset when moving past the width of one original set.
    // Since we duplicated the stack 4 times, the width of one set is scrollWidth / 4.
    const width = marqueeRef.current.scrollWidth / 4;

    if (Math.abs(xRef.current) >= width) {
      xRef.current += width; // Seamlessly jump back by exactly one width
    }

    marqueeRef.current.style.transform = `translateX(${xRef.current}px)`;
  });

  return (
    <section className="relative overflow-hidden w-full py-8 border-y border-white/5 bg-[#0A0A0A] flex flex-col items-center justify-center">
      <p className="text-center text-[#52525B] text-xs font-medium tracking-[2px] uppercase absolute top-4 left-1/2 -translate-x-1/2 z-20">
        The stack that powers elite B2B teams
      </p>

      {/* LEFT FADE */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10" />

      {/* RIGHT FADE */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10" />

      {/* MARQUEE */}
      <div className="mt-8 w-full overflow-hidden">
        <div ref={marqueeRef} className="flex w-max gap-8 will-change-transform pr-8">
          {loop.map((item, i) => (
            <StackItem key={i} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
