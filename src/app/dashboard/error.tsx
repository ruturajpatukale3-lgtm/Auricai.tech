"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";

/**
 * Global Dashboard Error Boundary
 * 
 * Prevents full app crashes and provides a localized recovery UI for specific dashboard segments.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an external service (or console for now)
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="w-full flex-1 min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Something went wrong</h2>
      <p className="text-zinc-500 max-w-md mb-8 text-sm leading-relaxed">
        We encountered a problem loading your data. This might be a temporary connection issue.
      </p>

      <div className="flex items-center gap-4">
        <MagneticButton
          variant="ghost"
          onClick={() => (window.location.href = "/dashboard/command-center")}
          className="px-6 py-2.5 text-sm font-bold"
        >
          Return Home
        </MagneticButton>
        
        <MagneticButton
          variant="white"
          onClick={reset}
          className="px-6 py-2.5 text-sm font-bold flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </MagneticButton>
      </div>

      <div className="mt-12 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
        ErrorID: {error.digest || "unknown_env_fail"}
      </div>
    </div>
  );
}
