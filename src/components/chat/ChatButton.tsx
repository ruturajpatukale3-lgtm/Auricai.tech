"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

type ChatButtonProps = {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
};

export function ChatButton({ isOpen, onClick, unreadCount = 0 }: ChatButtonProps) {
  return (
    <motion.button
      id="chat-widget-toggle"
      aria-label={isOpen ? "Close chat" : "Open chat"}
      onClick={onClick}
      className="fixed bottom-5 right-5 z-[9999] w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center cursor-pointer border-0 outline-none"
      style={{
        boxShadow:
          "0 4px 24px rgba(37, 99, 235, 0.35), 0 0 0 0 rgba(37, 99, 235, 0)",
      }}
      whileHover={{
        scale: 1.08,
        boxShadow:
          "0 6px 32px rgba(37, 99, 235, 0.5), 0 0 0 4px rgba(37, 99, 235, 0.12)",
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.span
            key="close"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </motion.span>
        ) : (
          <motion.span
            key="chat"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Unread badge */}
      <AnimatePresence>
        {!isOpen && unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center shadow-lg"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
