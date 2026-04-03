// ═══════════════════════════════════════════════════════════
// CaseFlow — Zod Validation Schemas (Zod v4)
// Validate all inputs. Trust nothing from the client.
// ═══════════════════════════════════════════════════════════

import { z } from "zod";
 
// ─── Constants ──────────────────────────────────────────────
 
const GENERIC_TERMS = [
  "marketing",
  "services",
  "business",
  "consulting",
  "software",
  "agency",
  "b2b",
  "b2c",
  "tech",
  "sales",
  "b2b saas",
];
 
const isGeneric = (val: string) =>
  GENERIC_TERMS.includes(val.toLowerCase().trim());

// ─── Interview ─────────────────────────────────────────────

export const createInterviewSchema = z.object({
  client_email: z
    .string()
    .email("Valid email required")
    .max(255, "Email too long"),
  client_name: z
    .string()
    .max(100, "Name too long")
    .optional(),
});

export const submitAnswerSchema = z.object({
  question: z
    .string()
    .min(1, "Question required")
    .max(500, "Question too long"),
  answer: z
    .string()
    .min(1, "Answer required")
    .max(5000, "Answer too long"),
  currentIndex: z.number().int().min(0).optional(),
  totalQuestions: z.number().int().min(1).optional(),
});

// ─── Case Study ────────────────────────────────────────────

export const updateCaseStudySchema = z.object({
  company_name: z.string().min(1).max(100).optional(),
  headline: z.string().max(200).optional(),
  metric_type: z.string().max(50).optional(),
  before_value: z.string().max(50).optional(),
  after_value: z.string().max(50).optional(),
  delta_percent: z.number().optional(),
  timeframe: z.string().max(100).optional(),
  pipeline_value: z.number().min(0).optional(),
  deals_influenced: z.number().int().min(0).optional(),
});

// ─── Team ──────────────────────────────────────────────────

export const teamInviteSchema = z.object({
  email: z
    .string()
    .email("Valid email required")
    .max(255, "Email too long"),
  role: z.enum(["admin", "editor"], {
    message: "Role must be admin or editor",
  }),
});

// ─── Domain ────────────────────────────────────────────────

export const addDomainSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain too short")
    .max(253, "Domain too long")
    .regex(
      /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z]{2,})+$/,
      "Invalid domain format"
    ),
});

// ─── Deals ─────────────────────────────────────────────────

export const createDealSchema = z.object({
  name: z
    .string()
    .min(1, "Deal name required")
    .max(200, "Deal name too long"),
  value: z
    .number()
    .min(0, "Deal value must be positive")
    .max(999_999_999, "Deal value too large"),
  status: z.enum(["open", "closed_won", "closed_lost"]).default("open"),
});

export const attributeDealSchema = z.object({
  deal_id: z.string().uuid("Invalid deal ID"),
  case_study_id: z.string().uuid("Invalid case study ID"),
});

export const updateDealStatusSchema = z.object({
  deal_id: z.string().uuid("Invalid deal ID"),
  status: z.enum(["open", "closed_won", "closed_lost"], {
    message: "Status must be open, closed_won, or closed_lost",
  }),
});

// ─── Settings ──────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional(),
});

// ─── AI Interview ──────────────────────────────────────────

const INTERVIEW_INTENTS = [
  "business_context",
  "problem",
  "result",
  "metrics",
  "timeframe",
  "testimonial",
] as const;

export const aiInterviewAnswerSchema = z.object({
  answer: z
    .string()
    .min(1, "Answer is required")
    .max(5000, "Answer too long")
    .optional(),
  intent: z.enum(INTERVIEW_INTENTS).optional(),
});

// ─── Org Profile Update ────────────────────────────────────

const ORG_PROFILE_INDUSTRY_OPTIONS = [
  "marketing_agency",
  "saas",
  "ecommerce",
  "consulting",
  "other",
] as const;

export const updateOrgProfileSchema = z
  .object({
    industry: z.enum(ORG_PROFILE_INDUSTRY_OPTIONS, {
      message: "Please select your industry",
    }).optional(),
    custom_industry: z
      .string()
      .max(100, "Industry name too long")
      .optional(),
    service_category: z
      .string()
      .min(3, "Please be more specific (min 3 chars)")
      .max(100, "Service category too long")
      .optional(),
    service_type: z
      .string()
      .min(3, "Please describe your service (min 3 chars)")
      .max(500, "Service description too long")
      .optional(),
    target_customer: z
      .string()
      .min(3, "Please specify your target customer (min 3 chars)")
      .max(300, "Target customer description too long")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.industry === "other") {
      const trimmed = (data.custom_industry || "").trim();
      if (!trimmed || trimmed.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please specify your industry (min 3 chars)",
          path: ["custom_industry"],
        });
      }
    }
  });

// ─── Danger Zone ───────────────────────────────────────────

export const dangerResetSchema = z.object({
  confirmation: z.literal("RESET", {
    message: 'You must type "RESET" to confirm',
  }),
});

export const dangerDeleteSchema = z.object({
  confirmation: z.literal("DELETE", {
    message: 'You must type "DELETE" to confirm',
  }),
});

// ─── Business Context (Onboarding Step 2) ──────────────────

const INDUSTRY_OPTIONS = [
  "marketing_agency",
  "saas",
  "ecommerce",
  "consulting",
  "other",
] as const;

/* PRIMARY_GOAL_OPTIONS removed */

export const businessContextSchema = z
  .object({
    industry: z.enum(INDUSTRY_OPTIONS, {
      message: "Please select your industry",
    }),
    custom_industry: z
      .string()
      .max(100, "Industry name too long")
      .optional()
      .default(""),
    service_category: z
      .string()
      .min(3, "Please be more specific (min 3 chars)")
      .max(100, "Service category too long"),
    service_type: z
      .string()
      .min(3, "Please describe your service (min 3 chars)")
      .max(500, "Service description too long"),
    target_customer: z
      .string()
      .min(3, "Please specify your target customer (min 3 chars)")
      .max(300, "Target customer description too long"),
  })
  .superRefine((data, ctx) => {
    // Conditional: If "other" is selected, custom_industry is required
    if (data.industry === "other") {
      const trimmed = (data.custom_industry || "").trim();
      if (!trimmed || trimmed.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please specify your industry (min 3 chars)",
          path: ["custom_industry"],
        });
      }
    }
  });

// ─── Helpers ───────────────────────────────────────────────

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues?.[0];
    return {
      success: false,
      error: firstIssue?.message || "Validation failed",
    };
  }
  return { success: true, data: result.data };
}
