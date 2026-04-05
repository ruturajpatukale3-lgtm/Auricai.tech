"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
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
  const [clientName, setClientName] = useState<string>("");
  const [planName, setPlanName] = useState<string>("starter");
  const [isInvalid, setIsInvalid] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [errorType, setErrorType] = useState<"INVALID" | "SERVER_ERROR" | null>(null);
  const [pollingError, setPollingError] = useState(false);
  const [showSuccessMoment, setShowSuccessMoment] = useState(false);
  const [generatedCaseStudy, setGeneratedCaseStudy] = useState<any>(null);
  const [processingTimeout, setProcessingTimeout] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

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
  const initializeInterview = useCallback(async () => {
    setIsValidating(true);
    setErrorType(null);
    setIsInvalid(false);

    try {
      const res = await fetch(`/api/public/interview/${token}`);

      if (res.status === 404 || res.status === 410) {
        setErrorType("INVALID");
        setIsInvalid(true);
        return;
      }

      if (!res.ok) {
        setErrorType("SERVER_ERROR");
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }

      const response = await res.json();

      if (response?.data?.client_name) {
        setClientName(response.data.client_name);
      }
      if (response?.data?.client_name) {
        setOrgName(response.data.client_name);
      }
      if (response?.data?.plan_name) {
        setPlanName(response.data.plan_name);
      }
    } catch (err: any) {
      console.error("INITIALIZATION ERROR:", err.message);
      setErrorType("SERVER_ERROR");
      setError(err.message || "Failed to load interview");
    } finally {
      setIsValidating(false);
    }
  }, [token]);

  useEffect(() => {
    setIsMounted(true);
    if (token) {
      initializeInterview();
    }
  }, [token, initializeInterview]);

  // ─── Polling Logic ────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/interview/${token}/status`);
      const data = await res.json();
      if (data.success && data.data.status === "review_ready") {
        setShowSuccessMoment(true);
        setTimeout(() => {
          setGeneratedCaseStudy(data.data.caseStudy);
          setScreen("review");
          setShowSuccessMoment(false);
          setProcessingTimeout(false);
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
    if (screen === "review" && !generatedCaseStudy && !pollingError && !processingTimeout) {
      interval = setInterval(async () => {
        const finished = await fetchStatus();
        if (finished) clearInterval(interval);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [screen, generatedCaseStudy, fetchStatus, pollingError, processingTimeout]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (screen === "review" && !generatedCaseStudy && !processingTimeout) {
      timer = setTimeout(() => {
        setProcessingTimeout(true);
      }, 60000);
    }
    return () => clearTimeout(timer);
  }, [screen, generatedCaseStudy, processingTimeout]);

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
          setScreen("review");
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
  // REVIEW SCREEN
  // ═══════════════════════════════════════
  if (screen === "review") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0B0B0C", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full"
        >
          {!generatedCaseStudy ? (
            <div className="text-center py-12">
              {/* Processing indicator */}
              <div className="relative w-16 h-16 mx-auto mb-8">
                <AnimatePresence mode="wait">
                  {showSuccessMoment ? (
                    <motion.div
                      key="success"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 rounded-full border border-[#1F1F1F] flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </motion.div>
                  ) : processingTimeout ? (
                    <motion.div
                      key="timeout"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 rounded-full border border-[#1F1F1F] flex items-center justify-center"
                    >
                      <Loader2 className="w-8 h-8 text-[#A1A1AA] animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative w-16 h-16"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border border-t-white/60 border-r-transparent border-b-white/20 border-l-transparent"
                      />
                      <div className="absolute inset-2 rounded-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-[#A1A1AA]" />
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xl font-semibold text-white tracking-tight"
                    >
                      Your case study is ready
                    </motion.h2>
                  ) : processingTimeout ? (
                    <motion.h2
                      key="timeout-text"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xl font-semibold text-[#A1A1AA] tracking-tight"
                    >
                      Still processing
                    </motion.h2>
                  ) : (
                    <motion.h2
                      key={processingStep}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="text-xl font-semibold text-white tracking-tight"
                    >
                      {[
                        "Extracting key metrics",
                        "Validating data points",
                        "Structuring case study"
                      ][processingStep]}
                    </motion.h2>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto mb-8 leading-relaxed">
                {showSuccessMoment
                  ? "Finalizing document."
                  : processingTimeout
                    ? "Your case study is processing in the background. You will receive an email once it is ready for review."
                    : "Analyzing your responses. Estimated time: ~10 seconds."}
              </p>

              {/* Progress Bar */}
              {!processingTimeout && (
                <div className="max-w-xs mx-auto mb-10 h-px bg-[#1F1F1F] overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{
                      width: showSuccessMoment ? "100%" : (processingStep === 0 ? "33%" : processingStep === 1 ? "66%" : "95%")
                    }}
                    transition={{ duration: showSuccessMoment ? 0.3 : 3.5, ease: "linear" }}
                    className="h-full bg-white/60"
                  />
                </div>
              )}

              <div className="flex flex-col items-center gap-4">
                {(pollingError || processingTimeout) && (
                  <div className="space-y-4">
                    <button
                      onClick={() => { setPollingError(false); setProcessingTimeout(false); fetchStatus(); }}
                      className="text-xs text-[#A1A1AA] underline hover:text-white transition-colors"
                    >
                      Check status again
                    </button>
                    {processingTimeout && (
                      <div className="pt-4">
                        <button
                          onClick={() => setScreen("complete")}
                          className="px-6 py-2 rounded-lg border border-[#1F1F1F] text-xs text-[#A1A1AA] hover:text-white hover:border-white/20 transition-colors"
                        >
                          Return to Home
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Review header */}
              <div className="space-y-4">
                <p className="text-xs text-[#A1A1AA] uppercase tracking-widest font-medium">
                  Case Study Preview
                </p>

                <h1 className="text-3xl font-semibold text-white tracking-tight leading-tight">
                  {generatedCaseStudy.headline}
                </h1>

                <div className="flex items-center gap-2 py-2">
                  <CheckCircle2 className="w-4 h-4 text-white/60" />
                  <p className="text-sm text-[#A1A1AA]">
                    This will be published exactly as shown below.
                  </p>
                </div>
              </div>

              {/* Metric Card */}
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-8">
                <div className="space-y-6">
                  <div className="flex items-end gap-3">
                    <div className="text-4xl font-semibold text-white">
                      +{generatedCaseStudy.deltaPercent}%
                    </div>
                    <div className="text-[#A1A1AA] font-medium mb-1 text-sm">
                      increase in {generatedCaseStudy.metricType || "target result"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-[#1F1F1F]">
                    <div>
                      <div className="text-xs text-[#A1A1AA] uppercase tracking-widest mb-1">Before</div>
                      <div className="text-xl font-semibold text-white">{generatedCaseStudy.before || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#A1A1AA] uppercase tracking-widest mb-1">After</div>
                      <div className="text-xl font-semibold text-white">{generatedCaseStudy.after || "N/A"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approve */}
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="w-full bg-white text-black h-12 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Approve Case Study
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-[#A1A1AA]">
                  By approving, you permit {orgName || "this organization"} to feature these results in their case study.
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
      <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: "#0B0B0C", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-md relative z-10"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 180, damping: 18 }}
            className="w-16 h-16 rounded-xl border border-[#1F1F1F] flex items-center justify-center mx-auto mb-8"
          >
            <CheckCircle2 className="w-8 h-8 text-white" />
          </motion.div>

          <h1 className="text-2xl font-semibold text-white mb-3 tracking-tight">
            Submission Complete
          </h1>

          <p className="text-[#A1A1AA] text-sm mb-8 leading-relaxed">
            Thank you for your time. Your responses have been recorded and will be used to create a structured case study.
          </p>

          {/* Status Card */}
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-6 mb-8">
            {generatedCaseStudy ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <p className="text-xs text-[#A1A1AA] uppercase tracking-widest font-medium">
                  Status
                </p>
                <p className="text-lg font-semibold text-white">
                  Case study generated
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-1">
                <Loader2 className="w-5 h-5 text-[#A1A1AA] animate-spin" />
                <span className="text-sm text-[#A1A1AA]">Processing your case study</span>
              </div>
            )}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="text-xs text-white/30 tracking-wide"
          >
            You may close this window.
          </motion.p>

          <div className="mt-6">
            <PoweredByAuricai position="inline" hidden={isEnterprise} delay={1.4} />
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
            <span className="text-[12px] font-medium text-[#A1A1AA] tabular-nums">
              Step {questionNumber} of {totalMax}
            </span>
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
                    /* ── AI Question Block ──────────────────── */
                    <div className="max-w-[520px]">
                      <div
                        className="rounded-xl border px-5 py-5"
                        style={{ background: "#111111", borderColor: "#1F1F1F" }}
                      >
                        <p className="text-[10px] font-medium uppercase tracking-widest mb-3" style={{ color: "#A1A1AA" }}>
                          Question
                        </p>
                        <p className="text-[14px] font-medium text-white leading-relaxed">
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
                  <p className="text-[14px] text-[#A1A1AA] mb-4">
                    This session could not be loaded.
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
          <div className="border-t py-4" style={{ borderColor: "#1F1F1F" }}>
            <form onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Provide a clear, specific answer. Include numbers if possible."
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
                  Example: 12% → 31% in 60 days
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
