/**
 * Navbar — Fixed top navigation with scroll-triggered backdrop blur.
 * Transparent at top → backdrop-blur-xl + bg-black/60 on scroll.
 * Height: 64px. Auricai wordmark with blue accent on "Auri".
 */

"use client";

import { Show, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";
import MagneticButton from "@/components/ui/MagneticButton";
import { AuricaiLogo } from "@/components/ui/AuricaiLogo";
import { useCTARedirect } from "@/lib/useCTARedirect";
import { useRouter } from "next/navigation";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Customers", href: "#proof-center" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const { handleCTA, isRedirecting, isSignedIn } = useCTARedirect();
  const router = useRouter();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <motion.nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 transition-all duration-300",
        scrolled
          ? "bg-black/60 backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)]"
          : "bg-transparent border-b border-transparent"
      )}
    >
      {/* Logo */}
      <a href="#" className="flex items-center gap-2 text-xl font-bold tracking-tight group">
        <AuricaiLogo size={32} className="text-white group-hover:scale-110 transition-transform duration-200" />
        <span className="text-white">Auricai</span>
      </a>

      {/* Center nav links — hidden on mobile */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="group relative text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-200"
          >
            {link.label}
            <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#FAFAFA] transition-all duration-200 group-hover:w-full" />
          </a>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/sign-in")}
              className="hidden sm:inline-flex text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-200 cursor-pointer"
            >
              Sign In
            </button>
            <SignUpButton mode="modal">
              <MagneticButton
                variant="white"
                size="default"
                className="text-sm px-4 py-2"
                disabled={isRedirecting}
              >
                {isRedirecting ? "Connecting..." : "Start Free"}
              </MagneticButton>
            </SignUpButton>
          </div>
        </Show>
        <Show when="signed-in">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCTA}
              disabled={isRedirecting}
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {isRedirecting ? "Loading..." : "Dashboard"}
            </button>
            <UserButton />
          </div>
        </Show>
      </div>
    </motion.nav>
  );
}
