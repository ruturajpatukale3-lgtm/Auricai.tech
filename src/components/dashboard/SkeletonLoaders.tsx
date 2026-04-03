"use client";

import { motion } from "framer-motion";

/**
 * Common Skeleton Loaders for Auricai Dashboard
 * 
 * Provides high-fidelity, flicker-free loading states for the RSC-driven dashboard.
 */

export function OverviewStripSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-[#111111] border border-white/10 rounded-xl p-5 h-[120px]">
          <div className="h-4 w-24 bg-white/5 rounded mb-4" />
          <div className="h-10 w-20 bg-white/5 rounded mb-2" />
          <div className="h-3 w-32 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  );
}

export function RecentActivitySkeleton() {
  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-6 h-full flex flex-col animate-pulse">
      <div className="h-6 w-32 bg-white/5 rounded mb-2" />
      <div className="h-4 w-48 bg-white/5 rounded mb-8" />
      <div className="flex-1 space-y-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-6">
            <div className="w-8 h-8 rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-full bg-white/5 rounded" />
              <div className="h-3 w-24 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full bg-[#111111] border border-white/10 rounded-xl overflow-hidden mt-6 animate-pulse">
      <div className="h-12 border-b border-white/5 px-6 flex items-center justify-between">
        <div className="h-4 w-32 bg-white/5 rounded" />
        <div className="h-4 w-64 bg-white/5 rounded" />
      </div>
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-white/5" />
            <div className="flex-1 h-5 bg-white/5 rounded" />
            <div className="w-24 h-5 bg-white/5 rounded" />
            <div className="w-32 h-5 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GlobalDashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
      <div className="flex justify-between mb-8 mt-2">
        <div>
          <div className="h-8 w-48 bg-white/5 rounded mb-2" />
          <div className="h-4 w-64 bg-white/5 rounded" />
        </div>
      </div>
      <OverviewStripSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        <div className="lg:col-span-8">
          <TableSkeleton rows={6} />
        </div>
        <div className="lg:col-span-4">
          <RecentActivitySkeleton />
        </div>
      </div>
    </div>
  );
}
