"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { SendInterviewModal } from "@/components/dashboard/SendInterviewModal";

export function CaseStudiesPageActions() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-white hover:bg-zinc-200 text-black px-4 py-2.5 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 transition-all text-center"
      >
        <Mail className="w-4 h-4" /> Send Interview
      </button>

      <SendInterviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
