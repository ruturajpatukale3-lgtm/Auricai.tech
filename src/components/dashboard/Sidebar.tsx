"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuricaiLogo } from "@/components/ui/AuricaiLogo";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  AlertCircle,
  Sparkles,
  Activity,
  Users,
  X,
  Terminal,
  RefreshCw
} from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";
import { getPlanLimits } from "@/lib/plans";

const navigation = [
  { name: "Command Center", href: "/dashboard/command-center", icon: LayoutDashboard },
  { name: "Case Studies", href: "/dashboard/case-studies", icon: FileText },
  { name: "Interviews", href: "/dashboard/interviews", icon: MessageSquare },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={`
      fixed inset-y-0 left-0 flex flex-col w-64 bg-[#0A0A0A] border-r border-white/10 z-[50]
      transition-transform duration-300 ease-in-out
      ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      md:flex
    `}>
      <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2.5 group transition-all">
          <AuricaiLogo size={28} className="text-white group-hover:scale-110 transition-transform" />
          <span className="text-white font-bold tracking-tight">Auricai</span>
        </Link>
        <button 
          className="p-2 -mr-2 text-zinc-500 hover:text-white md:hidden"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-500"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 space-y-4">
        {/* Real-time Usage Progress */}
        <SidebarUsage />

        {/* Dev Mode Control (Only for dev users) */}
        <DevTestModeControl />

        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${pathname.startsWith("/dashboard/settings")
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
        >
          <Settings className={`w-4 h-4 ${pathname.startsWith("/dashboard/settings") ? "text-white" : "text-zinc-500"}`} />
          Settings
        </Link>
      </div>
    </div>
  );
}

function SidebarUsage() {
  const { interviewsUsed, interviewsLimit, usagePercent, planType, planLabel, isLoading } = useSubscription();

  if (isLoading) return <div className="h-10 bg-white/5 rounded-lg animate-pulse" />;

  const limits = getPlanLimits(planType as any);
  const isSoftUnlimited = limits?.isSoftUnlimited;
  const isUnlimited = interviewsLimit === -1 || isSoftUnlimited;

  const getColor = (percent: number) => {
    if (percent >= 100) return "bg-red-500";
    if (percent >= 90) return "bg-orange-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <div className="px-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-zinc-500">
        <span>Usage</span>
        <span className={usagePercent >= 90 && !isUnlimited ? "text-orange-400" : ""}>
          {interviewsUsed} / {isUnlimited ? "Unlimited" : interviewsLimit}
        </span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor(isUnlimited ? 0 : usagePercent)}`}
          style={{ width: `${isUnlimited ? 0 : Math.min(usagePercent, 100)}%` }}
        />
      </div>
      <div className="text-[9px] text-zinc-600 flex justify-between items-center">
        <span>{planLabel}</span>
        {usagePercent >= 90 && !isUnlimited && <span className="text-orange-500 animate-pulse font-bold">Upgrade</span>}
      </div>
    </div>
  );
}

function DevTestModeControl() {
  const { isDevMode, setDevPlan, planType } = useSubscription();

  if (!isDevMode) return null;

  return (
    <div className="mx-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
        <Terminal className="w-3 h-3" />
        DEV TEST MODE ACTIVE
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {(["starter", "growth", "enterprise"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setDevPlan(p)}
            className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
              planType === p 
                ? "bg-blue-500 text-white" 
                : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10"
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      
      <button 
        onClick={() => {
          document.cookie = "cf_dev_plan=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          window.location.reload();
        }}
        className="flex items-center gap-1.5 text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <RefreshCw className="w-2.5 h-2.5" />
        Reset to Real
      </button>
    </div>
  );
}

