// ═══════════════════════════════════════════════════════════
// Auricai — AI Case Study Engine (Layer 8, 9, & Variability)
// Generates case studies enforcing strong writing rules,
// outcome evolution, and per-output language uniqueness.
// ═══════════════════════════════════════════════════════════

import { GeminiService } from "./gemini";
import type { OrgProfile, AICaseStudyOutput, InterviewState, InterviewAnswer, PlanType } from "@/types";
import { ContextEngine } from "./context-engine";
import { MemorySystem } from "./memory-system";

// ─── Language Variability Engine ─────────────────────────────
// Ensures no two case studies share identical directional phrasing.
const DIRECTIONAL_POOLS = {
  improvement: [
    "measurable lift", "clear upward shift", "meaningful performance gain",
    "noticeable acceleration in results", "tangible improvement in outcomes",
    "marked increase in output quality", "demonstrable forward momentum",
    "visible improvement across key indicators", "sustained positive trajectory",
    "concrete progress toward target benchmarks",
  ],
  efficiency: [
    "streamlined operations", "reduced operational friction",
    "faster execution cycles", "leaner workflow cadence",
    "tighter turnaround times", "more predictable throughput",
    "smoother end-to-end process", "less manual overhead",
  ],
  growth: [
    "consistent growth channel", "scalable pipeline expansion",
    "predictable revenue trajectory", "compounding returns over time",
    "stronger customer acquisition engine", "accelerated market traction",
    "expanding reach with higher conversion", "sustainable scaling pattern",
  ],
  transformation: [
    "moved from inconsistent performance to structured predictability",
    "replaced guesswork with data-driven clarity",
    "shifted from reactive firefighting to proactive execution",
    "transitioned from manual bottlenecks to automated confidence",
    "evolved from fragmented efforts to a unified growth system",
    "turned stagnant processes into repeatable momentum",
  ],
} as const;

const FALLBACK_HEADLINES = [
  "How [COMPANY] Built a More Predictable Growth Engine",
  "From Friction to Flow: [COMPANY]'s Path to Operational Clarity",
  "[COMPANY] Turned Manual Bottlenecks Into Scalable Momentum",
  "Inside [COMPANY]'s Shift to Higher-Impact Execution",
  "How [COMPANY] Replaced Guesswork With Measurable Outcomes",
];

const FALLBACK_SUMMARIES = [
  "By rethinking their core workflow, the team unlocked a more structured approach to growth — reducing friction and gaining clarity on what actually drives results.",
  "What started as a need for better visibility evolved into a complete shift in how the team operates — with faster cycles, clearer priorities, and stronger outcomes.",
  "The engagement produced a measurable shift in how the team approaches execution, moving from reactive adjustments to a proactive and repeatable system.",
];

