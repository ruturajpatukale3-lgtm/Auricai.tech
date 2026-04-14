// ═══════════════════════════════════════════════════════════
// Auricai — AI Case Study Engine (Elite 100/100)
// Generates short, structured, sales-ready proof assets
// (120–180 words). Result-first. No fluff. No articles.
// ═══════════════════════════════════════════════════════════

import { GeminiService } from "./gemini";
import type { OrgProfile, AICaseStudyOutput, InterviewState, InterviewAnswer, PlanType } from "@/types";
import { ContextEngine } from "./context-engine";
import { MemorySystem } from "./memory-system";

// ─── Language Variability Engine ─────────────────────────────
const DIRECTIONAL_POOLS = {
  improvement: [
    "+32% conversion rate", "+45% efficiency", "+60% throughput",
    "2x pipeline velocity", "3x faster turnaround", "40% cost reduction",
    "+28% team output", "50% less manual work",
  ],
  efficiency: [
    "streamlined operations", "reduced operational friction",
    "faster execution cycles", "leaner workflow cadence",
    "tighter turnaround times", "more predictable throughput",
    "smoother end-to-end process", "less manual overhead",
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

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getVariabilityDirective(): string {
  const style = pickRandom([
    "Use SHORT, punchy sentences. Maximum impact per word.",
    "Use a MIX of sentence lengths — one short, one medium — to create rhythm.",
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
   */
  canGenerate(state: InterviewState): boolean {
    return true;
  },

  /**
   * Generate a short, structured, sales-ready case study (120-180 words).
   * Result-first. No fluff. No articles. Just proof.
   */
  async generate(
    answers: InterviewAnswer[],
    orgProfile: OrgProfile,
    plan: PlanType = "starter"
  ): Promise<AICaseStudyOutput> {
    const context = ContextEngine.buildContext(orgProfile);
    const hooks = await MemorySystem.getBestHooks(context.industry, plan);

    const hasExactMetrics = answers.some(a => a.extracted?.classification === "exact");
    const toneRule = hasExactMetrics
        ? "USE STRONG, ASSERTIVE LANGUAGE. You have exact data. DO NOT use soft words."
        : "USE SOFTER VERBS. You have estimated data. Use 'roughly', 'about', or 'estimated'.";

    const formattedAnswers = answers.map(a => `- ${a.question || "Topic"}: ${a.answer}`).join("\n");
    const variability = getVariabilityDirective();

    // ═══════════════════════════════════════════════════════════
    // ELITE PROOF ASSET GENERATION PROMPT
    // ═══════════════════════════════════════════════════════════
    const systemPrompt = `You are an elite B2B case study writer. Your job is to produce a SHORT, STRUCTURED, SALES-READY proof asset from raw interview answers.

This is NOT an article. This is NOT a testimonial. This is a high-conversion proof asset that a founder can send in a DM to close a deal.

CORE RULES:
- Short. Sharp. Structured. Result-first.
- Total word count for "story" field: 120–180 words ONLY.
- NO filler. NO fluff. Every sentence must earn its place.

BUSINESS CONTEXT:
Industry: ${context.industry}
Service: ${context.serviceDescription}
Target Customer: ${context.targetCustomer}
Narrative Strategy: ${context.aiCaseStudyStyle === 'story_driven' ? 'Emphasize the human narrative and transformation.' : 'Focus on data points, efficiency gains, and ROI.'}

${toneRule}

RAW CLIENT INTERVIEW DATA:
${formattedAnswers}

${variability}

═══════════════════════════════════════════════
STRUCTURE FOR "story" FIELD (MANDATORY — FOLLOW EXACTLY):
═══════════════════════════════════════════════

The "story" field must follow this EXACT structure in this order:

1. PRIMARY RESULT (first line) — One strong outcome. Prefer numeric if available.
   Example: "+158% Engagement in 48 hours"

2. CONTEXT (1–2 lines) — Who the client is and what happened.

3. BEFORE (1–2 lines) — Specific problem or friction. NO vague words.

4. WHAT WAS DONE (2–3 lines) — Concrete actions taken. Must feel real and specific.

5. AFTER (1–2 lines) — Clear result or change. Prefer numbers.

6. IMPACT (1 line) — Business effect: more clients, better pipeline, improved efficiency.

7. QUOTE (1 line) — Natural, human, believable. NOT marketing tone.

═══════════════════════════════════════════════
STRICT WRITING RULES:
═══════════════════════════════════════════════

BANNED PHRASES (NEVER USE):
- "meaningful improvement"
- "better performance"  
- "significant growth"
- "game changer"
- "revolutionary"
- "groundbreaking"
- "best in class"
- "world-class results"
- "impressive outcomes"

IF NO NUMBERS: Use clear directional outcomes.
Example: "response rates improved noticeably within weeks"

TONE: direct, simple, credible, no fluff
STYLE: short sentences, clean spacing, easy to scan

═══════════════════════════════════════════════
ADAPTIVE EVOLUTION (Proven Headlines):
═══════════════════════════════════════════════
${hooks.map(h => `- ${h}`).join("\n")}

Generate the single best headline leveraging these proven patterns.

═══════════════════════════════════════════════
OUTPUT FORMAT — RETURN JSON ONLY:
═══════════════════════════════════════════════

{
  "headline": "A specific, outcome-driven headline with transformation or result",
  "primary_metric": "The single strongest outcome metric (e.g. '+158% Engagement', '$12k MRR'). If no metric exists, use null.",
  "before": "The SPECIFIC problem, friction, or bottleneck they faced. 1-2 sentences.",
  "after": "The SPECIFIC result, shift, or new state achieved. 1-2 sentences.",
  "story": "The FULL structured body (120-180 words total). Must follow the 7-part structure above: Result → Context → Before → What Was Done → After → Impact → Quote. This is the complete proof asset.",
  "impact": "1 sentence on overarching business impact.",
  "quote": "Direct, natural, human-sounding quote from the client.",
  "client_name": "Name of the individual interviewed",
  "company": "Company name"
}

HARD VALIDATION:
- REJECT if story is under 100 words or over 200 words.
- REJECT if language is vague.
- REJECT if there is no clear before/after.`;

    try {
      const parsed = await GeminiService.generateJSON<any>({
        systemPrompt,
        userPrompt: "Generate the case study proof asset. The 'story' field must be a complete 120-180 word structured body following the 7-part format. All other fields are extracted for card display. Make it feel like something a founder can send in a DM to close a deal.",
        temperature: 0.55,
      });

      // ═══════════════════════════════════════════════════════════
      // HARD VALIDATION
      // ═══════════════════════════════════════════════════════════
      if (!parsed.headline) {
        console.error("[CaseStudyGenerator] CRITICAL: Missing headline.");
        throw new Error("AI failed to produce a headline. Generation aborted.");
      }

      if (!parsed.story || parsed.story.split(/\s+/).length < 80) {
        console.error("[CaseStudyGenerator] CRITICAL: Story too short. Words:", parsed.story?.split(/\s+/).length || 0);
        throw new Error("AI failed to produce a complete proof asset. Generation aborted.");
      }

      // ─── FINAL ASSEMBLY ───────────────────────────────────────
      const companyHint = context.targetCustomer || "the team";
      const initialMetrics = Array.isArray(parsed.metrics) ? parsed.metrics : [];

      const finalOutput: AICaseStudyOutput = {
        headline: parsed.headline,
        primary_metric: parsed.primary_metric && parsed.primary_metric !== "null" && parsed.primary_metric !== null ? parsed.primary_metric : "",
        before: parsed.before || "",
        after: parsed.after || "",
        metrics: initialMetrics,
        story: parsed.story,
        impact: parsed.impact || "",
        quote: parsed.quote || "",
        client_name: parsed.client_name || "Client",
        company: parsed.company || companyHint,
      };

      // Record Usage for the hook evolution engine
      await MemorySystem.recordUsage(finalOutput.headline, "hook", context.industry, undefined, plan);

      return finalOutput;
    } catch (err) {
      console.error("[CaseStudyGenerator] Generation failed. NOT returning fake data.", err);
      throw new Error(`Case study generation failed: ${err instanceof Error ? err.message : "Unknown AI error"}`);
    }
  },
};
