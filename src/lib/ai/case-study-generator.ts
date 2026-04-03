// ═══════════════════════════════════════════════════════════
// Auricai — AI Case Study Generator
// Generates structured case studies from collected interview data.
// STRICT: Zero hallucination. Only uses provided data.
// ═══════════════════════════════════════════════════════════

import { GeminiService } from "./gemini";
import type { OrgProfile, StructuredAnswers, AICaseStudyOutput } from "@/types";

function buildContextBlock(profile: OrgProfile): string {
  return [
    `Industry: ${profile.industry_raw || profile.industry}`,
    `Service Category: ${profile.service_category}`,
    `Service: ${profile.service_type}`,
    `Target Customer: ${profile.target_customer}`,
  ].join("\n");
}

export const CaseStudyGenerator = {
  /**
   * Generate a structured case study from collected answers.
   * Returns a formatted object ready to persist in the database.
   */
  async generate(
    answers: StructuredAnswers,
    orgProfile: OrgProfile
  ): Promise<AICaseStudyOutput> {
    const systemPrompt = `You are a case study writer for a B2B company. Your job is to create a professional, concise case study from interview data.

BUSINESS CONTEXT:
${buildContextBlock(orgProfile)}

STRICT RULES:
1. ONLY use data from the COLLECTED ANSWERS below. Do NOT invent or assume anything.
2. If a field has no data, write "Not provided" — do NOT make something up.
3. NO buzzwords. NO marketing fluff. Write clear, direct prose.
4. MUST include specific metrics if they were provided.
5. Keep the headline punchy (under 15 words).
6. Keep the summary to 2-3 sentences.
7. The testimonial MUST be an exact or close paraphrase of what the interviewee said.

COLLECTED ANSWERS:
- Business Context: ${answers.business_context || "Not provided"}
- Problem: ${answers.problem || "Not provided"}
- Result: ${answers.result || "Not provided"}
- Metrics: ${answers.metrics || "Not provided"}
- Timeframe: ${answers.timeframe || "Not provided"}
- Testimonial: ${answers.testimonial || "Not provided"}

Return JSON with this exact schema:
{
  "headline": "short punchy headline",
  "summary": "2-3 sentence summary of the transformation",
  "before": "state before (the problem)",
  "after": "state after (the result)",
  "metrics": "key numbers and KPIs",
  "testimonial": "direct quote or close paraphrase"
}`;

    try {
      const parsed = await GeminiService.generateJSON<any>({
        systemPrompt,
        userPrompt: "Generate the case study from the collected data. Remember: ZERO hallucination.",
        temperature: 0.3,
      });

      return {
        headline: parsed.headline || "Case Study",
        summary: parsed.summary || "",
        before: parsed.before || answers.problem || "Not provided",
        after: parsed.after || answers.result || "Not provided",
        metrics: parsed.metrics || answers.metrics || "Not provided",
        testimonial: parsed.testimonial || answers.testimonial || "Not provided",
      };
    } catch (err) {
      console.error("[CaseStudyGenerator] Gemini call failed, using raw data:", err);
      // Fallback: assemble from raw answers without AI
      return {
        headline: `Client achieved measurable results`,
        summary: answers.result || "Results were achieved through the engagement.",
        before: answers.problem || "Not provided",
        after: answers.result || "Not provided",
        metrics: answers.metrics || "Not provided",
        testimonial: answers.testimonial || "Not provided",
      };
    }
  },
};
