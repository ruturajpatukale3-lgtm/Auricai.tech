"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { SendInterviewModal } from "@/components/dashboard/SendInterviewModal";

export function InterviewPageActions({ isVisible = true }: { isVisible?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!isVisible) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-white hover:bg-zinc-200 text-black px-4 py-2.5 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 transition-all text-center"
      >
        <Plus className="w-4 h-4" /> Send Interview
      </button>

      <SendInterviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
