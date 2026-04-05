"use client";

import { Search, ChevronDown, Filter } from "lucide-react";

export function FilterBar() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 w-full">
      {/* Search Bar */}
      <div className="relative w-full sm:w-[320px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by company..."
          className="w-full bg-[#111111] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {/* Filters & Sort */}
      <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
        {/* Status Filter */}
        <div className="flex items-center bg-[#111111] border border-white/10 rounded-lg p-1">
          {["All", "Draft", "Pending", "Live"].map((status) => (
            <button
              key={status}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${status === "All"
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-white hover:bg-white/5"
                }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Sort Dropdown (Visual only for now) */}
        <button className="flex items-center gap-2 bg-[#111111] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap">
          <Filter className="w-3.5 h-3.5" />
          Recent ↓
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      </div>
    </div>
  );
}
