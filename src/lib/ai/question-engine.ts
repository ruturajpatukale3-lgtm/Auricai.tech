// ═══════════════════════════════════════════════════════════
// Auricai — AI Question Engine (Layer 3)
// Enforces "High-Value Only" data extraction logic.
// ═══════════════════════════════════════════════════════════

import { GeminiService } from "./gemini";
import type {
  AIQuestionResponse,
  InterviewStage,
  InterviewState,
} from "@/types";
import { BusinessContext, DynamicPolicy, ContextEngine } from "./context-engine";
import { StateEngine } from "./state-engine";
import { MemorySystem } from "./memory-system";

export const QuestionEngine = {
  /**
   * Generate the next interview question using the candidate generation & scoring engine.
   */
  async generateNextQuestion(
    context: BusinessContext,
    policy: DynamicPolicy,
    state: InterviewState
  ): Promise<AIQuestionResponse> {
    
    // Default complete condition with FINAL QUALITY SCAN
    if (state.stage === "testimonial" && state.answers.find(a => a.stage === "testimonial")) {
       // FINAL QUALITY SCAN: If we are 'done' but missing critical bits, force one last targeted question.
       const hasTimeframe = state.answers.some(a => a.stage === "timeframe");
       const hasImpact = state.answers.some(a => a.stage === "testimonial");
       const hasLockedMetric = state.metrics.some(m => m.isLocked);

       if (state.qualityScore < 70 && state.answers.length < 8) {
          if (!hasLockedMetric) {
             return { question: "One last thing—to make this story really powerful, could you provide any specific revenue or pipeline numbers?", intent: "metrics", stage: "metrics", isFollowUp: true, isComplete: false };
          }
          if (!hasTimeframe) {
             return { question: "Quickly, how long did it take for you to start seeing these results?", intent: "timeframe", stage: "timeframe", isFollowUp: true, isComplete: false };
          }
          if (!hasImpact) {
             return { question: "And finally, what was the biggest impact this had on your day-to-day business operations?", intent: "result", stage: "testimonial", isFollowUp: true, isComplete: false };
          }
       }

       return {
        question: "",
        intent: "testimonial",
        stage: "testimonial",
        isFollowUp: false,
        isComplete: true,
      };
    }

    const { stage: targetStage } = state;

    const previousQuestions = state.answers.map(a => a.answer).join("\n");
    const bestQuestionsFromMemory = await MemorySystem.getBestQuestions(context.industry, targetStage, context.plan);

    const systemPrompt = `You are the Auricai Production-Grade Interview Engine. Your goal is high-value DATA EXTRACTION for a B2B case study.
You act as a deterministic strategist, NOT a creative chatbot.

${ContextEngine.serializeContext(context, policy)}
${StateEngine.serializeState(state)}

[NON-NEGOTIABLE RULES]
1. The "stage" field in your JSON MUST ALWAYS be one of:
   - "business_context" (Company background, industry, service type)
   - "problem" (The pain, challenge, or situation before using our service)
   - "result" (The outcome, improvement, or broad success achieved)
   - "metrics" (Hard numbers, percentages, ROI, conversions)
   - "timeframe" (How long it took to see results, duration)
   - "testimonial" (Direct feedback, impact on day-to-day, or colleague recommendation)

2. ZERO-CRASH GUARANTEE: You must NEVER return an invalid, undefined, or null stage.
3. If the stage is unclear, DEFAULT TO: "result".
4. Each question must target NEW information and move the flow forward. DO NOT repeat topics from [PREVIOUS ANSWERS] or [LOCKED METRICS].

[METRIC LOCKING & PRIORITY]
- If a metric type is LOCKED in the state, DO NOT ask for it again.
- PRIORITY: revenue > pipeline > conversion_rate > leads. 
- If a high-priority metric isn't locked, your question MUST target it specifically.

[STAGE MAPPING ENGINE (INTERNAL BRAIN)]
If you internally think:
- background/experience → business_context
- pain/challenge → problem
- outcome/improvement → result
- numbers/conversion → metrics
- duration → timeframe
- feedback/impact/recommendation → testimonial

Respond with ONLY valid JSON containing an array of 3 candidates exactly matching this schema:
{
  "candidates": [
    {
      "question": "string (the specific, Proof-extraction question)",
      "informationGainScore": number (1-10),
      "relevanceScore": number (1-10),
      "answerProbabilityScore": number (1-10)
    }
  ]
}`;

    let bestQuestion = this.getFallbackQuestion(targetStage);
    
    try {
      const parsed = await GeminiService.generateJSON<{
        candidates: {
          question: string;
          informationGainScore: number;
          relevanceScore: number;
          answerProbabilityScore: number;
        }[];
      }>({
        systemPrompt,
        userPrompt: "Generate the 3 candidates and their raw scores. Ensure they are HIGH-VALUE data extractors.",
        temperature: 0.7, 
      });

      if (parsed?.candidates?.length > 0) {
        let highestScore = -Infinity;
        
        for (const candidate of parsed.candidates) {
          let repetition_penalty = 0;
          let vagueness_penalty = 0;
          
          const qLower = candidate.question.toLowerCase();
          
          if (qLower.includes("tell me about") || qLower.includes("elaborate") || qLower.includes("how was it")) {
            vagueness_penalty += 100; // Instantly kill weak formulations
          }
          
          if (previousQuestions.toLowerCase().includes(qLower.slice(0, 15))) {
            repetition_penalty += 50;
          }

          const rawScore = (candidate.informationGainScore * candidate.relevanceScore * candidate.answerProbabilityScore);
          const finalScore = rawScore - repetition_penalty - vagueness_penalty;
          
          if (finalScore > highestScore) {
            highestScore = finalScore;
            bestQuestion = candidate.question;
          }
        }
      }
    } catch (err) {
      console.error("[QuestionEngine] Gemini generation failed, using fallback:", err);
    }

    return {
      question: bestQuestion,
      intent: StateEngine.mapIntentToStage(targetStage) as any, // backwards compat
      stage: targetStage,
      isFollowUp: false,
      isComplete: false,
      fallbackQuestion: this.getFallbackQuestion(targetStage),
    };
  },

  /**
   * Fallback questions optimized for high-value data.
   */
  getFallbackQuestion(stage: InterviewStage): string {
    const fallbacks: Record<InterviewStage, string> = {
      result: "What specific result or metric improved the most?",
      metrics: "Roughly how much did that improve? Can you give me a percentage or number?",
      problem: "What was it like before vs what is it now?",
      timeframe: "How long did it take to see those results?",
      testimonial: "If a colleague asked you about your results, what would you tell them?",
      business_context: "Why did you choose us over the alternatives?", 
    };
    return fallbacks[stage] || "What improved the most?";
  },
};
