"use client";

import { useState } from "react";
import { Search, Loader2, Plus, Menu } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { NotificationPanel } from "@/components/dashboard/NotificationPanel";
import { SendInterviewModal } from "@/components/dashboard/SendInterviewModal";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const router = useRouter();

  const handleInterviewSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <header className="h-16 border-b border-white/10 bg-[#0A0A0A] flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-4 flex-1">
          <button 
            className="p-2 -ml-2 text-zinc-500 hover:text-white md:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex flex-1">
            {/* ⌘K style search box */}
            <div className="relative group w-full max-w-sm hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-[#111111] border border-white/10 rounded-lg pl-10 pr-12 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Global Live Indicator Removed */}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Sticky Actions - Only hide on smallest screens if needed, or keep for LG */}
          <div className="hidden lg:flex items-center gap-3 mr-4 border-r border-white/10 pr-6">
            <button 
              onClick={() => setIsInterviewModalOpen(true)}
              className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all flex items-center gap-2"
            >
              Send Interview →
            </button>
          </div>

          <div className="flex items-center gap-2">
            <NotificationPanel />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Send Interview Modal */}
      <SendInterviewModal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        onSuccess={handleInterviewSuccess}
      />
    </>
  );
}
