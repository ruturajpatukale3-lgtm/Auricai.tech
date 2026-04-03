"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { Loader2, ArrowRight } from "lucide-react";
import { SmartInsight } from "@/types";

interface SmartInsightActionCardProps {
  insight: SmartInsight;
}

export function SmartInsightActionCard({ insight }: { insight: SmartInsight }) {
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!insight.action || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/analytics/insights/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: insight.type, 
          action: insight.action,
          title: insight.title 
        }),
      });

      if (!res.ok) throw new Error("Failed to execute action");

      toast.success(`${insight.action} initiated successfully!`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${insight.action.toLowerCase()}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (!insight.action) return null;

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className="relative z-10 bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all flex items-center gap-2 flex-shrink-0 group/btn disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {insight.action} 
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </>
      )}
    </button>
  );
}
