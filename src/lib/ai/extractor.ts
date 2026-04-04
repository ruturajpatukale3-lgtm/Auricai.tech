import { GeminiService } from "./gemini";
import type { OrgProfile } from "@/types";

export type ExtractedMetrics = {
  metricType: "revenue" | "conversion" | "time" | "efficiency" | "cost" | "retention";
  before: number;
  after: number;
  timeframe: string;
  pipelineValue: number;
  dealsInfluenced: number;
  isVague: boolean;
  missingFields: string[];
};

/** Build business context block for AI prompt injection */
function buildContextBlock(profile: OrgProfile): string {
  const parts = [
    `Industry: ${profile.industry_raw || profile.industry}`,
    `Service Category: ${profile.service_category}`,
    `Service: ${profile.service_type}`,
    `Target Customer: ${profile.target_customer}`,
  ];
  return `\n\nBUSINESS CONTEXT (use to calibrate metric interpretation):\n${parts.join("\n")}`;
}

export const AIExtractor = {
  /**
   * Strictly extracts verified metrics from natural language interview answers.
   * Optionally accepts org business context for improved extraction.
   */
  async extractMetrics(
    answers: { question: string; answer: string }[],
    orgContext?: OrgProfile | null
  ): Promise<ExtractedMetrics> {
    const contextBlock = orgContext ? buildContextBlock(orgContext) : "";

    if (!orgContext) {
      console.warn("[AIExtractor] WARNING: Missing business context. Proceeding with generic fallback.");
    }

    const systemPrompt = `
      You are a strict data extraction engine for a B2B Case Study platform.
      You MUST extract structured business results from user interview answers.
      You MUST return JSON ONLY.
      You MUST NOT hallucinate or guess numbers.
      ${contextBlock}
      
      RULES:
      1. Identify the 'metricType' as exactly one of: "revenue", "conversion", "time", "efficiency", "cost", "retention".
      2. If "before" or "after" numbers exist in the user's answers, put them exactly as integers. If they wrote "$500k", put 500000. If they did NOT provide a specific number, you MUST use 0.
      3. "timeframe" is a string like "3 months", "Q4", or "1 year".
      4. "pipelineValue" is the raw dollar amount generated (integer). Default 0 if none mentioned.
      5. "dealsInfluenced" is the integer count of deals closed via this study. Default 0 if none.
      6. If the user's answers lack hard numeric values anywhere, set "isVague" to true.
      7. NEVER guess or invent numbers. Only extract what is explicitly stated in the text.
    `;

    const userPayload = JSON.stringify(answers, null, 2);

    try {
      const parsed = await GeminiService.generateJSON<any>({
        systemPrompt,
        userPrompt: `Extract the metrics matching the schema perfectly from these answers:\n${userPayload}`,
        temperature: 0.1,
      });

      return {
        metricType: parsed.metricType || "efficiency",
        before: Number(parsed.before) || 0,
        after: Number(parsed.after) || 0,
        timeframe: parsed.timeframe || "N/A",
        pipelineValue: Number(parsed.pipelineValue) || 0,
        dealsInfluenced: Number(parsed.dealsInfluenced) || 0,
        isVague: parsed.isVague === true,
        missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
      };
    } catch (err) {
      console.error("[AIExtractor] Gemini extraction failed:", err);
      // Let the caller (Inngest job) catch this so it triggers the retry strategy
      throw new Error("Failed to extract valid logic from Gemini response.");
    }
  }
};

