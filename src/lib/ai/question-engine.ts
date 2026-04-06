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
    if (state.stage === "recommendation" && state.answers.find(a => a.stage === "recommendation")) {
       // FINAL QUALITY SCAN: If we are 'done' but missing critical bits, force one last targeted question.
       const hasTimeframe = state.answers.some(a => a.stage === "timeframe");
       const hasImpact = state.answers.some(a => a.stage === "impact");
       const hasLockedMetric = state.metrics.some(m => m.isLocked);

       if (state.qualityScore < 70 && state.answers.length < 8) {
          if (!hasLockedMetric) {
             return { question: "One last thing—to make this story really powerful, could you provide any specific revenue or pipeline numbers?", intent: "metrics", stage: "metric", isFollowUp: true, isComplete: false };
          }
          if (!hasTimeframe) {
             return { question: "Quickly, how long did it take for you to start seeing these results?", intent: "timeframe", stage: "timeframe", isFollowUp: true, isComplete: false };
          }
          if (!hasImpact) {
             return { question: "And finally, what was the biggest impact this had on your day-to-day business operations?", intent: "result", stage: "impact", isFollowUp: true, isComplete: false };
          }
       }

       return {
        question: "",
        intent: "testimonial",
        stage: "recommendation",
        isFollowUp: false,
        isComplete: true,
      };
    }

    const { stage: targetStage } = state;

    const previousQuestions = state.answers.map(a => a.answer).join("\n");
    const bestQuestionsFromMemory = await MemorySystem.getBestQuestions(context.industry, targetStage, context.plan);

    const systemPrompt = `You are a high-value DATA EXTRACTOR for a B2B case study system. You act as a conversion-focused strategist.

${ContextEngine.serializeContext(context, policy)}
${StateEngine.serializeState(state)}

METRIC LOCKING & PRIORITY SELECTION (MANDATORY):
1. Review the [LOCKED METRICS] in the state. 
2. If a metric type is LOCKED, DO NOT ask for it again.
3. PRIORITY: revenue > pipeline > conversion_rate > leads.
4. If a higher-priority metric is NOT locked, your question MUST target it specifically.
5. Once a core metric is locked, target:
   - DOWNSTREAM IMPACT (Business-wide effect)
   - TIME-SAVING & EFFICIENCY
   - STRATEGIC VALUE

STAGE-SPECIFIC RULES:
1. Target the '${targetStage}' stage.
2. Reject storytelling. Ask questions that extract PROOF.
3. DO NOT repeat topics covered in [PREVIOUS ANSWERS] or [LOCKED METRICS].

HIGH-VALUE PATTERNS:
- "What was the specific impact on your revenue or pipeline?"
- "What was it before vs what is it now?"
- "How long did it take to see those results?"
- "What was it before vs what is it now?"
- "How long did it take to see results?"

LOW-VALUE FORBIDDEN QUESTIONS:
- "Tell me about your experience"
- "How was it?"
- "Can you elaborate?"
- "Please provide more details"

MEMORY PATTERNS (Top Performing Questions):
${bestQuestionsFromMemory.join("\n")}

Respond with ONLY valid JSON containing an array of 3 candidates exactly matching this schema:
{
  "candidates": [
    {
      "question": "string (the short, specific question)",
      "informationGainScore": number (1-10, how much new *hard evidence* this extracts),
      "relevanceScore": number (1-10, relevance),
      "answerProbabilityScore": number (1-10, ease of answering for a human)
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
      improvement: "What specific result or metric improved the most?",
      metric: "Roughly how much did that improve? Can you give me a percentage or number?",
      before_after: "What was it like before vs what is it now?",
      timeframe: "How long did it take to see those results?",
      impact: "What changed in your business after achieving that?",
      experience: "Why did you choose us over the alternatives?", 
      recommendation: "If a colleague asked you about your results, what would you tell them?",
    };
    return fallbacks[stage] || "What improved the most?";
  },
};
