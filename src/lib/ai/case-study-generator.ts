// ═══════════════════════════════════════════════════════════
// Auricai — AI Case Study Engine (Layer 8 & 9)
// Generates case studies enforcing strong writing rules and outcome evolution.
// ═══════════════════════════════════════════════════════════

import { GeminiService } from "./gemini";
import type { OrgProfile, AICaseStudyOutput, InterviewState, InterviewAnswer, PlanType } from "@/types";
import { ContextEngine } from "./context-engine";
import { MemorySystem } from "./memory-system";

export const CaseStudyGenerator = {
  /**
   * Layer 8 Validation.
   * Generate only when key preconditions exist.
   */
  canGenerate(state: InterviewState): boolean {
    const hasMetricOrEstimate = state.answers.some(a => ["exact", "estimated"].includes(a.classification));
    const hasBeforeAfter = state.answers.some(a => ["before_after", "problem"].includes(a.stage));
    const hasTimeframe = state.answers.some(a => a.stage === "timeframe");

    // We can be a bit flexible on timeframe, but we strongly prefer metrics and directional change
    return hasMetricOrEstimate && (hasBeforeAfter || hasTimeframe);
  },

  /**
   * Layer 8 & 9 - Generate a structured, human, Outcome-First case study.
   */
  async generate(
    answers: InterviewAnswer[],
    orgProfile: OrgProfile,
    plan: PlanType = "starter"
  ): Promise<AICaseStudyOutput> {
    const context = ContextEngine.buildContext(orgProfile);
    const hooks = await MemorySystem.getBestHooks(context.industry, plan);
    
    // Confidence-based metrics logic
    const hasExactMetrics = answers.some(a => a.extracted?.classification === "exact");
    const toneRule = hasExactMetrics 
        ? "USE STRONG, ASSERTIVE LANGUAGE. You have exact data. DO NOT use soft words."
        : "USE SOFTER VERBS. You have estimated data. Use 'roughly', 'about', or 'estimated'.";

    const formattedAnswers = answers.map(a => `- ${a.question || "Topic"}: ${a.answer}`).join("\n");

    const systemPrompt = `You are an elite, conversion-focused B2B copywriter writing a premium case study.
Your job is to turn raw client review answers into a high-trust, believable, and sharp narrative.

BUSINESS CONTEXT:
Industry: ${context.industry}
Service: ${context.serviceDescription}
Target Customer: ${context.targetCustomer}

RAW CLIENT DATA:
${formattedAnswers}

LAYER 8 WRITING RULES:
1. Human. Sharp. Believable. Outcome-first. No fluff.
2. CONFIDENCE RULE: ${toneRule}
3. If an answer says "Not provided", omit it from the narrative elegantly.
4. DO NOT invent metrics. Only use what is provided in the RAW CLIENT DATA.

LAYER 9 ADAPTIVE EVOLUTION (Hooks): 
These are the MOST SUCCESSFUL headline formats in our history, ranked by real-world engagement:
${hooks.map(h => `- ${h}`).join("\n")}

You must generate the single best headline possible leveraging the psychological positioning of these proven variations. 

OUTPUT FORMAT:
Return JSON ONLY with this exact schema:
{
  "headline": "The single winning Strong Hook",
  "summary": "2-3 sentences max. The core transformation.",
  "before": "The exact problem they faced before.",
  "after": "The exact solution/result achieved.",
  "metrics": "Key numbers extracted.",
  "timeframe": "Time taken or 'Not provided'",
  "testimonial": "Direct quote or close paraphrase. Must sound human."
}`;

    try {
      const parsed = await GeminiService.generateJSON<any>({
        systemPrompt,
        userPrompt: "Generate the case study, directly producing the winning headline variation based on the proven history.",
        temperature: 0.4,
      });

      // LAYER 10: Trusted Inference Pass (High-Confidence Only)
      if (!parsed.metrics || parsed.metrics === "Not provided" || parsed.metrics.length < 5) {
         console.log("[CaseStudyGenerator] Initial metrics weak. Triggering Trusted Inference...");
         const inferencePrompt = `The previous case study generation missed a specific metric.
         RAW DATA: ${formattedAnswers}
         
         Analyze the data above. If no exact number exists, INFER a directional outcome and provide a confidence score (0-100).
         
         RULES:
         1. Use SOFT LANGUAGE: "Approximately", "Estimated", "Directional", "Roughly".
         2. Confidence >= 80 means you are reasonably sure based on the context.
         3. Confidence < 80 means the claim is pure speculation.
         
         OUTPUT: JSON { "inferredMetric": "string", "confidenceScore": number }`;
         
         const inferenceResult = await GeminiService.generateJSON<{ inferredMetric: string, confidenceScore: number }>({
            systemPrompt: "You are an expert data analyst. Infer a result only if evidence is strong.",
            userPrompt: inferencePrompt,
            temperature: 0.1
         });
         
         if (inferenceResult?.confidenceScore >= 80) {
            parsed.metrics = inferenceResult.inferredMetric;
         } else {
            console.log("[CaseStudyGenerator] Inference confidence too low:", inferenceResult?.confidenceScore);
         }
      }

      // FINAL VALIDATION: Headline Refinement (Non-Destructive)
      if (parsed.headline?.toLowerCase().includes("achieved") || parsed.headline?.toLowerCase().includes("results")) {
         if (parsed.metrics && parsed.metrics !== "Not provided") {
            // REFINEMENT: Weave the metric into the original hook instead of replacing it.
            const refinementPrompt = `Refine this headline to be more specific and include the outcome below.
            ORIGINAL: "${parsed.headline}"
            OUTCOME: "${parsed.metrics}"
            
            RULES:
            1. Preserve the original hook's structure (clarity/specificity).
            2. Weave the outcome in naturally.
            3. Do NOT replace the entire headline.
            
            Respond with ONLY the refined headline string.`;
            
            const refinedHeadline = await GeminiService.generateText({
               systemPrompt: "You are an elite B2B editor. Refineheadlines for outcome strength.",
               userPrompt: refinementPrompt,
               temperature: 0.2
            });
            
            if (refinedHeadline) parsed.headline = refinedHeadline;
         }
      }

      const finalOutput = {
        headline: parsed.headline || "Case Study",
        summary: parsed.summary || "",
        before: parsed.before || "Not provided",
        after: parsed.after || "Not provided",
        metrics: parsed.metrics || "Not provided",
        timeframe: parsed.timeframe || "Not provided",
        testimonial: parsed.testimonial || "Not provided",
      };

      // Record Usage immediately for the denominator
      await MemorySystem.recordUsage(finalOutput.headline, "hook", context.industry, undefined, plan);

      return finalOutput;
    } catch (err) {
      console.error("[CaseStudyGenerator] Gemini call failed, using raw data:", err);
      return {
        headline: "Client achieved measurable results",
        summary: "Results were achieved through the engagement.",
        before: "Not provided",
        after: "Not provided",
        metrics: "Not provided",
        timeframe: "Not provided",
        testimonial: "Not provided",
      };
    }
  },
};
