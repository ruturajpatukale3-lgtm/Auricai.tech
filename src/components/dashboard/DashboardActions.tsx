"use client";

import { useRouter } from "next/navigation";

export function DashboardActions() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-4 w-full sm:w-auto">
      <button
        onClick={() => router.push('/dashboard/interviews')}
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 md:py-2.5 rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all flex items-center justify-center gap-2 min-h-[44px] md:min-h-0"
      >
        Send Interview &rarr;
      </button>
    </div>
  );
}
