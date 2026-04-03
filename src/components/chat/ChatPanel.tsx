"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Send,
  Sparkles,
  Mail,
  FileText,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";
import { ChatMessage, TypingIndicator } from "./ChatMessage";
import type { ChatMessageData } from "./ChatMessage";

/* ─── Quick Action Config ─── */
const quickActions = [
  { label: "Send Interview", icon: Mail, color: "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400" },
  { label: "Generate Case Study", icon: FileText, color: "from-purple-500/20 to-purple-600/10 border-purple-500/20 text-purple-400" },
  { label: "Push to HubSpot", icon: ArrowUpRight, color: "from-orange-500/20 to-orange-600/10 border-orange-500/20 text-orange-400" },
  { label: "View Analytics", icon: BarChart3, color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400" },
];

/* ─── Empty state bullets ─── */
const capabilities = [
  "Sending interviews to customers",
  "Creating & publishing case studies",
  "Pushing deals to HubSpot",
  "Understanding your analytics",
];

/* ─── Panel Props ─── */
type ChatPanelProps = {
  messages: ChatMessageData[];
  isTyping: boolean;
  inputValue: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onQuickAction: (label: string) => void;
  onClose: () => void;
};

export function ChatPanel({
  messages,
  isTyping,
  inputValue,
  onInputChange,
  onSend,
  onQuickAction,
  onClose,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll to bottom */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && inputValue.trim()) {
      e.preventDefault();
      onSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <motion.div
      id="chat-panel"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 32 }}
      className="fixed bottom-22 right-5 z-[9998] w-[360px] max-sm:w-[calc(100vw-24px)] max-sm:right-3 max-sm:bottom-20 flex flex-col overflow-hidden"
      style={{
        height: "min(520px, calc(100dvh - 120px))",
        borderRadius: 20,
        boxShadow:
          "0 25px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)",
        background: "linear-gradient(180deg, #111113 0%, #0C0C0E 100%)",
      }}
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-white leading-tight">
              Auricai Assistant
            </h3>
            <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
              Ask anything about features
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer bg-transparent border-0"
          aria-label="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Body ─── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ scrollbarGutter: "stable" }}
      >
        {isEmpty ? (
          /* ─── Empty State ─── */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center text-center pt-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/10 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-[13px] text-zinc-300 font-medium mb-1">
              Hi 👋 I can help you with:
            </p>
            <ul className="text-[12.5px] text-zinc-500 space-y-1.5 mt-3 text-left">
              {capabilities.map((cap) => (
                <li key={cap} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-500/60 mt-[7px] shrink-0" />
                  {cap}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : (
          /* ─── Messages ─── */
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        {isTyping && <TypingIndicator />}
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onQuickAction(action.label)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-gradient-to-br ${action.color} border backdrop-blur-sm hover:brightness-125 transition-all cursor-pointer`}
          >
            <action.icon className="w-3 h-3" />
            {action.label}
          </button>
        ))}
      </div>

      {/* ─── Input ─── */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500/40 transition-colors">
          <input
            id="chat-input"
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about features..."
            disabled={isTyping}
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-zinc-600 outline-none border-0 disabled:opacity-40"
          />
          <button
            onClick={onSend}
            disabled={!inputValue.trim() || isTyping}
            className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-white/[0.06] disabled:text-zinc-600 text-white flex items-center justify-center transition-all cursor-pointer border-0 shrink-0"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
