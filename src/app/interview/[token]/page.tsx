"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { PoweredByAuricai } from "@/components/shared/PoweredByAuricai";

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  intent?: string;
}

interface APIResponse {
  success: boolean;
  data?: {
    question?: string;
    intent?: string;
    options?: string[];
    isFollowUp?: boolean;
    isComplete?: boolean;
    questionNumber?: number;
    totalMax?: number;
    caseStudy?: Record<string, any>;
  };
  error?: string;
  isComplete?: boolean;
  isValidationRejection?: boolean;
}

type Screen = "welcome" | "comfort" | "chat" | "review" | "complete";

// ═══════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════
export default function InterviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [screen, setScreen] = useState<Screen>("welcome");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalMax] = useState(6);
  const [currentIntent, setCurrentIntent] = useState<string>("business_context");
  const [orgName, setOrgName] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [planName, setPlanName] = useState<string>("starter");
  const [isInvalid, setIsInvalid] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [errorType, setErrorType] = useState<"INVALID" | "SERVER_ERROR" | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [hasTrackedProgress, setHasTrackedProgress] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ─── LocalStorage Session Persistence ─────────────────────
  useEffect(() => {
    try {
      const cachedStr = localStorage.getItem(`auricai_session_${token}`);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.messages?.length > 0) {
          setMessages(cached.messages);
          setScreen(cached.screen || "chat");
          setQuestionNumber(cached.questionNumber || 0);
          setCurrentIntent(cached.currentIntent || "business_context");
        }
      }
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    if (messages.length > 0 || screen !== "welcome") {
      try {
        localStorage.setItem(`auricai_session_${token}`, JSON.stringify({
          messages,
          screen,
          questionNumber,
          currentIntent
        }));
      } catch { /* ignore */ }
    }
  }, [messages, screen, questionNumber, currentIntent, token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (screen === "chat" && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [screen, isLoading, messages.length]);

  // ─── Initial Logic ─────────────────────────────────────────
  // ─── Auto-start: validate token then immediately begin interview ──
  const initializeInterview = useCallback(async () => {
    console.log("STEP 1: Page loaded with token:", token);
    setIsValidating(true);
    setErrorType(null);
    setIsInvalid(false);

    try {
      console.log("STEP 2: Fetch triggered — /api/public/interview/" + token);
      const res = await fetch(`/api/public/interview/${token}`);
      console.log("STEP 5: API response status:", res.status);

      if (res.status === 404 || res.status === 410) {
        console.warn("FAILURE POINT: STEP 5 — Token not found or expired (HTTP", res.status, ")");
        setErrorType("INVALID");
        setIsInvalid(true);
        return;
      }

      if (!res.ok) {
        setErrorType("SERVER_ERROR");
        setIsInvalid(true);
        const errData = await res.json().catch(() => ({}));
        console.error("FAILURE POINT: STEP 5 — API error:", errData);
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }

      const response = await res.json();
      console.log("STEP 5: API response data:", { success: response.success, hasData: !!response.data, clientName: response.data?.client_name });

      if (response?.data?.client_name) {
        setClientName(response.data.client_name);
      }
      if (response?.data?.client_name) {
        setOrgName(response.data.client_name);
      }
      if (response?.data?.plan_name) {
        setPlanName(response.data.plan_name);
      }
      if (response?.data?.id) {
        setInterviewId(response.data.id);
      }
      if (response?.data?.org_id) {
        setOrgId(response.data.org_id);
      }

      // ── Session Detection & Initial Screen ────────
      const cachedStr = localStorage.getItem(`auricai_session_${token}`);
      const hasCachedMessages = cachedStr ? JSON.parse(cachedStr)?.messages?.length > 0 : false;
      
      if (hasCachedMessages) {
        console.log("STEP 6: Resuming cached session");
        setScreen("chat");
      } else {
        console.log("STEP 6: Showing welcome screen (fresh session)");
        setScreen("welcome");
      }
    } catch (err: any) {
      console.error("FAILURE POINT: INITIALIZATION ERROR:", err.message);
      setErrorType("SERVER_ERROR");
      setIsInvalid(true);
      setError(err.message || "Failed to load interview");
    } finally {
      setIsValidating(false);
    }
  }, [token]);

  useEffect(() => {
    setIsMounted(true);
    if (token) {
      initializeInterview().then(() => {
        // Track 'open' event in background (no await)
        trackOpen();
      });
    }
  }, [token, initializeInterview]);

  const trackOpen = async (retries = 1) => {
    // 1. Session Guard (Multi-tab safety)
    if (typeof window !== "undefined" && sessionStorage.getItem(`auricai_open_${token}`)) return;
    
    try {
      const res = await fetch(`/api/public/interview/${token}/open`, { method: "POST" });
      if (res.ok) {
        sessionStorage.setItem(`auricai_open_${token}`, "true");
      }
    } catch (err) {
      if (retries > 0) setTimeout(() => trackOpen(retries - 1), 2000);
    }
  };

  const trackProgress = async (retries = 1) => {
    // 1. Session Guard (Multi-tab safety)
    if (typeof window !== "undefined" && sessionStorage.getItem(`auricai_progress_${token}`)) {
      setHasTrackedProgress(true);
      return;
    }

    try {
      const res = await fetch(`/api/public/interview/${token}/progress`, { method: "POST" });
      if (res.ok) {
        setHasTrackedProgress(true);
        sessionStorage.setItem(`auricai_progress_${token}`, "true");
      }
    } catch (err) {
      if (retries > 0) setTimeout(() => trackProgress(retries - 1), 2000);
    }
  };

  const trackComplete = async (retries = 1) => {
    try {
      await fetch(`/api/public/interview/${token}/complete`, { method: "POST" });
    } catch (err) {
      if (retries > 0) setTimeout(() => trackComplete(retries - 1), 2000);
    }
  };

  // ─── Keep-Alive Polling (30s) ───────────────────────────
  useEffect(() => {
    if (screen !== "chat") return;
    
    const interval = setInterval(() => {
      // Small pulse to keep 'last_activity' current on backend
      fetch(`/api/public/interview/${token}/status`, { method: "GET" }).catch(() => {});
    }, 30000);
    
    return () => clearInterval(interval);
  }, [screen, token]);

  // ─── Watermark Logic ──────────────────────────────────────
  const isEnterprise = planName === "enterprise";

  // ─── API Call ──────────────────────────────────────────────
  const callNextQuestion = useCallback(
    async (answer?: string, intent?: string, question?: string) => {
      console.log("STEP [callNextQuestion]: Calling next-question API", { answer: answer?.substring(0, 50), intent, question: question?.substring(0, 50) });
      setIsLoading(true);
      setError(null);

      try {
        const body: Record<string, string> = {};
        if (answer) body.answer = answer;
        if (intent) body.intent = intent;
        if (question) body.question = question;

        const res = await fetch(`/api/public/interview/${token}/next-question`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        console.log("STEP [callNextQuestion]: Response status:", res.status);
        const data: APIResponse = await res.json();
        console.log("STEP [callNextQuestion]: Response data:", { success: data.success, hasQuestion: !!data.data?.question, isComplete: data.data?.isComplete, error: data.error });

        if (!res.ok || !data.success) {
          if (data.isComplete) {
            localStorage.removeItem(`auricai_session_${token}`);
            setScreen("complete");
            return;
          }
          if (data.isValidationRejection) {
            setMessages((prev) => [
              ...prev,
              {
                id: `ai-val-${Date.now()}`,
                role: "ai",
                text: data.error || "Could you clarify that a bit?",
              },
            ]);
            return;
          }
          throw new Error(data.error || "Something went wrong");
        }

        if (data.data?.isComplete) {
          localStorage.removeItem(`auricai_session_${token}`);
          trackComplete(); // Explicit production hardening
          setScreen("review");
          return;
        }

        if (data.data?.question) {
          console.log("STEP [callNextQuestion]: Adding AI question to messages:", data.data.question.substring(0, 60));
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: "ai",
              text: data.data!.question!,
              intent: data.data!.intent,
            },
          ]);
          setQuestionNumber(data.data.questionNumber || 0);
          setCurrentIntent(data.data.intent || "business_context");
          setCurrentOptions(data.data.options || []);
        }
      } catch (err: any) {
        console.error("FAILURE POINT: callNextQuestion error:", err.message);
        setError(err.message || "Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  // ─── Handlers ─────────────────────────────────────────────
  function handleStart() {
    setScreen("comfort");
  }

  function proceedToChat() {
    // Inject pre-interview greeting (system message, NOT a question)
    setMessages([
      {
        id: "greeting-system",
        role: "ai",
        text: "Thanks for taking a moment to share your experience — really appreciate it.\n\nThis will only take about 2–3 minutes. You don't need exact numbers — rough answers are totally fine.\n\nI'll guide you through a few simple questions.",
      },
    ]);
    setScreen("chat");
    callNextQuestion();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const answer = inputValue.trim();
    if (!answer || isLoading) return;

    const lastAiMessage = [...messages].reverse().find((m) => m.role === "ai");
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", text: answer },
    ]);
    setInputValue("");
    
    callNextQuestion(answer, currentIntent, lastAiMessage?.text);

    // Track first progress
    if (!hasTrackedProgress) {
      trackProgress();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  async function handleApprove() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/public/interview/${token}/approve`, { method: "POST" });
      if (res.ok) {
        setScreen("complete");
      } else {
        throw new Error("Failed to approve");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Hydration & Validation Guard ─────────────────────────
  if (!isMounted || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0B0B0C", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border border-[#1F1F1F] rounded-lg flex items-center justify-center mx-auto mb-4"
          >
            <Loader2 className="w-5 h-5 text-[#A1A1AA]" />
          </motion.div>
          <p className="text-xs text-[#A1A1AA] tracking-wide">
            Verifying secure link
          </p>
        </div>
      </div>
    );
  }

  // ─── Invalid Token / Error States ─────────────────────────
  if (isInvalid) {
    const isServerError = errorType === "SERVER_ERROR";

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0B0B0C", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-12 h-12 rounded-lg border border-[#1F1F1F] flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-5 h-5 text-[#A1A1AA]" />
          </div>
          <h1 className="text-lg font-semibold text-white mb-2 tracking-tight">
            {isServerError ? "Connection Error" : "Invalid Interview Link"}
          </h1>
          <p className="text-sm text-[#A1A1AA] mb-8 leading-relaxed">
            {isServerError
              ? (error || "We're having trouble connecting to the server. Please try again.")
              : "This interview link is invalid or has expired."}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => initializeInterview()}
              className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
            <a
              href="/"
              className="text-xs text-[#A1A1AA] hover:text-white transition-colors py-2"
            >
              Return Home
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // WELCOME SCREEN
  // ═══════════════════════════════════════
  if (screen === "welcome") {
    const isEnterprise = planName === "business" || planName === "scale";

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 sm:p-10 relative"
        style={{ background: "#0B0B0C", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full max-w-[480px]"
        >
          {/* Brand header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            {orgName ? (
              <p className="text-xs text-white/40 tracking-wide">
                Requested by {orgName}
              </p>
            ) : (
              <p className="text-xs text-white/40 tracking-wide">
                Case Study Interview
              </p>
            )}
          </motion.div>

          {/* Time estimate */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <span className="text-sm text-[#A1A1AA]">
              This will take approximately 3 minutes.
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-semibold text-white mb-4 tracking-tight leading-tight"
          >
            Submit Your Results for Case Study Documentation
          </motion.h1>

          {/* Context */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[15px] text-[#A1A1AA] leading-relaxed mb-8"
          >
            Your responses will be used to create a structured case study outlining measurable outcomes.
          </motion.p>

          {/* Trust lines — stacked with subtle separators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8 space-y-0"
          >
            <div className="flex items-center gap-3 py-3 border-t border-[#1F1F1F]">
              <span className="text-sm text-[#A1A1AA]">5 structured questions</span>
            </div>
            <div className="flex items-center gap-3 py-3 border-t border-[#1F1F1F]">
              <span className="text-sm text-[#A1A1AA]">No login required</span>
            </div>
            <div className="flex items-center gap-3 py-3 border-t border-[#1F1F1F] border-b">
              <span className="text-sm text-[#A1A1AA]">Final approval required before publication</span>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 bg-white text-black h-12 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <span>Begin Interview</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>

          {/* Micro proof */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-xs text-white/30 leading-relaxed"
          >
            Typical submissions include measurable improvements (e.g. conversion rate increases).
          </motion.p>
        </motion.div>

        {/* Minimal branding */}
        <div className="absolute bottom-6 w-full flex justify-center">
          <PoweredByAuricai position="inline" hidden={isEnterprise} delay={1.0} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // COMFORT SCREEN
  // ═══════════════════════════════════════
  if (screen === "comfort") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0B0B0C", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[400px] w-full text-center"
        >
           <div className="w-12 h-12 rounded-full border border-[#1F1F1F] flex items-center justify-center mx-auto mb-8">
             <ArrowRight className="w-5 h-5 text-white/60" />
           </div>
           <h2 className="text-xl font-medium text-white mb-4 tracking-tight">
             Just a quick note
           </h2>
           <p className="text-sm text-[#A1A1AA] leading-relaxed mb-10">
             This takes about 2 minutes. Rough answers are fine—our system will handle the rest for you.
           </p>
           <button
             onClick={proceedToChat}
             className="w-full bg-white text-black h-12 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
           >
             Got it, let&apos;s go
           </button>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // COMPLETION SCREEN
  // ═══════════════════════════════════════
  if (screen === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: "#0B0B0C", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md bg-[#111111] border border-[#1F1F1F] rounded-2xl overflow-hidden shadow-2xl text-center"
        >
          <div className="p-10 border-b border-[#1F1F1F] bg-[#161616]">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 180, damping: 18 }}
              className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-semibold text-white mb-3 tracking-tight">
              Thank You
            </h1>
            <p className="text-[#A1A1AA] text-sm leading-relaxed mb-4">
              Your responses have been successfully submitted. You can now close this window.
            </p>
          </div>
          <div className="p-6 bg-[#0B0B0C] border-t border-[#1F1F1F]">
             <PoweredByAuricai position="inline" hidden={isEnterprise} />
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // INTERVIEW SCREEN (Structured Workflow)
  // ═══════════════════════════════════════
  const progress = Math.min((questionNumber / totalMax) * 100, 100);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B0B0C", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      {/* ── Fixed Top Header ─────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-20" style={{ background: "#0B0B0C" }}>
        <div className="max-w-[680px] mx-auto px-6">
          <div className="flex items-center justify-between py-5">
            <div>
              <h1 className="text-[13px] font-semibold text-white tracking-tight">
                Case Study Interview
              </h1>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                Structured response collection
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[12px] font-medium text-[#A1A1AA] tabular-nums">
                Step {questionNumber} of {totalMax}
              </span>
              {questionNumber === 4 && <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Almost done</span>}
              {questionNumber === 5 && <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Final step</span>}
            </div>
          </div>

          {/* ── 2px Progress Bar ──────────────────────────── */}
          <div className="w-full h-[2px] bg-[#1F1F1F] overflow-hidden">
            <motion.div
              className="h-full bg-white/60"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        </div>
      </div>

      {/* ── Message Area ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pt-[88px] pb-[180px]">
        <div className="max-w-[680px] mx-auto px-6">
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {msg.role === "ai" ? (
                    /* ── AI Message Block ──────────────────── */
                    <div className="max-w-[520px]">
                      <div
                        className="rounded-xl border px-5 py-5"
                        style={{ background: "#111111", borderColor: "#1F1F1F" }}
                      >
                        {!msg.id.startsWith("greeting-") && (
                          <p className="text-[10px] font-medium uppercase tracking-widest mb-3" style={{ color: "#A1A1AA" }}>
                            Question
                          </p>
                        )}
                        <p className="text-[14px] font-medium text-white leading-relaxed" style={{ whiteSpace: "pre-line" }}>
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* ── User Response Block ────────────────── */
                    <div className="flex justify-end">
                      <div className="max-w-[520px]">
                        <div
                          className="rounded-xl px-5 py-4"
                          style={{ background: "#1A1A1A" }}
                        >
                          <p className="text-[10px] font-medium uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                            Your Response
                          </p>
                          <p className="text-[14px] text-white/90 leading-relaxed">
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* ── Loading Indicator ──────────────────────── */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-[520px]"
              >
                <div
                  className="rounded-xl border px-5 py-5 flex items-center gap-3"
                  style={{ background: "#111111", borderColor: "#1F1F1F" }}
                >
                  <Loader2 className="w-4 h-4 text-[#A1A1AA] animate-spin" />
                  <span className="text-[13px] text-[#A1A1AA]">
                    Preparing next question...
                  </span>
                </div>
              </motion.div>
            )}

            {/* ── Error State (Clean) ────────────────────── */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center py-4"
              >
                <div className="text-center max-w-sm">
                  <div className="w-10 h-10 rounded-lg border border-[#1F1F1F] flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-5 h-5 text-[#A1A1AA]" />
                  </div>
                  <p className="text-[14px] text-white mb-2 font-medium">
                    Something went wrong
                  </p>
                  <p className="text-[13px] text-[#A1A1AA] mb-5">
                    {error || "We couldn't connect to the server. Please check your connection and try again."}
                  </p>
                  <button
                    onClick={() => {
                      setError(null);
                      callNextQuestion();
                    }}
                    className="inline-flex items-center justify-center bg-white text-black px-5 h-10 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
                  >
                    Retry
                  </button>
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

      </div>

      {/* ── Fixed Bottom Input Section ───────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20" style={{ background: "#0B0B0C" }}>
        <div className="max-w-[680px] mx-auto px-6">
          
          {/* ── QUICK REPLY CHIPS ──────────────────────────── */}
          <AnimatePresence>
            {!isLoading && currentOptions.length > 0 && screen === "chat" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="flex flex-wrap gap-2 mb-4"
              >
                {currentOptions.map((option, i) => (
                  <button
                    key={`${option}-${i}`}
                    onClick={() => {
                      setMessages((prev) => [
                        ...prev,
                        { id: `user-${Date.now()}`, role: "user", text: option },
                      ]);
                      setCurrentOptions([]);
                      callNextQuestion(option, currentIntent, messages[messages.length - 1]?.text);
                    }}
                    className="px-4 py-2 rounded-full border border-[#1F1F1F] bg-[#111111] text-[13px] text-[#A1A1AA] hover:text-white hover:border-white/20 transition-all hover:bg-[#1A1A1A]"
                  >
                    {option}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="border-t py-4" style={{ borderColor: "#1F1F1F" }}>
            <form onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentOptions.length > 0 ? "Or type your own answer..." : "Type your answer..."}
                disabled={isLoading}
                rows={2}
                className="w-full bg-transparent text-[14px] text-white placeholder-white/20 focus:outline-none resize-none disabled:opacity-40 disabled:cursor-not-allowed leading-relaxed"
                style={{ minHeight: "52px", maxHeight: "120px", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 120) + "px";
                }}
              />

              <div className="flex items-center justify-between mt-3">
                {/* Micro Hint */}
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Rough estimates are fine. System will handle the rest.
                </p>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="flex-shrink-0 inline-flex items-center justify-center gap-2 bg-white text-black rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ height: "44px", paddingLeft: "20px", paddingRight: "20px" }}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Submit</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Branding */}
      <PoweredByAuricai position="fixed" hidden={isEnterprise} delay={1.5} />
    </div>
  );
}
