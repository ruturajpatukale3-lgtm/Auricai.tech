// ═══════════════════════════════════════════════════════════
// Auricai — Context Engine (Layer 1 & 5)
// Injects businessContext into every AI decision.
// Adapts questions based on business profile dynamically.
// ═══════════════════════════════════════════════════════════

import type { OrgProfile, PlanType } from "@/types";

export interface BusinessContext {
  industry: string;
  serviceCategory: string;
  serviceDescription: string;
  targetCustomer: string;
  aiTone: string;
  aiOutputStyle: string;
  aiCaseStudyStyle: string;
  plan: PlanType;
  brandName?: string;
}

export interface DynamicPolicy {
  focusAreas: string[];
  forbiddenQuestions: string[];
}

export const ContextEngine = {
  /**
   * Layer 1 - Context Engine
   * Extract reliable business context data for the AI.
   */
  buildContext(profile: OrgProfile, plan: PlanType = "starter", orgName?: string): BusinessContext {
    return {
      industry: profile.industry_raw || profile.industry || "other",
      serviceCategory: profile.service_category || "Professional Services",
      serviceDescription: profile.service_type || "Services",
      targetCustomer: profile.target_customer || "Businesses",
      aiTone: profile.ai_tone || "professional",
      aiOutputStyle: profile.ai_output_style || "detailed",
      aiCaseStudyStyle: profile.ai_case_study_style || "story_driven",
      plan,
      brandName: orgName,
    };
  },

  /**
   * Layer 5 - Dynamic Question Policy
   * Focus areas and exclusions adapted by industry.
   */
  getDynamicPolicy(industry: string): DynamicPolicy {
    const lower = industry.toLowerCase();
    
    // Core forbidden rules (NEVER ask):
    const forbiddenQuestions = [
      "what the business does",
      "what your service is",
      "explain the industry",
      "service explanation"
    ];

    if (lower.includes("saas") || lower.includes("software") || lower.includes("technology")) {
      return {
        focusAreas: ["conversion", "activation", "retention", "churn", "time saved", "active users"],
        forbiddenQuestions,
      };
    }
    
    if (lower.includes("agency") || lower.includes("marketing") || lower.includes("advertising")) {
      return {
        focusAreas: ["leads", "booked calls", "conversion rate", "pipeline", "ROAS", "cost per acquisition"],
        forbiddenQuestions,
      };
    }
    
    if (lower.includes("consulting") || lower.includes("coaching") || lower.includes("b2b")) {
      return {
        focusAreas: ["clarity", "outcomes", "speed", "revenue impact", "operational efficiency", "strategic alignment"],
        forbiddenQuestions,
      };
    }
    
    if (lower.includes("ecommerce") || lower.includes("retail")) {
      return {
        focusAreas: ["AOV", "conversion rate", "LTV", "cart abandonment", "gross margin", "retention"],
        forbiddenQuestions,
      };
    }

    // Default Fallback
    return {
      focusAreas: ["time saved", "revenue impact", "efficiency gains", "process improvements"],
      forbiddenQuestions,
    };
  },

  /**
   * Serializes the context block for Gemini Prompt
   */
  serializeContext(context: BusinessContext, policy: DynamicPolicy): string {
    return `[BUSINESS PROFILE]
Industry: ${context.industry}
Service Category: ${context.serviceCategory}
Service: ${context.serviceDescription}
Target Customer: ${context.targetCustomer}

[WRITING PREFERENCES]
Tone: ${context.aiTone}
Output Style: ${context.aiOutputStyle}
Narrative Strategy: ${context.aiCaseStudyStyle}

[DYNAMIC POLICY]
Focus Areas to Probe: ${policy.focusAreas.join(", ")}
Forbidden Topics: ${policy.forbiddenQuestions.join(", ")}
`;
  }
};
