"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { nanoid } from "nanoid";
import { ChatButton } from "./ChatButton";
import { ChatPanel } from "./ChatPanel";
import type { ChatMessageData } from "./ChatMessage";

/* ─── Canned bot responses by quick action ─── */
const quickActionResponses: Record<string, string> = {
  "Send Interview":
    "To send an interview, head to the **Interviews** page and click **Send Interview** in the top-right. You'll enter the customer's name, email, and an optional personal message. The invite goes out immediately via email.",
  "Generate Case Study":
    "Case studies are generated automatically once a client completes an interview. Head to the **Interviews** page to send an invite. As soon as your client finishes the chat, our AI will extract metrics and structure your case study for review.",
  "Push to HubSpot":
    "Open any case study or deal, then hit the **Push to HubSpot** button. You'll be able to attribute the deal value and link it to a HubSpot contact for full revenue attribution.",
  "View Analytics":
    "Your **Analytics** dashboard shows interview completion rates, case study performance, and deal pipeline attribution. Use the date-range filter to drill into specific periods.",
};

/* ─── Fallback bot reply ─── */
function generateBotReply(userMsg: string): string {
  const lower = userMsg.toLowerCase();
  if (lower.includes("interview"))
    return quickActionResponses["Send Interview"];
  if (lower.includes("case stud"))
    return quickActionResponses["Generate Case Study"];
  if (lower.includes("hubspot"))
    return quickActionResponses["Push to HubSpot"];
  if (lower.includes("analytic") || lower.includes("dashboard"))
    return quickActionResponses["View Analytics"];
  if (lower.includes("pricing") || lower.includes("plan") || lower.includes("credit"))
    return "Check out **Settings → Billing** to manage your subscription. You can upgrade your plan or purchase additional credits anytime.";
  if (lower.includes("help") || lower.includes("support"))
    return "I'm here to help! You can ask me about sending interviews, automated case studies, HubSpot integrations, or understanding your analytics.";

  return "I can help with interviews, case studies, HubSpot integrations, analytics, and billing. Could you tell me more about what you need?";
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const addBotReply = useCallback((content: string) => {
    setIsTyping(true);
    const delay = Math.min(400 + content.length * 5, 1500);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "bot",
          content,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, delay);
  }, []);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    setMessages((prev) => [
      ...prev,
      { id: nanoid(), role: "user", content: text, timestamp: new Date() },
    ]);
    setInputValue("");

    addBotReply(generateBotReply(text));
  }, [inputValue, isTyping, addBotReply]);

  const handleQuickAction = useCallback(
    (label: string) => {
      /* Insert as user message, then bot responds */
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "user",
          content: label,
          timestamp: new Date(),
        },
      ]);

      const reply =
        quickActionResponses[label] ??
        "I'll help you with that. Could you give me more details?";
      addBotReply(reply);
    },
    [addBotReply]
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <ChatPanel
            messages={messages}
            isTyping={isTyping}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={handleSend}
            onQuickAction={handleQuickAction}
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <ChatButton
        isOpen={isOpen}
        onClick={() => setIsOpen((o) => !o)}
        unreadCount={0}
      />
    </>
  );
}
