"use client";

import { motion } from "framer-motion";

export function UsageOverTimeChart({ data }: { data: { date: string; count: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-[#111111] border border-white/10 rounded-xl p-6 h-[300px] flex items-center justify-center">
        <p className="text-zinc-500 text-sm italic">Insufficient data for trend analysis.</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const displayData = data.slice(-7); // Show last 7 units

  return (
    <div className="w-full bg-[#111111] border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-semibold text-white">Usage Over Time</h3>
          <p className="text-xs text-zinc-500">Case study views vs. usage in deals</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Events</span>
          </div>
        </div>
      </div>

      <div className="h-[200px] flex items-end justify-between gap-2">
        {displayData.map((item, i) => (
          <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="relative w-full flex flex-col items-center justify-end h-full gap-1">
              {/* Event Bar (Primary) */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(item.count / maxCount) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="w-full max-w-[24px] bg-blue-500 rounded-t-sm relative group-hover:bg-blue-400 transition-colors"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                  {item.count} events
                </div>
              </motion.div>
            </div>
            <span className="text-[10px] text-zinc-600 font-medium uppercase">{new Date(item.date).toLocaleDateString([], { weekday: 'short' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
