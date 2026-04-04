"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { usePathname } from "next/navigation";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  isProfileComplete: boolean;
}

export function DashboardLayoutClient({
  children,
  isProfileComplete,
}: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Automatically close sidebar when navigation occurs on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen w-full bg-[#0A0A0A] text-white">
      {/* Sidebar Mobile Overlay & Desktop Fixed */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-x-hidden">
          <SubscriptionBanner />
          
          {!isProfileComplete && (
            <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 md:px-6 py-3 flex items-center justify-between text-yellow-500 text-sm">
              <p className="truncate mr-4">⚠️ Business context missing. AI disabled.</p>
              <a href="/onboarding?step=2" className="underline font-bold shrink-0">Setup</a>
            </div>
          )}

          <div className="min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
