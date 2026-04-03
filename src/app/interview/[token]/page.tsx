"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import {
  Send,
  Loader2,
  Sparkles,
  CheckCircle2,
  MessageCircle,
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
    isFollowUp?: boolean;
    isComplete?: boolean;
    questionNumber?: number;
    totalMax?: number;
    caseStudy?: Record<string, string>;
  };
  error?: string;
  isComplete?: boolean;
  isValidationRejection?: boolean;
}

type Screen = "welcome" | "chat" | "review" | "complete";

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
  const [planName, setPlanName] = useState<string>("starter");
  const [isInvalid, setIsInvalid] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [pollingError, setPollingError] = useState(false);
  const [showSuccessMoment, setShowSuccessMoment] = useState(false);
  const [generatedCaseStudy, setGeneratedCaseStudy] = useState<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ─── LocalStorage Session Persistence ─────────────────────
  // Load cached state on mount
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

  // Save state on change
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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    if (screen === "chat" && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [screen, isLoading, messages.length]);

  // Validate token on mount
  useEffect(() => {
    setIsMounted(true);
    async function validateToken() {
      try {
        const res = await fetch(`/api/public/interview/${token}`);
        if (!res.ok) {
          setIsInvalid(true);
          return;
        }
        const data = await res.json();
        
        // Handle State Machine Recovery
        const status = data.data?.status;
        if (status === "approved" || status === "published") {
          localStorage.removeItem(`auricai_session_${token}`);
          setScreen("complete");
        } else if (status === "review_ready") {
          localStorage.removeItem(`auricai_session_${token}`);
          setScreen("review");
          fetchStatus(); // Get the case study data
        } else if (status === "completed") {
          localStorage.removeItem(`auricai_session_${token}`);
          setScreen("review"); // Will show loader while polling
        }
        
        // Extract org and plan info
        if (data.data?.client_name) setOrgName(data.data.client_name);
        if (data.data?.plan_name) setPlanName(data.data.plan_name);
      } catch {
        setIsInvalid(true);
      }
    }
    if (token) validateToken();
  }, [token]);

  // ─── Polling Logic ────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/interview/${token}/status`);
      const data = await res.json();
      if (data.success && data.data.status === "review_ready") {
        // Success Moment Transition
        setShowSuccessMoment(true);
        
        // Brief delay for the 'Success' moment to feel earned
        setTimeout(() => {
          setGeneratedCaseStudy(data.data.caseStudy);
          setScreen("review");
          setShowSuccessMoment(false);
        }, 1200);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Polling error:", e);
      setPollingError(true);
      return false;
    }
  }, [token]);

  // Cycle processing steps
  useEffect(() => {
    let stepInterval: NodeJS.Timeout;
    if (screen === "review" && !generatedCaseStudy) {
      stepInterval = setInterval(() => {
        setProcessingStep((prev) => (prev + 1) % 3);
      }, 3500);
    }
    return () => clearInterval(stepInterval);
  }, [screen, generatedCaseStudy]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (screen === "review" && !generatedCaseStudy && !pollingError) {
      interval = setInterval(async () => {
        const finished = await fetchStatus();
        if (finished) clearInterval(interval);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [screen, generatedCaseStudy, fetchStatus, pollingError]);

  // ─── Watermark Logic ──────────────────────────────────────
  const isEnterprise = planName === "enterprise";

  // ─── API Call ──────────────────────────────────────────────
  const callNextQuestion = useCallback(
    async (answer?: string, intent?: string, question?: string) => {
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

        const data: APIResponse = await res.json();

        if (!res.ok || !data.success) {
          if (data.isComplete) {
            localStorage.removeItem(`auricai_session_${token}`);
            setScreen("complete");
            return;
          }
          if (data.isValidationRejection) {
            // The AI specifically rejected the answer via semantic validator
            setMessages((prev) => [
              ...prev,
              {
                id: `ai-val-${Date.now()}`,
                role: "ai",
                text: data.error || "Could you clarify that a bit?",
              },
            ]);
            return; // Don't advance the state or error out
          }
          throw new Error(data.error || "Something went wrong");
        }

        if (data.data?.isComplete) {
          localStorage.removeItem(`auricai_session_${token}`);
          setScreen("review"); // Transition to review state (polling if case study missing)
          return;
        }

        if (data.data?.question) {
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
        }
      } catch (err: any) {
        setError(err.message || "Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  // ─── Handlers ─────────────────────────────────────────────
  function handleStart() {
    setScreen("chat");
    callNextQuestion(); // Get first question
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const answer = inputValue.trim();
    if (!answer || isLoading) return;

    // Add user message
    const lastAiMessage = [...messages].reverse().find((m) => m.role === "ai");
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", text: answer },
    ]);
    setInputValue("");

    // Send to API
    callNextQuestion(answer, currentIntent, lastAiMessage?.text);
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

  // ─── Hydration Guard ──────────────────────────────────────
  if (!isMounted) return null;

  // ─── Invalid Token ────────────────────────────────────────
  if (isInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Interview Not Found
          </h1>
          <p className="text-sm text-zinc-500">
            This interview link may have expired or is invalid. Please check
            your email for the correct link.
          </p>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // WELCOME SCREEN
  // ═══════════════════════════════════════
  if (screen === "welcome") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(99,102,241,0.3)]"
          >
            <MessageCircle className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white mb-3 tracking-tight"
          >
            Share Your Experience
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400 mb-6 text-lg"
          >
            {orgName ? `${orgName} would love to hear your feedback.` : "We'd love to hear about your results."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-sm text-zinc-400 bg-white/5 border border-white/10 p-6 rounded-2xl"
          >
            <div className="flex items-center justify-center md:justify-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>3-minute chat</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>No calls required</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>You approve everything</span>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={handleStart}
            className="group inline-flex items-center gap-3 bg-white text-black px-8 py-3.5 rounded-xl text-base font-bold hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]"
          >
            Let's Go
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>

          {/* Premium branding — inline/centered on welcome screen */}
          <PoweredByAuricai position="inline" hidden={isEnterprise} delay={0.9} />
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // REVIEW SCREEN
  // ═══════════════════════════════════════
  if (screen === "review") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#0A0A0A]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full"
        >
          {!generatedCaseStudy ? (
            <div className="text-center py-12">
              <div className="relative w-20 h-20 mx-auto mb-8">
                <AnimatePresence mode="wait">
                  {showSuccessMoment ? (
                    <motion.div
                      key="success"
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute inset-0 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative w-20 h-20"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent"
                      />
                      <div className="absolute inset-2 rounded-full bg-blue-500/5 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-blue-400" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-8 mb-2">
                <AnimatePresence mode="wait">
                  {showSuccessMoment ? (
                    <motion.h2
                      key="success-text"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl font-bold text-emerald-400 tracking-tight"
                    >
                      Your case study is ready
                    </motion.h2>
                  ) : (
                    <motion.h2
                      key={processingStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-2xl font-bold text-white tracking-tight"
                    >
                      {[
                        "Extracting key metrics",
                        "Validating ROI data",
                        "Structuring case study"
                      ][processingStep]}
                    </motion.h2>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-zinc-500 max-w-sm mx-auto mb-8 text-sm">
                {showSuccessMoment ? "Finalizing presentation..." : "Analyzing your feedback. Estimated time: ~10 seconds."}
              </p>

              {/* Precise Progress Bar */}
              <div className="max-w-xs mx-auto mb-10 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ 
                    width: showSuccessMoment ? "100%" : (processingStep === 0 ? "33%" : processingStep === 1 ? "66%" : "95%") 
                  }}
                  transition={{ duration: showSuccessMoment ? 0.3 : 3.5, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Secure & Private</span>
                </div>

                {pollingError && (
                  <button 
                    onClick={() => { setPollingError(false); fetchStatus(); }}
                    className="text-xs text-blue-400 underline hover:text-blue-300"
                  >
                    Taking too long? Click to retry
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Verified Result</span>
                </div>
                
                <h1 className="text-4xl font-extrabold text-white tracking-tight leading-[1.1]">
                  {generatedCaseStudy.headline}
                </h1>

                <div className="flex items-center justify-center gap-2 py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <p className="text-sm font-medium text-emerald-500/90">
                    This will be published exactly as shown below.
                  </p>
                </div>
              </div>

              {/* Metric Card */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="w-24 h-24 text-blue-400" />
                </div>
                
                <div className="relative z-10 space-y-6">
                  <div className="flex items-end gap-3">
                    <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                      +{generatedCaseStudy.deltaPercent}%
                    </div>
                    <div className="text-zinc-500 font-medium mb-1.5 uppercase tracking-wider text-xs">
                       Increase in {generatedCaseStudy.metricType || "Target Result"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/10">
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Before</div>
                      <div className="text-xl font-bold text-white">{generatedCaseStudy.before || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">After</div>
                      <div className="text-xl font-bold text-white">{generatedCaseStudy.after || "N/A"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="w-full bg-white text-black h-14 rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Looks Perfect - Approve
                      <CheckCircle2 className="w-6 h-6" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-zinc-600">
                  By clicking approve, you permit {orgName || "this workspace"} to feature these results in their case study.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // COMPLETION SCREEN
  // ═══════════════════════════════════════

  if (screen === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center max-w-lg"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(34,197,94,0.3)]"
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            You're All Done! 🎉
          </h1>
          <p className="text-zinc-400 text-base mb-4">
            Thank you for sharing your experience. Your insights are incredibly
            valuable.
          </p>

          {/* Success or loading state */}
          {generatedCaseStudy ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-5 py-2.5 text-sm text-blue-400 font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Verification Confidence: {generatedCaseStudy.confidenceScore || 100}%
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-sm text-zinc-400"
            >
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Generating your case study...
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 text-xs text-zinc-600"
          >
            You can close this window. We'll handle the rest.
          </motion.p>

          {/* Inline branding below completion message */}
          <PoweredByAuricai position="inline" hidden={isEnterprise} delay={1.4} />
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // CHAT SCREEN
  // ═══════════════════════════════════════
  const progress = Math.min((questionNumber / totalMax) * 100, 100);

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-zinc-400">
              AI Interview
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {questionNumber}/{totalMax}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white/[0.07] text-zinc-200 border border-white/10 rounded-bl-md"
                }`}
              >
                {msg.role === "ai" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] font-medium text-blue-400/70 uppercase tracking-wider">
                      AI Interviewer
                    </span>
                  </div>
                )}
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white/[0.07] border border-white/10 rounded-2xl rounded-bl-md px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-zinc-500 ml-1">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
              <button
                onClick={() => {
                  setError(null);
                  callNextQuestion();
                }}
                className="text-xs text-red-400 underline ml-2"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <div className="sticky bottom-0 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-white/5 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              disabled={isLoading}
              rows={1}
              className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:shadow-none"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </form>
        <p className="text-[10px] text-zinc-600 mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>

      {/* Fixed bottom-right branding badge on chat screen */}
      <PoweredByAuricai position="fixed" hidden={isEnterprise} delay={1.5} />
    </div>
  );
}
