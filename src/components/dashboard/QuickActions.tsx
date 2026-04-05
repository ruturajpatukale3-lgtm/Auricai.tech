"use client";

import { MessageSquarePlus, PenTool, Copy } from "lucide-react";

export function QuickActions() {
  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-6 h-full flex flex-col hover:-translate-y-[2px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300">
      <h3 className="text-white font-semibold text-base mb-1">Quick Actions</h3>
      <p className="text-xs text-zinc-500 mb-6">Create and share instantly</p>

      <div className="flex-1 flex flex-col gap-3">
        <button className="flex items-center justify-start gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all font-medium text-white group text-sm text-left">
          <div className="bg-blue-600/20 text-blue-500 p-2 rounded-md group-hover:scale-105 transition-transform">
            <MessageSquarePlus className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span>Send new interview</span>
            <span className="text-[10px] text-zinc-500 font-normal">Extract proof from a client</span>
          </div>
        </button>
        
        <button className="flex items-center justify-start gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all font-medium text-white group text-sm text-left">
          <div className="bg-purple-500/20 text-purple-400 p-2 rounded-md group-hover:scale-105 transition-transform">
            <PenTool className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span>Generate case study</span>
            <span className="text-[10px] text-zinc-500 font-normal">From raw transcripts</span>
          </div>
        </button>

        <button className="flex items-center justify-start gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all font-medium text-white group text-sm text-left">
          <div className="bg-green-500/20 text-green-400 p-2 rounded-md group-hover:scale-105 transition-transform">
            <Copy className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span>Copy case study link</span>
            <span className="text-[10px] text-zinc-500 font-normal">Ready for prospects</span>
          </div>
        </button>
      </div>
    </div>
  );
}
