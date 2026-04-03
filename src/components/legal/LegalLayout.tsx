"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Clock, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { LEGAL_CONFIG, LEGAL_MESSAGES } from "@/lib/config/legal";
import { motion } from "framer-motion";
import { AuricaiLogo } from "@/components/ui/AuricaiLogo";

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  sections: { id: string; title: string }[];
}

export function LegalLayout({ title, subtitle, children, sections }: LegalLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const observers = new Map();
    const options = { rootMargin: "-20% 0px -70% 0px", threshold: 0 };

    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(callback, options);
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
        observers.set(section.id, element);
      }
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#A1A1AA] font-sans selection:bg-[#2563EB]/30 selection:text-white">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-6 md:px-12">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight group">
          <AuricaiLogo size={28} className="text-white group-hover:scale-110 transition-transform" />
          <span className="text-white">Auricai</span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </nav>

      {/* Hero Header */}
      <header className="relative py-20 px-6 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(37,99,235,0.1),transparent_50%)]" />
        
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#3B82F6] text-xs font-bold uppercase tracking-wider"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Trust Center
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold text-white tracking-tight"
          >
            {title}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg max-w-2xl mx-auto"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-zinc-500"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last updated: {LEGAL_CONFIG.lastUpdated}
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {LEGAL_CONFIG.privacyEmail}
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-16">
        {/* Policy Text */}
        <article className="prose prose-invert prose-zinc max-w-none 
          prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-4 prose-h2:border-b prose-h2:border-white/5
          prose-p:leading-relaxed prose-p:text-zinc-400
          prose-strong:text-white prose-strong:font-semibold
          prose-ul:list-disc prose-ul:pl-6
          prose-li:text-zinc-400"
        >
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-12 text-amber-200/80 text-sm italic">
            {LEGAL_MESSAGES.disclaimer}
          </div>
          
          {children}
        </article>

        {/* Sidebar Table of Contents */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-6">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">
              On this page
            </h4>
            <nav className="flex flex-col gap-3">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`text-sm transition-all duration-200 hover:text-white ${
                    activeSection === section.id
                      ? "text-white font-medium border-l-2 border-[#2563EB] pl-3 -ml-[2px]"
                      : "text-zinc-500 hover:pl-1"
                  }`}
                >
                  {section.title}
                </a>
              ))}
            </nav>

            <div className="pt-8 mt-8 border-t border-white/5">
              <p className="text-xs text-zinc-600 leading-relaxed uppercase tracking-widest font-bold mb-3">
                Need Help?
              </p>
              <p className="text-xs text-zinc-500 mb-4">
                Have questions about our policies? We're here to help.
              </p>
              <Link
                href={`mailto:${LEGAL_CONFIG.supportEmail}`}
                className="inline-flex items-center gap-2 text-xs font-bold text-white hover:text-[#2563EB] transition-colors"
              >
                Contact Support <ArrowLeft className="w-3 h-3 rotate-180" />
              </Link>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Branding */}
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <p className="text-xs text-zinc-600 uppercase tracking-[0.2em] font-bold mb-4">
          Verified for Enterprise Use
        </p>
        <div className="flex items-center justify-center gap-8 grayscale opacity-40">
          <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
          <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
          <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
        </div>
      </footer>
    </div>
  );
}
