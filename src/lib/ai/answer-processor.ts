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
  "decreased", "some", "many", "several", "fine", "ok", "okay",
  "good", "nice", "helped", "made it better", "satisfied",
  "good results", "happy with it", "no complaints", "worked well"
];

export const AnswerProcessor = {
  /**
   * Layer 4 - Classify the answer based on rules.
   * Can be augmented with Gemini.
   */
  classifyAnswer(answer: string, targetStage: string | undefined): AnswerClassification {
    const lower = (answer || "").toLowerCase().trim();
    const hasNumbers = /\d/.test(answer);
    const hasPercent = /%|percent|x|fold/i.test(answer);
    
    // REAL USER MODE: Short answers are inherently vague/weak for B2B Case Studies.
    if (lower.split(/\s+/).length < 5 && !hasNumbers) return "vague";
    
    if (hasNumbers && hasPercent) return "exact";
    if (hasNumbers && !hasPercent) return "estimated"; 
    
    // Check for vague phrases without specific numbers
    if (!hasNumbers && VAGUE_PHRASES.some((p) => lower.includes(p))) {
      return "vague";
    }
    
    return "qualitative";
  },

  /**
   * Generate an estimate-based follow-up if the answer is vague.
   */
  async generateEstimateFollowUp(answer: string, targetStage: string | undefined): Promise<string | null> {
    const systemPrompt = `You are an elite B2B analyst interviewing a client for a high-end Case Study.
The user just gave a weak or vague answer regarding the '${targetStage || "result"}' of their experience.
User Answer: "${answer}"

Your goal is to extract a REAL value without being annoying. 
Instead of asking "can you be more specific", provide a MENTAL ANCHOR (range) they can just agree with or correct.

RULES:
1. Be sharp and professional.
2. Provide a logical range (e.g., "closer to 10% or 30%?") so they only have to pick one.
3. Use words like "Roughly", "Estimated", "Ballpark".
4. If the stage is 'metrics', force a range.
5. If the stage is 'timeframe', give them two durations (e.g., "a few weeks or a few months?").

Output format: JSON { "followUp": "your question" }`;

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
