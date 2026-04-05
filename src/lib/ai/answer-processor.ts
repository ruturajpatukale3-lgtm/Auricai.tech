// ═══════════════════════════════════════════════════════════
// Auricai — Answer Processor (Layer 4)
// Classifies answers and generates estimate-based follow-ups.
// ═══════════════════════════════════════════════════════════

import { AnswerClassification } from "@/types";
import { GeminiService } from "./gemini";

const VAGUE_PHRASES = [
  "a lot", "improved", "better", "significant", "greatly",
  "much better", "way more", "huge improvement", "really good",
  "pretty good", "went up", "went down", "increased",
  "decreased", "some", "many", "several"
];

export const AnswerProcessor = {
  /**
   * Layer 4 - Classify the answer based on rules.
   * Can be augmented with Gemini.
   */
  classifyAnswer(answer: string, targetStage: string): AnswerClassification {
    const lower = answer.toLowerCase().trim();
    const hasNumbers = /\d/.test(answer);
    const hasPercent = /%|percent|x/.test(answer);
    
    if (hasNumbers && hasPercent) return "exact";
    if (hasNumbers && !hasPercent) return "estimated"; // Often a number of leads or raw time is an estimate or exact
    
    // Check for vague phrases without specific numbers
    if (!hasNumbers && VAGUE_PHRASES.some((p) => lower.includes(p))) {
      return "vague";
    }

    if (lower.split(/\s+/).length < 4) return "vague";
    
    return "qualitative";
  },

  /**
   * Generate an estimate-based follow-up if the answer is vague.
   */
  async generateEstimateFollowUp(answer: string, targetStage: string): Promise<string | null> {
    const systemPrompt = `You are a friendly AI interviewer collecting case study data.
The user just gave a vague answer to a question regarding the '${targetStage}' stage.
Their answer: "${answer}"

Your task is to generate a SHORT follow-up question (1 sentence) asking them for their best ESTIMATE.
Give them a multiple-choice like range to make it easy to answer.

Examples:
- "Roughly how much did that improve? Closer to 20% or 40%?"
- "About how many more leads? 10 or 50?"
- "What's your best estimate? A few days or a few weeks?"

RULES:
1. Do NOT ask "can you elaborate" or "be more specific".
2. Force an estimate range relevant to the context.
3. Use words like "Roughly", "Approximately", "About".
4. Output valid JSON in the format { "followUp": "your question" }`;

    try {
      const parsed = await GeminiService.generateJSON<{ followUp: string }>({
        systemPrompt,
        userPrompt: "Generate the estimate follow-up question.",
        temperature: 0.6,
      });

      return parsed.followUp?.trim() || "What's your best estimate?";
    } catch (error) {
      console.error("[AnswerProcessor] Failed to generate estimate follow up:", error);
      return "Roughly how much did that improve? What's your best estimate?";
    }
  }
};
