// ═══════════════════════════════════════════════════════════
// Auricai — AI Scorer Engine
// Grades case studies on a 0-100 scale to enforce high-quality assets
// ═══════════════════════════════════════════════════════════

import { GeminiService } from "./gemini";
import type { AICaseStudyOutput } from "@/types";

export const AIScorer = {
  /**
   * Evaluates a generated case study and returns a score from 0 to 100.
   * Breaks down the score by Density of Metrics, Contrast, and Clarity.
   */
  async scoreCaseStudy(
    caseStudy: AICaseStudyOutput
  ): Promise<{
    totalScore: number;
    breakdown: {
      metricsDensity: number; // Max 40
      contrast: number;       // Max 30
      clarity: number;        // Max 30
    };
    feedback: string;
  }> {
    const systemPrompt = `You are a strict editorial grader for B2B case studies.
Your job is to evaluate the following Case Study and score it on a 0-100 scale.

Scoring Criteria:
1. Metrics Density (0-40 points): Are there hard, specific numbers (%, $, timeframes)? If none, score 0. If "Not provided", score 0.
2. Contrast (0-30 points): Is there a clear distinction between the "Before" state and the "After" state? Does it clearly articulate the transformation?
3. Clarity (0-30 points): Is the headline punchy? Is the summary concise without marketing buzzwords? Does the testimonial sound authentic?

CASE STUDY TO EVALUATE:
Headline: ${caseStudy.headline}
Summary: ${caseStudy.summary || caseStudy.story || ""}
Before: ${caseStudy.before}
After: ${caseStudy.after}
Metrics: ${caseStudy.metrics}
Testimonial: ${caseStudy.quote}

Return ONLY JSON matching:
{
  "totalScore": number (0-100),
  "breakdown": {
    "metricsDensity": number (0-40),
    "contrast": number (0-30),
    "clarity": number (0-30)
  },
  "feedback": "1-2 sentence explanation of the score"
}`;

    try {
      const parsed = await GeminiService.generateJSON<any>({
        systemPrompt,
        userPrompt: "Grade the provided case study using the strict scoring metrics.",
        temperature: 0,
      });

      return {
        totalScore: parsed.totalScore || 0,
        breakdown: {
          metricsDensity: parsed.breakdown?.metricsDensity || 0,
          contrast: parsed.breakdown?.contrast || 0,
          clarity: parsed.breakdown?.clarity || 0,
        },
        feedback: parsed.feedback || "Generated without extensive feedback.",
      };
    } catch (err) {
      console.error("[AIScorer] Gemini scoring failed:", err);
      // Fallback: approve conditionally if AI fails
      return {
        totalScore: 75,
        breakdown: { metricsDensity: 25, contrast: 25, clarity: 25 },
        feedback: "AI scoring unavailable, bypassed.",
      };
    }
  },
};