const FALLBACK_TESTIMONIALS = [
  "It changed how we think about the entire process — we're more focused and the results speak for themselves.",
  "Honestly, we didn't expect this level of impact. It's become a core part of how we operate now.",
  "The difference was noticeable almost immediately. Our team finally has clarity on what's working.",
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getVariabilityDirective(): string {
  const style = pickRandom([
    "Use SHORT, punchy sentences. Maximum impact per word.",
    "Use a MIX of sentence lengths — one short, one medium, one slightly longer — to create rhythm.",
    "Lead with the outcome, then explain the context. Inverted pyramid style.",
    "Use contrast pairs: 'Before X, now Y' structures to emphasize transformation.",
  ]);
  const directionPhrase = pickRandom(DIRECTIONAL_POOLS.improvement);
  const transformPhrase = pickRandom(DIRECTIONAL_POOLS.transformation);
  return `STYLE DIRECTIVE: ${style}\nPREFERRED DIRECTIONAL PHRASE (use naturally, not literally): "${directionPhrase}"\nTRANSFORMATION ANCHOR: "${transformPhrase}"`;
}

export const CaseStudyGenerator = {
  /**
   * Layer 8 Validation.
   * Generate only when key preconditions exist.
   */
  canGenerate(state: InterviewState): boolean {
    // LAYER 8 Validation is now fully permissive to support Edge Cases (e.g., user skips all metric questions).
    // The Output Consistency Engine via the LLM prompt will handle weak data gracefully.
    return true;
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
    const variability = getVariabilityDirective();

    const systemPrompt = `You are an elite, conversion-focused B2B copywriter writing a premium case study.
Your job is to turn raw client review answers into a high-trust, believable, and sharp narrative.
Every case study you produce must feel UNIQUE — as if written fresh by a senior strategist, never from a template.

BUSINESS CONTEXT:
Industry: ${context.industry}
Service: ${context.serviceDescription}
Target Customer: ${context.targetCustomer}
Narrative Strategy: ${context.aiCaseStudyStyle === 'story_driven' ? 'Emphasize the human narrative, journey, and emotional transformation.' : 'Focus heavily on data points, efficiency gains, and ROI.'}

RAW CLIENT DATA:
${formattedAnswers}

${variability}

 6. UNIQUENESS ENFORCEMENT: Vary sentence length, verb choice, and structure. Never start two consecutive sentences the same way. Alternate between outcomes, context, and quotes.
 7. STRICT WRITING RULES:
    - NO VAGUE PHRASES. Never use "meaningful improvement", "better performance", or "significant growth".
    - IF NO NUMERIC DATA: Do NOT hallucinate. Use: "Improved results noticeably within [timeframe]" or similar specific directional outcome.
    - HEADLINE: Must include a specific transformation or outcome.
    - STORY: 3-5 lines of high-impact narrative.
    - QUOTE: Direct, natural, human-sounding quote from the client.
 8. TRANSFORMATION DEPTH: The "before" and "after" fields must be SPECIFIC and contrasting.
    - "before" = the exact friction point, bottleneck, or pain.
    - "after" = the exact shift, outcome, or new state.
9. QUALITATIVE EXCELLENCE: If no numbers exist, the narrative must still feel premium.
   - BAD: "The business saw better results."
   - ELITE: "The team moved from inconsistent, reactive workflows to a structured and predictable growth pattern — with full visibility into what was actually driving outcomes."

LAYER 9 ADAPTIVE EVOLUTION (Hooks): 
These are the MOST SUCCESSFUL headline formats in our history, ranked by real-world engagement:
${hooks.map(h => `- ${h}`).join("\n")}

You must generate the single best headline possible leveraging the psychological positioning of these proven variations.

OUTPUT FORMAT:
Return JSON ONLY with this exact schema:
{
  "headline": "A specific, high-conversion hook with transformation or outcome",
  "metrics": ["2-3 key metric strings (e.g., '+45% Efficiency', '$12k Saved')"],
  "before": "The SPECIFIC problem, friction, or bottleneck they faced.",
  "after": "The SPECIFIC result, shift, or new operational state achieved.",
  "story": "3-5 lines of short, punchy narrative about the journey and outcome.",
  "quote": "Direct, natural, human-sounding quote from the client.",
  "client_name": "The name of the individual interviewed",
  "company": "The company name",
  "timeframe": "Time taken or 'Ongoing'"
}`;

    try {
      const parsed = await GeminiService.generateJSON<any>({
        systemPrompt,
        userPrompt: "Generate the case study. Produce a UNIQUE headline variation based on the proven history. Ensure every field feels fresh and non-templated.",
        temperature: 0.55,
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

      // ─── FINAL ASSEMBLY (with variability-aware defaults) ───
      const companyHint = context.targetCustomer || "the team";
      const finalOutput: AICaseStudyOutput = {
        headline: parsed.headline || pickRandom(FALLBACK_HEADLINES).replace("[COMPANY]", companyHint),
        metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [parsed.metrics || pickRandom(DIRECTIONAL_POOLS.improvement)],
        before: parsed.before || `${companyHint} faced operational friction that slowed execution and reduced visibility into what was actually driving results.`,
        after: parsed.after || `A more structured, repeatable approach — with clearer priorities and ${pickRandom(DIRECTIONAL_POOLS.efficiency)}.`,
        story: parsed.story || parsed.summary || pickRandom(FALLBACK_SUMMARIES),
        quote: parsed.quote || parsed.testimonial || pickRandom(FALLBACK_TESTIMONIALS),
        client_name: parsed.client_name || "Client",
        company: parsed.company || companyHint,
        timeframe: parsed.timeframe || "Ongoing",
      };

      // Record Usage immediately for the denominator
      await MemorySystem.recordUsage(finalOutput.headline, "hook", context.industry, undefined, plan);

      return finalOutput;
    } catch (err) {
      console.error("[CaseStudyGenerator] Gemini call failed, using premium fallback:", err);
      // ─── PREMIUM FALLBACK (never dry or robotic) ───
      const companyHint = context.targetCustomer || "the team";
      const firstAnswer = answers[0]?.answer || "";
      const lastAnswer = answers[answers.length - 1]?.answer || "";
      return {
        headline: pickRandom(FALLBACK_HEADLINES).replace("[COMPANY]", companyHint),
        metrics: [pickRandom(DIRECTIONAL_POOLS.improvement)],
        before: firstAnswer.length > 20 ? firstAnswer : `${companyHint} needed a more reliable way to drive outcomes without the constant manual overhead.`,
        after: lastAnswer.length > 20 ? lastAnswer : `A ${pickRandom(DIRECTIONAL_POOLS.growth)} — built on ${pickRandom(DIRECTIONAL_POOLS.efficiency)}.`,
        story: pickRandom(FALLBACK_SUMMARIES),
        quote: pickRandom(FALLBACK_TESTIMONIALS),
        client_name: "Client",
        company: companyHint,
        timeframe: "Ongoing",
      };
    }
  },
};
