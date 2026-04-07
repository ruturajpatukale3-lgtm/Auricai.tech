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
    const systemPrompt = `You are a professional assistant interviewing a client for a premium Case Study.
The user just gave a general answer regarding the '${targetStage || "result"}'.
User Answer: "${answer}"

Your goal is to effortlessly guide them to an estimated value without ANY pressure. 
Instead of asking "Could you be more specific?", provide a supportive MENTAL ANCHOR (range) they can just agree with or gently correct.

RULES:
1. Always start with a short acknowledgment: "Got it—that makes sense." or "That's useful context."
2. Provide a SOFT range (e.g., "closer to 10% or 30%?") based on the industry.
3. Use words like "Roughly", "Estimated", "Ballpark".
4. The goal is to make them feel confident about providing an estimate, not a test.
5. If they cannot provide a number, it's totally fine to move on.

Output format: JSON { "followUp": "your short acknowledgment + your question" }`;

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
