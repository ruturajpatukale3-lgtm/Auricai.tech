"use client";

import { useState } from "react";
import useSWR from "swr";
import { Link2, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function getTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Recently";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff === 1) return "1 min ago";
  if (diff < 60) return `${diff} mins ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
  return `${Math.floor(diff / 1440)} days ago`;
}

export function AnalyticsHubSpotSection() {
  const { data, error, mutate, isLoading } = useSWR("/api/integrations/hubspot/status", fetcher, {
    revalidateOnFocus: true,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // If still loading or error, we can just optionally hide or show a tiny skeleton. 
  // Given UX rules, failing gracefully is best: don't flash content unnecessarily.
  if (isLoading || error) return null;

  const connected = data?.data?.connected;
  const lastSync = data?.data?.lastSync;

  const handleRefreshDeals = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/integrations/hubspot/deals", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Sync failed");
      toast.success("Successfully synced HubSpot deals!");
      mutate(); // re-fetch status to update the "Last sync" time
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mt-12 bg-[#111] border border-white/10 rounded-xl p-8 relative overflow-hidden group">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A59]/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-[#FF7A59]" />
          <h2 className="text-lg font-bold text-white tracking-tight uppercase">
            {connected ? "HubSpot Connected" : "HubSpot Integration"}
          </h2>
        </div>

        {!connected ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-base font-medium text-white mb-2">
                Connect HubSpot to track real revenue from your case studies.
              </p>
              <p className="text-sm text-zinc-500">
                Link your CRM to see pipeline influenced, deals won, and verified ROI.
              </p>
            </div>
            <a
              href="/api/integrations/hubspot/connect"
              className="whitespace-nowrap inline-flex items-center gap-2 bg-[#FF7A59] border border-[#FF7A59]/50 text-white px-6 py-3 font-bold text-sm rounded-lg hover:bg-[#FF7A59]/90 hover:shadow-[0_0_20px_rgba(255,122,89,0.3)] transition-all"
            >
              Connect HubSpot
            </a>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-base font-medium text-white mb-2">
                Your CRM is connected and syncing deal data.
              </p>
              <p className="text-sm text-zinc-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Last sync: {getTimeAgo(lastSync)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefreshDeals}
                disabled={isRefreshing}
                className="whitespace-nowrap bg-white/5 text-white border border-white/10 px-5 py-2.5 text-sm font-medium rounded-lg hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : <RefreshCw className="w-4 h-4 text-zinc-400" />}
                Refresh Deals
              </button>
              <a
                href="/dashboard/deals"
                className="whitespace-nowrap bg-white text-black px-5 py-2.5 text-sm font-bold rounded-lg hover:bg-zinc-200 transition-all flex items-center gap-2"
              >
                View Deals <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
