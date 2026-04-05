"use client";

import { motion } from "framer-motion";

const interviewData = [
  { day: "Mon", count: 2 },
  { day: "Tue", count: 4 },
  { day: "Wed", count: 3 },
  { day: "Thu", count: 7 },
  { day: "Fri", count: 5 },
  { day: "Sat", count: 1 },
  { day: "Sun", count: 0 },
];

const viewData = [
  { day: "Mon", count: 120 },
  { day: "Tue", count: 140 },
  { day: "Wed", count: 300 },
  { day: "Thu", count: 280 },
  { day: "Fri", count: 200 },
  { day: "Sat", count: 80 },
  { day: "Sun", count: 100 },
];

export function AnalyticsCharts() {
  const maxInterviews = Math.max(...interviewData.map((d) => d.count));
  const maxViews = Math.max(...viewData.map((d) => d.count));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Chart 1: Interviews over time */}
      <div className="bg-[#111111] border border-white/10 rounded-xl p-6 hover:-translate-y-[2px] transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:border-white/20">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-white font-semibold text-base mb-1">Interviews Sent</h3>
            <p className="text-xs text-zinc-500">Engagement mining volume</p>
          </div>
          <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">Last 7D</span>
        </div>

        <div className="h-40 flex items-end justify-between gap-2 mt-4">
          {interviewData.map((data, i) => {
            const height = data.count === 0 ? 5 : (data.count / maxInterviews) * 100;
            return (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-300 font-mono">
                  {data.count}
                </div>
                <div className="w-full relative bg-white/5 rounded-t-md overflow-hidden" style={{ height: "100%" }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05, type: "spring" }}
                    className="absolute bottom-0 w-full bg-blue-600 group-hover:bg-blue-400 rounded-t-md transition-colors"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 uppercase">{data.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart 2: Case study views */}
      <div className="bg-[#111111] border border-white/10 rounded-xl p-6 hover:-translate-y-[2px] transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:border-white/20">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-white font-semibold text-base mb-1">Asset Usage</h3>
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Engagement from live proof
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">Last 7D</span>
        </div>

        <div className="h-40 flex items-end justify-between gap-2 mt-4">
          {viewData.map((data, i) => {
            const height = data.count === 0 ? 5 : (data.count / maxViews) * 100;
            return (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-300 font-mono">
                  {data.count}
                </div>
                <div className="w-full relative bg-white/5 rounded-t-md overflow-hidden" style={{ height: "100%" }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 + 0.2, type: "spring" }}
                    className="absolute bottom-0 w-full bg-amber-500 group-hover:bg-amber-400 rounded-t-md transition-colors"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 uppercase">{data.day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
