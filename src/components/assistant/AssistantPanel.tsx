"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Sparkles,
  Mail,
  FileText,
  ArrowUpRight,
  BarChart3,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: { label: string; route: string }[];
};

const quickActions = [
  { label: "Send Interview", icon: Mail, color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
  { label: "Generate Case Study", icon: FileText, color: "text-purple-400 border-purple-500/20 bg-purple-500/10" },
  { label: "View Analytics", icon: BarChart3, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
];

export function AssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  async function handleSend(textOverride?: string) {
    const text = textOverride || inputValue.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, current_route: pathname }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.message,
        actions: data.actions || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If it's feedback and user confirmed, trigger feedback system automatically 
      // (This is a simplified trigger based on response type)
      if (data.type === "feedback" && assistantMsg.actions?.some(a => a.route === "#feedback")) {
        // We could handle the specific feedback POST here if needed or let the user click the button
      }

    } catch (err) {
      toast.error("Failed to connect to Assistant");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAction(action: { label: string; route: string }) {
    if (action.route === "#feedback") {
      // Handle actual feedback submission logic
      const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
      if (lastUserMsg) {
        try {
          await fetch("/api/feedback", {
            method: "POST",
            body: JSON.stringify({ message: lastUserMsg.text }),
          });
          toast.success("Feedback sent! Thank you.");
          // Update message to show confirmation
          setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", text: "Feedback received! our team will review it." }]);
        } catch (e) {
          toast.error("Failed to send feedback");
        }
      }
      return;
    }

    if (action.route.startsWith("/")) {
      router.push(action.route);
      setIsOpen(false);
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-purple-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] active:scale-95 border-0 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 opacity-90" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-[9999] w-[380px] max-w-[calc(100vw-32px)] h-[560px] max-h-[80vh] bg-[#0C0C0E] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-500 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                  <Sparkles className="w-4 h-4 text-white opacity-90" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Auricai Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-zinc-500">Live Product Expert</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 text-zinc-500 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body / Chat */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-6 space-y-4"
            >
              {messages.length === 0 && (
                <div className="text-center pt-8">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600/10 to-purple-500/10 border border-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-blue-400 opacity-80" />
                  </div>
                  <h4 className="text-sm font-medium text-white mb-2">How can I help you today?</h4>
                  <p className="text-xs text-zinc-500 px-8">Ask about sending interviews, creating case studies, or billing.</p>
                </div>
              )}

              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-gradient-to-tr from-blue-600 to-purple-500 text-white rounded-tr-sm shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                      : "bg-white/5 text-zinc-200 border border-white/5 rounded-tl-sm"
                  }`}>
                    {msg.text}

                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => handleAction(action)}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white transition-all cursor-pointer"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3">
                    <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="px-4 py-3 flex gap-2 flex-wrap border-t border-white/5">
              {quickActions.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => handleSend(qa.label)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border ${qa.color} backdrop-blur-md hover:brightness-125 transition-all cursor-pointer`}
                >
                  <qa.icon className="w-3 h-3" />
                  {qa.label}
                </button>
              ))}
            </div>

            {/* Input Overlay */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="p-4 bg-[#0C0C0E]"
            >
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-blue-500/40 focus-within:bg-white/[0.07] transition-all">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 bg-transparent text-[13px] text-white outline-none border-0 placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-500 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-30 disabled:scale-100 disabled:shadow-none border-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
