// ═══════════════════════════════════════════════════════════
// Auricai — AI Validator Engine
// Input & Output verification to ensure elite quality case studies
// ═══════════════════════════════════════════════════════════

import { GeminiService } from "./gemini";
import type { StructuredAnswers, AICaseStudyOutput } from "@/types";

export const AIValidator = {
  /**
   * Semantically evaluates a user's answer before it is saved.
   * Rejects gibberish. Optionally auto-corrects vague wording.
   */
  async validateAnswer(
    answer: string,
    expectedIntent: string
  ): Promise<{
    isValid: boolean;
    rejectionReason?: string;
    autoCorrectedText?: string;
  }> {
    // Basic fast-fail for extremely short or repetitive keyboard smashes
    if (answer.trim().length <= 2) {
      return { isValid: false, rejectionReason: "Please provide a bit more detail." };
    }

const systemPrompt = `You are a strict data quality validator for case study interviews.
The user was asked a question related to "${expectedIntent}".
Your job is to:
1. Verify if the input is coherent (not gibberish, not keyboard smashes like "asdf").
2. Check if it addresses the topic with specific context.
3. REJECT generic one-word answers or extremely broad industry terms (e.g. "marketing", "saas", "sales", "services", "consulting") WITHOUT further detail.
4. If the intent is "metrics", you MUST REJECT vague answers that lack specific numbers, percentages, or dollar amounts (e.g., reject "It increased a lot" or "We saw a huge ROI").
5. If valid but poorly phrased/vague, provide a cleaner "autoCorrectedText" version of their statement.

RULES:
- If gibberish, irrelevant, or EXTREMELY GENERIC: isValid=false, provide a rejectionReason (tell them to be more specific).
- If intent is "metrics" AND no numbers/percentages/money exist: isValid=false, provide a rejectionReason (e.g., "Could you share a specific number or percentage? Even an estimate is fine.").
- If valid but needs minor cleanup: isValid=true, provide autoCorrectedText.
- If valid and good: isValid=true, autoCorrectedText=original answer.

Return ONLY JSON matching:
{
  "isValid": boolean,
  "rejectionReason": "string or null",
  "autoCorrectedText": "string or null"
}`;

    try {
      const parsed = await GeminiService.generateJSON<any>({
        systemPrompt,
        userPrompt: `User Answer: "${answer}"`,
        temperature: 0,
      });

      return {
        isValid: !!parsed.isValid,
        rejectionReason: parsed.rejectionReason || undefined,
        autoCorrectedText: parsed.autoCorrectedText || answer,
      };
    } catch (err) {
      console.error("[AIValidator] Gemini validation failed, failing open:", err);
      // Fail open (accept) if AI is down so we don't break the user experience entirely
      return { isValid: true, autoCorrectedText: answer };
    }
  },

  /**
   * Strictly checks a generated case study against the raw answers and corporate tone rules.
   * Extracts numbers/metric claims and verifies they exist in the raw answers.
   * Rejects exaggerated language (marketing fluff).
   */
  async verifyEnterpriseQuality(
    caseStudy: AICaseStudyOutput,
    answers: StructuredAnswers
  ): Promise<{ hasHallucination: boolean; hasToneIssue: boolean; flaggedClaims: string[] }> {
    const rawContextString = Object.entries(answers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const systemPrompt = `You are an elite hallucination-detection and tone-checking engine.
Your job is to compare a generated Case Study against the RAW INTERVIEW ANSWERS provided by the user.

RAW INTERVIEW ANSWERS:
${rawContextString || "(No data)"}

GENERATED CASE STUDY:
Headline: ${caseStudy.headline}
Summary: ${caseStudy.summary}
Before: ${caseStudy.before}
After: ${caseStudy.after}
Metrics: ${caseStudy.metrics}
Testimonial: ${caseStudy.testimonial}

STRICT INSTRUCTIONS:
1. Extract every specific claim, number, percentage, timeframe, or entity from the Case Study.
2. Verify if it exists anywhere in the RAW INTERVIEW ANSWERS.
3. If the Case Study contains ANY number or specific claim NOT present in the raw answers, it is a HALLUCINATION.
4. Check for unverified EXAGGERATED TONE (e.g. "groundbreaking", "revolutionary", "magical", "best in the world"). If present, it's a TONE ISSUE.
5. "Not provided" or generic phrasing is acceptable, but injecting "$5M" when the user said "We made money" is a hallucination.

Return ONLY JSON matching:
{
  "hasHallucination": boolean,
  "hasToneIssue": boolean,
  "flaggedClaims": ["specific claim 1", "tone claim 2"] (empty array if none)
}`;

    try {
      const parsed = await GeminiService.generateJSON<any>({
        systemPrompt,
        userPrompt: "Analyze the generated case study against the raw answers for hallucinations and tone issues.",
        temperature: 0,
      });

      return {
        hasHallucination: !!parsed.hasHallucination,
        hasToneIssue: !!parsed.hasToneIssue,
        flaggedClaims: parsed.flaggedClaims || [],
      };
    } catch (err) {
      console.error("[AIValidator] Gemini quality check failed, defaulting to safe:", err);
      return { hasHallucination: false, hasToneIssue: false, flaggedClaims: [] };
    }
  },
};
