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

// Industry-based placeholder suggestions (Outcome-based)
const SERVICE_SUGGESTIONS: Record<string, string> = {
  marketing_agency: "e.g. We generate $50k+ in extra pipeline for dentists via Facebook Ads",
  saas: "e.g. We reduce churn by 25% for real estate teams with our predictive CRM",
  ecommerce: "e.g. We scale sustainably sourced skincare brands to $100k/mo via Meta",
  consulting: "e.g. We help SaaS founders close 20% more deals via sales pipeline audits",
  other: "e.g. We provide real-time data dashboards for healthcare providers",
};

const ICP_SUGGESTIONS: Record<string, string> = {
  marketing_agency: "e.g. US-based dentists and chiropractors with $1M+ revenue",
  saas: "e.g. Mid-market real estate teams (10-50 agents) in North America",
  ecommerce: "e.g. Women-owned skincare brands doing $10k-$50k monthly revenue",
  consulting: "e.g. Series A SaaS founders and VPs of Sales at tech startups",
  other: "e.g. Operations managers at regional healthcare clinics",
};

// Elite suggestions for "Generate for me" and Chips
const QUICK_SUGGESTIONS: Record<string, { services: string[]; icps: string[] }> = {
  marketing_agency: {
    services: [
      "Facebook Ads for Dentistry",
      "SEO for E-commerce Brands",
      "Lead Gen for SaaS Companies",
    ],
    icps: [
      "Local Dentists ($1M+ Revenue)",
      "Shopify Plus Store Owners",
      "Series A SaaS Founders",
    ],
  },
  saas: {
    services: [
      "Predictive CRM for Real Estate",
      "Automated Payroll for SMBs",
      "AI Inventory for Retailers",
    ],
    icps: [
      "Real Estate Team Leads",
      "HR Managers at 50+ person SMBs",
      "Fortune 500 Retail Ops Managers",
    ],
  },
  ecommerce: {
    services: [
      "Sustainably Sourced Skincare",
      "DTC Home Office Furniture",
      "Subscription Coffee Roastery",
    ],
    icps: [
      "Eco-conscious Skincare Buyers",
      "Remote Tech Professionals",
      "Daily Coffee Enthusiasts (West Coast)",
    ],
  },
  consulting: {
    services: [
      "Sales Pipeline Optimization",
      "Fractional CTO for Startups",
      "HR Compliance for Remote Teams",
    ],
    icps: [
      "B2B Tech Founders (Series A)",
      "Non-technical Solo Founders",
      "US-based Remote Companies",
    ],
  },
  other: {
    services: [
      "Data Analytics for Healthcare",
      "Event Management for Tech",
      "Subscription Legal Services",
    ],
    icps: [
      "Healthcare Operations Managers",
      "Tech Conference Organizers",
      "Small Business Owners (US)",
    ],
  },
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

// ─── Elite UI Components ───────────────────────────────────

function QualityScoreBadge({ value }: { value: string }) {
  if (!value.trim()) return null;

  const v = value.trim();
  let score: "weak" | "good" | "strong" = "weak";
  let label = "Weak";
  let color = "text-red-400 bg-red-400/10 border-red-400/20";

  const hasOutcome = /%|\$|ROI|increase|revenue|growth|days|hours|months/i.test(v);
  const isGeneric = ["marketing", "business", "services", "agency", "software", "tech", "sales"].some(
    (word) => v.toLowerCase() === word
  );

  if (!isGeneric && v.length >= 15) {
    score = "good";
    label = "Good";
    color = "text-blue-400 bg-blue-400/10 border-blue-400/20";
  }

  if (!isGeneric && v.length >= 30 && hasOutcome) {
    score = "strong";
    label = "Strong";
    color = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${color} flex items-center gap-1`}
    >
      <div className={`w-1 h-1 rounded-full ${color.split(" ")[0].replace("text", "bg")}`} />
      {label}
    </motion.div>
  );
}

function SuggestionChips({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (val: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="text-xs py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer whitespace-nowrap"
        >
          {s}
        </button>
      ))}
    </div>
  );
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

  const handleSkip = async () => {
    if (
      confirm(
        "AI output will be generic until you complete your business profile. Are you sure you want to skip for now?"
      )
    ) {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/onboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: orgName || "My Workspace" }),
        });
        if (res.ok) {
          window.location.href = "/dashboard/command-center";
        } else {
          const data = await res.json();
          setApiError(data.error || "Skip failed. Please try again.");
        }
      } catch {
        setApiError("An unexpected error occurred.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAutoGenerate = () => {
    if (!industry) {
      setFieldErrors((prev) => ({ ...prev, industry: "Select an industry first" }));
      return;
    }

    const suggestions = QUICK_SUGGESTIONS[industry] || QUICK_SUGGESTIONS.other;
    const randomIdx = Math.floor(Math.random() * suggestions.services.length);

    setServiceCategory(suggestions.services[randomIdx]);
    setTargetCustomer(suggestions.icps[randomIdx]);

    // Clear errors and mark touched
    clearFieldError("serviceCategory");
    clearFieldError("targetCustomer");
    setTouchedFields((prev) => {
      const next = new Set(prev);
      next.add("serviceCategory");
      next.add("targetCustomer");
      return next;
    });
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
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mb-4 relative group">
                      <Briefcase className="w-7 h-7 text-white" />
                      <button
                        type="button"
                        onClick={handleAutoGenerate}
                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors cursor-pointer group-hover:scale-110 duration-200"
                        title="Generate for me"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-1">
                      Tell us about your business
                    </h1>
                    <p className="text-sm text-zinc-400">
                      This powers your AI-generated case studies.
                    </p>
                  </div>

                  <div className="space-y-6">
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
                      <ErrorMessage field="industry" />
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
                              Describe your industry
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
                                  normalizeOnBlur("customIndustry", customIndustry)
                                }
                                placeholder="e.g. Facebook Ads for dentists"
                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-medium"
                              />
                              <FieldStatus field="customIndustry" />
                            </div>
                            <ErrorMessage field="customIndustry" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Service Category */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-0.5">
                        <label
                          htmlFor="serviceCategory"
                          className="text-sm font-medium text-zinc-300"
                        >
                          Service Category
                        </label>
                        <QualityScoreBadge value={serviceCategory} />
                      </div>
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
                          placeholder={servicePlaceholder}
                          className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-medium"
                        />
                        <FieldStatus field="serviceCategory" />
                      </div>
                      <SuggestionChips
                        suggestions={
                          industry
                            ? (QUICK_SUGGESTIONS[industry] || QUICK_SUGGESTIONS.other)
                                .services
                            : []
                        }
                        onSelect={(val) => {
                          setServiceCategory(val);
                          clearFieldError("serviceCategory");
                          validateField("serviceCategory", val);
                        }}
                      />
                      <ErrorMessage field="serviceCategory" />
                    </div>

                    {/* Target Customer */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-0.5">
                        <label
                          htmlFor="targetCustomer"
                          className="text-sm font-medium text-zinc-300"
                        >
                          Who do you serve?
                        </label>
                        <QualityScoreBadge value={targetCustomer} />
                      </div>
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
                      <SuggestionChips
                        suggestions={
                          industry
                            ? (QUICK_SUGGESTIONS[industry] || QUICK_SUGGESTIONS.other).icps
                            : []
                        }
                        onSelect={(val) => {
                          setTargetCustomer(val);
                          clearFieldError("targetCustomer");
                          validateField("targetCustomer", val);
                        }}
                      />
                      <ErrorMessage field="targetCustomer" />
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

              {step === 2 && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="px-5 py-3 rounded-xl border border-white/[0.06] text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-all disabled:opacity-40 cursor-pointer"
                >
                  Skip for now
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
