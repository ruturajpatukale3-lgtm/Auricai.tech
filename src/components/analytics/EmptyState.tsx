"use client";

import React from "react";
import { BarChart2, Send } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export function AnalyticsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] border border-white/5 bg-[#0a0a0a] rounded-2xl p-12 text-center overflow-hidden relative group">
      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 mb-8 shadow-2xl group-hover:border-blue-500/30 transition-colors duration-500">
          <BarChart2 className="w-10 h-10 text-zinc-500 group-hover:text-blue-400 transition-colors duration-500" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">No analytics yet</h2>
        <p className="text-lg text-zinc-400 max-w-md mx-auto mb-10 leading-relaxed">
          Start gathering proof to unlock insights. Send your first interview link to a client to begin tracking performance.
        </p>

        <Link
          href="/dashboard/interviews?action=new"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5"
        >
          <Send className="w-5 h-5" />
          Send Interview
        </Link>
      </motion.div>
    </div>
  );
}
