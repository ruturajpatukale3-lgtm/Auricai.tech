"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, ExternalLink, X } from "lucide-react";
import { useNotifications, apiPatch } from "@/lib/hooks/useSWR";
import type { Notification } from "@/types";

const NOTIFICATION_ICONS: Record<string, string> = {
  interview_completed: "📋",
  case_study_ready: "✨",

  usage_warning: "⚠️",
  usage_limit_reached: "🔒",
  system: "ℹ️",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, mutate } = useNotifications();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    await apiPatch("/api/notifications", { notificationId });
    mutate();
  };

  const handleMarkAllAsRead = async () => {
    await apiPatch("/api/notifications", { markAllRead: true });
    mutate();
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
        id="notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-blue-500 border-2 border-[#0A0A0A] text-[10px] font-bold text-white px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-[#111111] border border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-bold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="w-8 h-8 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500 text-center">No notifications yet</p>
                <p className="text-xs text-zinc-600 text-center mt-1">
                  You&apos;ll be notified when interviews are completed, case studies are ready, and new proof is generated.
                </p>
              </div>
            ) : (
              notifications.map((n: Notification) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-default ${
                    !n.read ? "bg-blue-500/5" : ""
                  }`}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">
                    {NOTIFICATION_ICONS[n.type] || "📌"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${n.read ? "text-zinc-400" : "text-white"}`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n.id);
                      }}
                      className="flex-shrink-0 p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-colors mt-0.5"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-white/5">
              <p className="text-[10px] text-zinc-600 text-center">
                Showing latest {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
