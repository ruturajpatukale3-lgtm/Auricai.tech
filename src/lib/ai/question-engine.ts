import { GeminiService } from "./gemini";
import type {
  AIQuestionResponse,
  InterviewStage,
  InterviewState,
} from "@/types";
import { BusinessContext, DynamicPolicy, ContextEngine } from "./context-engine";
import { StateEngine } from "./state-engine";

// ─── Step 6: Locked Question Bank ──────────────────────────
const QUESTION_BANK: Record<string, string[]> = {
  problem: [
    "What was the main issue you were facing before using this solution?",
    "What was the biggest hurdle for your team before we started?",
    "Could you describe the main challenge that led you to look for a solution?",
  ],
  result: [
    "What was the most significant change you noticed after implementation?",
    "In terms of outcomes, what shifted the most for your business?",
    "What was the immediate result after you started using the service?",
  ],
  metrics: [
    "Do you have any specific numbers or % improvements you can share?",
    "Any data or ROI metrics that highlight the success of this project?",
    "Roughly how much did that improve your key performance indicators?",
  ],
  timeframe: [
    "How long did it take for you to start seeing these results?",
    "What was the timeframe between starting and seeing the first major impact?",
    "In about how many weeks or months did you start to notice the shift?",
  ],
  testimonial: [
    "Would you recommend this to a colleague? If so, why?",
    "What would you tell someone else who is considering this solution?",
    "Why do you think this was the right choice for your organization?",
  ],
  business_context: [
    "What made you choose this solution over other options in the market?",
  ],
};

// ─── Step 7: Hard Output Filter (Step 13) ──────────────────
const BANNED_PATTERNS = [
  /your company/i,
  /your business/i,
  /your product/i,
  /what do you do/i,
  /target market/i,
  /what does your/i,
  /who are your users/i,
  /describe your saas/i,
];

const PROOF_PATTERNS = /problem|before|result|change|improve|increase|reduce|time|recommend|challenge|hurdle|outcome|churn|retention|roas|leads|revenue/i;

// ─── Step 14: Production System Prompt ─────────────────────
const PRODUCTION_SYSTEM_PROMPT = `
ROLE:
You are a Proof Extraction AI.
You are interviewing a CLIENT who used the product.
You are NOT allowed to ask about the business, SaaS, or product itself.

MISSION:
Extract structured proof for:
* case studies
* testimonials
* marketing assets

LOCKED CONTEXT:
* Industry, Service, Target Customer are already known
* NEVER ask about them
* Use them only to shape questions

STRICT RULES (NON-NEGOTIABLE):
NEVER ask:
* what the product does
* what the company does
* who the users are
* target market
* service description
* "describe your SaaS"

INTERVIEW STATES (FOLLOW ORDER):
1. problem
2. result
3. metrics
4. timeframe
5. testimonial

QUESTION STYLE:
* One question only
* Simple, conversational, low effort

DYNAMIC SHAPING (IMPORTANT):
SaaS: focus on churn, activation, retention
Agency: focus on leads, calls, ROAS
Ecom: focus on AOV, conversion rate, revenue

FAILSAFE:
If confused, ask next missing state question. Do NOT ask generic discovery questions.
`;

export const QuestionEngine = {
  /**
   * Step 8: Safe Generation (Deterministic)
   * Picks from bank and validates patterns.
   */
  async generateNextQuestion(
    context: BusinessContext,
    policy: DynamicPolicy,
    state: InterviewState
  ): Promise<AIQuestionResponse> {
    const { stage: targetStage } = state;

    // Check completion condition
    const signals = StateEngine.extractSignals(state.answers as any);
    if (targetStage === "testimonial" && signals.testimonial) {
       return {
        question: "",
        intent: "testimonial",
        stage: "testimonial",
        isFollowUp: false,
        isComplete: true,
      };
    }

    const metricAttempts = state.answers.filter(a => a.stage === "metrics").length;
    let question = this.getFallbackQuestion(targetStage); // Default to bank
    let isAIProduced = false;

    // ─── AI Generation Attempt (Step 8) ────────────────────
    try {
      const industryShaping = `
[INDUSTRY CONTEXT]
Industry: ${context.industry}
Service: ${context.serviceCategory}
Target ICP: ${context.targetCustomer}
Target Stage: ${targetStage.toUpperCase()}

[DYNAMIC SHAPING INSTRUCTIONS]
If SaaS, focus on churn/retention. If Agency, focus on ROAS/leads.
      `;

      const aiQuestion = await GeminiService.generateText({
        systemPrompt: PRODUCTION_SYSTEM_PROMPT,
        userPrompt: `${industryShaping}\n\n${ContextEngine.serializeContext(context, policy)}\n${StateEngine.serializeState(state)}\n\nGenerate the next question for the ${targetStage.toUpperCase()} stage. RESPONSE MUST BE ONE QUESTION ONLY.`,
        temperature: 0.5,
      });

      if (aiQuestion && this.validateQuestion(aiQuestion)) {
        question = aiQuestion.trim();
        isAIProduced = true;
      } else {
        console.warn("[QuestionEngine] AI output REJECTED or INVALID, falling back to bank.");
      }
    } catch (err) {
      console.error("[QuestionEngine] AI Generation failed, using state template fallback.");
    }

    // Basic options mapping based on stage
    const optionsMap: Record<string, string[]> = {
      metrics: ["10-25%", "25-50%", "Over 50%", "Not sure"],
      timeframe: ["Under 2 weeks", "About 1 month", "2-3 months", "Not sure"],
      testimonial: ["Life-changing", "Very helpful", "Great ROI", "Other"],
    };

    return {
      question,
      options: optionsMap[targetStage] || [],
      intent: StateEngine.mapIntentToStage(targetStage) as any,
      stage: targetStage,
      isFollowUp: metricAttempts > 0,
      isComplete: false,
    };
  },

  getValidQuestion(stage: InterviewStage): string {
    const questions = QUESTION_BANK[stage] || QUESTION_BANK["result"];
    
    for (let i = 0; i < questions.length; i++) {
       const q = questions[i];
       if (this.validateQuestion(q)) {
         return q;
       }
    }
    
    return questions[0];
  },

  validateQuestion(q: string): boolean {
    // 1. Check banned patterns (SaaS Discovery)
    if (BANNED_PATTERNS.some(p => p.test(q))) {
      return false;
    }

    // 2. Check proof patterns
    return PROOF_PATTERNS.test(q);
  },

  /**
   * Step 9: Safe Fallback
   */
  getFallbackQuestion(stage: InterviewStage): string {
    return QUESTION_BANK[stage]?.[0] || QUESTION_BANK["result"][0];
  },
};
