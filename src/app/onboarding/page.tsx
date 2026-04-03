"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Rocket,
  Building2,
  ChevronRight,
  ChevronLeft,
  Check,
  Briefcase,
  Target,
  TrendingUp,
  Sparkles,
  AlertCircle,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  { value: "marketing_agency", label: "Marketing Agency" },
  { value: "saas", label: "SaaS" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
] as const;

/* GOAL_OPTIONS removed */

// Industry-based placeholder suggestions
const SERVICE_SUGGESTIONS: Record<string, string> = {
  marketing_agency: "Make it specific: We run Facebook ads for local dentists to generate qualified leads",
  saas: "Make it specific: We build predictive CRM software for real estate teams",
  ecommerce: "Make it specific: We sell premium, sustainably sourced skincare products DTC",
  consulting: "Make it specific: We help Series A SaaS startups optimize their outbound sales pipelines",
  other: "Make it specific: We provide data analytics dashboards for regional healthcare providers",
};

const ICP_SUGGESTIONS: Record<string, string> = {
  marketing_agency: "Make it specific: US-based dentists and chiropractors with $1M+ revenue",
  saas: "Make it specific: Mid-market real estate teams (10-50 agents)",
  ecommerce: "Make it specific: Women aged 25-45 interested in clean beauty and sustainability",
  consulting: "Make it specific: Series A–B SaaS founders and VPs of Sales",
  other: "Make it specific: Operations managers at US-based healthcare clinics",
};

// ─── Validation Helpers ────────────────────────────────────

type FieldErrors = Record<string, string>;

function validateStep1(orgName: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!orgName.trim()) errors.orgName = "Organization name is required";
  return errors;
}

function validateStep2(fields: {
  industry: string;
  customIndustry: string;
  serviceCategory: string;
  targetCustomer: string;
}): { errors: FieldErrors; warnings: FieldErrors } {
  const errors: FieldErrors = {};
  const warnings: FieldErrors = {};

  if (!fields.industry) errors.industry = "Please select your industry";

  if (fields.industry === "other") {
    const trimmed = fields.customIndustry.trim();
    if (!trimmed) errors.customIndustry = "Please specify your industry";
    else if (trimmed.length < 3)
      errors.customIndustry = "Please specify your industry (min 3 chars)";
  }

  const genericTerms = ["marketing", "services", "business", "consulting", "software", "agency", "b2b", "b2c", "tech", "sales", "b2b saas"];
  const isGeneric = (val: string) => genericTerms.includes(val.toLowerCase().trim());

  // Service Category
  if (!fields.serviceCategory.trim()) {
    errors.serviceCategory = "Please specify your service category";
  } else if (fields.serviceCategory.trim().length < 3) {
    errors.serviceCategory = "Please use at least 3 characters";
  } else if (fields.serviceCategory.trim().length < 10) {
    warnings.serviceCategory = "Try to be more specific for better AI results";
  } else if (isGeneric(fields.serviceCategory)) {
    warnings.serviceCategory = "Generic terms may result in generic case studies";
  }

  // Target Customer
  if (!fields.targetCustomer.trim()) {
    errors.targetCustomer = "Please specify your target customer";
  } else if (fields.targetCustomer.trim().length < 3) {
    errors.targetCustomer = "Please use at least 3 characters";
  } else if (fields.targetCustomer.trim().length < 10) {
    warnings.targetCustomer = "Adding industry/size helps the AI personalize results";
  } else if (isGeneric(fields.targetCustomer)) {
    warnings.targetCustomer = "Being specific here unlocks better metrics";
  }

  return { errors, warnings };
}

// ─── Component ─────────────────────────────────────────────

function OnboardingContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine initial step from URL (for returning users who need step 2)
  const initialStep = searchParams.get("step") === "2" ? 2 : 1;

  const [step, setStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Step 1 fields
  const [orgName, setOrgName] = useState("");

  // Step 2 fields
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");

  // Validation state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fieldWarnings, setFieldWarnings] = useState<FieldErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // ── Derived state ──

  const step2Fields = useMemo(
    () => ({ industry, customIndustry, serviceCategory, targetCustomer }),
    [industry, customIndustry, serviceCategory, targetCustomer]
  );

  const step1Valid = orgName.trim().length > 0;
  const { errors: step2Errors, warnings: step2Warns } = useMemo(() => validateStep2(step2Fields), [step2Fields]);
  const step2Valid = Object.keys(step2Errors).length === 0;

  // ── Clear customIndustry when switching away from "Other" ──
  useEffect(() => {
    if (industry !== "other") {
      setCustomIndustry("");
      // Clear any custom industry errors
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.customIndustry;
        return next;
      });
      setFieldWarnings((prev) => {
        const next = { ...prev };
        delete next.customIndustry;
        return next;
      });
      setTouchedFields((prev) => {
        const next = new Set(prev);
        next.delete("customIndustry");
        return next;
      });
    }
  }, [industry]);

  // ── Handlers ──

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFieldWarnings((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validateField = useCallback((field: string, value: string) => {
    // Re-validate everything but only extract the error for this field
    const currentFields = { ...step2Fields, [field]: value };
    const { errors, warnings } = validateStep2(currentFields);
    
    setFieldErrors((prev: FieldErrors) => {
      const next = { ...prev };
      if (errors[field]) {
        next[field] = errors[field];
      } else {
        delete next[field];
      }
      return next;
    });

    setFieldWarnings((prev: FieldErrors) => {
      const next = { ...prev };
      if (warnings[field]) {
        next[field] = warnings[field];
      } else {
        delete next[field];
      }
      return next;
    });
    setTouchedFields((prev) => new Set(prev).add(field));
  }, [step2Fields]);

  const markTouched = useCallback((field: string) => {
    setTouchedFields((prev) => new Set(prev).add(field));
    // Also trigger validation for this field when marked touched (e.g. on blur)
    const val = (step2Fields as any)[field] || "";
    validateField(field, val);
  }, [step2Fields, validateField]);

  const normalizeOnBlur = useCallback(
    (field: "customIndustry" | "serviceCategory" | "targetCustomer", value: string) => {
      const trimmed = value.trim().replace(/\s+/g, " ");
      switch (field) {
        case "customIndustry":
          setCustomIndustry(trimmed);
          break;
        case "serviceCategory":
          setServiceCategory(trimmed);
          break;
        case "targetCustomer":
          setTargetCustomer(trimmed);
          break;
      }
      validateField(field, trimmed);
    },
    [validateField]
  );

  const handleNext = () => {
    if (step === 1) {
      const errors = validateStep1(orgName);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2 && initialStep !== 2) {
      setStep(1);
      setApiError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation
    if (step === 1 && !step1Valid) return;
    if (step === 2) {
      const { errors, warnings } = validateStep2(step2Fields);
      setFieldErrors(errors);
      setFieldWarnings(warnings);
      setTouchedFields(new Set(Object.keys(step2Fields)));
      if (Object.keys(errors).length > 0) return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      const payload: Record<string, unknown> = { name: orgName };

      if (step === 2) {
        payload.business_context = {
          industry,
          custom_industry: industry === "other" ? customIndustry : undefined,
          service_category: serviceCategory,
          service_type: serviceCategory, // Mapping to category since detailed type field was removed
          target_customer: targetCustomer,
        };
      }

      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (step === 1) {
        // Move to step 2 after org is created
        setStep(2);
      } else {
        // All done — force a hard redirect to bypass Next.js client-side router cache
        // which may have cached an earlier redirect back to the onboarding page!
        window.location.href = "/dashboard/command-center";
      }
    } catch {
      setApiError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render Helpers ──────────────────────────────────────

  const servicePlaceholder =
    SERVICE_SUGGESTIONS[industry] || SERVICE_SUGGESTIONS.other;
  const icpPlaceholder =
    ICP_SUGGESTIONS[industry] || ICP_SUGGESTIONS.other;

  function FieldStatus({ field }: { field: string }) {
    const hasError = fieldErrors[field] && touchedFields.has(field);
    const hasWarning = fieldWarnings[field] && touchedFields.has(field);

    if (hasError) {
      return (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
        </motion.span>
      );
    }

    if (hasWarning) {
      return (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <Sparkles className="w-4 h-4 text-yellow-400/80" />
        </motion.span>
      );
    }

    return null;
  }

  function ErrorMessage({ field }: { field: string }) {
    const error = fieldErrors[field];
    const warning = fieldWarnings[field];
    const isTouched = touchedFields.has(field);

    if (!isTouched) return null;

    if (error) {
      return (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-xs text-red-400 mt-1.5 ml-1 flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </motion.p>
      );
    }

    if (warning) {
      return (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-xs text-yellow-400/70 mt-1.5 ml-1 flex items-center gap-1 font-medium"
        >
          <Sparkles className="w-3 h-3 shrink-0" />
          {warning}
        </motion.p>
      );
    }

    return null;
  }

  // ─── Step Animations ─────────────────────────────────────

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  const direction = step === 1 ? -1 : 1;

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/8 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[480px] relative z-10">
        {/* ── Progress Bar ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 tracking-wider uppercase">
              Step {step} of 2
            </span>
            <span className="text-xs text-zinc-600">
              {step === 1 ? "Organization" : "Business Context"}
            </span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: step === 1 ? "50%" : "100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* ── Card ── */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {/* Step 1 Header */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mb-4">
                      <Rocket className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-1">
                      Welcome to Auricai
                    </h1>
                    <p className="text-sm text-zinc-400">
                      Let&apos;s set up your workspace.
                    </p>
                  </div>

                  {/* Org Name Field */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="orgName"
                      className="text-sm font-medium text-zinc-300 ml-0.5"
                    >
                      Organization Name
                    </label>
                    <div className="relative group">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                      <input
                        id="orgName"
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => {
                          setOrgName(e.target.value);
                          setFieldErrors((p) => {
                            const n = { ...p };
                            delete n.orgName;
                            return n;
                          });
                        }}
                        onBlur={() => {
                          setOrgName(orgName.trim());
                          markTouched("orgName");
                        }}
                        placeholder="e.g. Acme Corp"
                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-medium"
                      />
                    </div>
                    <AnimatePresence>
                      {fieldErrors.orgName && (
                        <ErrorMessage field="orgName" />
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {/* Step 2 Header */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mb-4">
                      <Briefcase className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-1">
                      Tell us about your business
                    </h1>
                    <p className="text-sm text-zinc-400">
                      This powers your AI-generated case studies.
                    </p>
                    <p className="text-xs text-blue-400/80 mt-2 font-medium">
                      Be specific — better input = better AI results
                    </p>
                  </div>

                  <div className="space-y-5">
                    {/* Industry Dropdown */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="industry"
                        className="text-sm font-medium text-zinc-300 ml-0.5"
                      >
                        Industry
                      </label>
                      <div className="relative">
                        <select
                          id="industry"
                          value={industry}
                          onChange={(e) => {
                            setIndustry(e.target.value);
                            clearFieldError("industry");
                          }}
                          onBlur={() => validateField("industry", industry)}
                          className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-medium appearance-none cursor-pointer"
                        >
                          <option value="" disabled className="text-zinc-600">
                            Select your industry
                          </option>
                          {INDUSTRY_OPTIONS.map((opt) => (
                            <option
                              key={opt.value}
                              value={opt.value}
                              className="bg-[#111] text-white"
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 rotate-90 pointer-events-none" />
                        <FieldStatus field="industry" />
                      </div>
                      <AnimatePresence>
                        <ErrorMessage field="industry" />
                      </AnimatePresence>
                    </div>

                    {/* Conditional: Custom Industry */}
                    <AnimatePresence>
                      {industry === "other" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-1.5">
                            <label
                              htmlFor="customIndustry"
                              className="text-sm font-medium text-zinc-300 ml-0.5"
                            >
                              Describe your industry (be specific)
                            </label>
                            <div className="relative">
                              <input
                                id="customIndustry"
                                type="text"
                                value={customIndustry}
                                onChange={(e) => {
                                  setCustomIndustry(e.target.value);
                                  clearFieldError("customIndustry");
                                }}
                                onBlur={() =>
                                  normalizeOnBlur(
                                    "customIndustry",
                                    customIndustry
                                  )
                                }
                                placeholder="e.g., Facebook Ads for dentists"
                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-medium"
                              />
                              <FieldStatus field="customIndustry" />
                            </div>
                            <AnimatePresence>
                              <ErrorMessage field="customIndustry" />
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Service Category */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="serviceCategory"
                        className="text-sm font-medium text-zinc-300 ml-0.5"
                      >
                        Service Category
                      </label>
                      <div className="relative">
                        <input
                          id="serviceCategory"
                          type="text"
                          value={serviceCategory}
                          onChange={(e) => {
                            setServiceCategory(e.target.value);
                            clearFieldError("serviceCategory");
                          }}
                          onBlur={() =>
                            normalizeOnBlur("serviceCategory", serviceCategory)
                          }
                          placeholder="e.g. B2B SaaS, Dental Marketing, Financial Consulting"
                          className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-medium"
                        />
                        <FieldStatus field="serviceCategory" />
                      </div>
                      <AnimatePresence>
                        <ErrorMessage field="serviceCategory" />
                      </AnimatePresence>
                    </div>

                    {/* Target Customer */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="targetCustomer"
                        className="text-sm font-medium text-zinc-300 ml-0.5"
                      >
                        Who do you serve?
                      </label>
                      <div className="relative">
                        <input
                          id="targetCustomer"
                          type="text"
                          value={targetCustomer}
                          onChange={(e) => {
                            setTargetCustomer(e.target.value);
                            clearFieldError("targetCustomer");
                          }}
                          onBlur={() =>
                            normalizeOnBlur("targetCustomer", targetCustomer)
                          }
                          placeholder={icpPlaceholder}
                          className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-medium"
                        />
                        <FieldStatus field="targetCustomer" />
                      </div>
                      <AnimatePresence>
                        <ErrorMessage field="targetCustomer" />
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── API Error ── */}
            <AnimatePresence>
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5"
                >
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {apiError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Buttons ── */}
            <div className="mt-8 flex gap-3">
              {step === 2 && initialStep !== 2 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-white/[0.06] text-sm font-medium text-zinc-400 hover:text-white hover:border-white/10 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              {step === 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!step1Valid || isSubmitting}
                  className="flex-1 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!step2Valid || isSubmitting}
                  className="flex-1 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Launch Workspace
                      <Rocket className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          Your workspace will start on the <span className="text-zinc-400 font-medium">Free plan</span>. Upgrade anytime.
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
