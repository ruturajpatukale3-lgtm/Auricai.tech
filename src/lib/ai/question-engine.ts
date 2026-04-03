// ═══════════════════════════════════════════════════════════
// Auricai — AI Question Engine
// Generates dynamic, context-aware interview questions.
// Max 6 questions. Zero repetition. Vague-answer follow-ups.
// ═══════════════════════════════════════════════════════════

import { GeminiService } from "./gemini";
import type {
  OrgProfile,
  StructuredAnswers,
  AIQuestionResponse,
  InterviewIntent,
} from "@/types";

const MAX_QUESTIONS = 6;

// ─── Vague Answer Detection ─────────────────────────────────

const VAGUE_PHRASES = [
  "a lot",
  "improved",
  "better",
  "significant",
  "greatly",
  "much better",
  "way more",
  "huge improvement",
  "really good",
  "pretty good",
  "went up",
  "went down",
  "increased",
  "decreased",
  "some",
  "many",
  "several",
];

function isVagueAnswer(answer: string): boolean {
  const lower = answer.toLowerCase().trim();
  // Short answers are likely vague
  if (lower.split(/\s+/).length < 4) return true;
  // Check for vague phrases without specific numbers
  const hasNumbers = /\d/.test(answer);
  if (!hasNumbers && VAGUE_PHRASES.some((p) => lower.includes(p))) return true;
  return false;
}

// ─── Intent Resolution ──────────────────────────────────────

function getMissingIntents(answers: StructuredAnswers): InterviewIntent[] {
  const allIntents: InterviewIntent[] = [
    "business_context",
    "problem",
    "result",
    "metrics",
    "timeframe",
    "testimonial",
  ];
  return allIntents.filter((intent) => !answers[intent]);
}

function isComplete(answers: StructuredAnswers): boolean {
  const missing = getMissingIntents(answers);
  return missing.length === 0;
}

// ─── Context Builder ────────────────────────────────────────

function buildContextBlock(profile: OrgProfile): string {
  const parts = [
    `Industry: ${profile.industry_raw || profile.industry}`,
    `Service Category: ${profile.service_category}`,
    `Service: ${profile.service_type}`,
    `Target Customer: ${profile.target_customer}`,
  ];
  return parts.join("\n");
}

// ─── Core Engine ────────────────────────────────────────────

export const QuestionEngine = {
  /**
   * Generate the next interview question based on current answers and org context.
   * Returns isComplete=true when all intents are covered OR max questions reached.
   */
  async generateNextQuestion(
    answers: StructuredAnswers,
    orgProfile: OrgProfile,
    questionCount: number,
    lastAnswer?: string,
    lastIntent?: InterviewIntent
  ): Promise<AIQuestionResponse> {
    // Hard cap
    if (questionCount >= MAX_QUESTIONS || isComplete(answers)) {
      return {
        question: "",
        intent: "testimonial",
        isFollowUp: false,
        isComplete: true,
      };
    }

    // Check if last answer was vague — generate follow-up
    const needsFollowUp =
      lastAnswer && lastIntent && isVagueAnswer(lastAnswer);

    const missing = getMissingIntents(answers);
    const nextIntent = needsFollowUp ? lastIntent : missing[0] || "testimonial";

    const answeredSummary = Object.entries(answers)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: "${v}"`)
      .join("\n");

    const isAlmostDone = questionCount >= 4 && questionCount < MAX_QUESTIONS;

    const systemPrompt = `You are a friendly AI interviewer collecting case study data for a B2B company.

BUSINESS CONTEXT:
${buildContextBlock(orgProfile)}

ALREADY COLLECTED:
${answeredSummary || "(Nothing yet — this is the first question)"}

MISSING DATA CATEGORIES: ${missing.join(", ") || "none"}

RULES:
1. Ask exactly ONE question.
2. Keep it short, warm, and conversational (max 2 sentences).
3. Do NOT repeat any question already answered.
4. Do NOT use jargon or buzzwords.
5. Sound human — like a friendly colleague, not a survey bot.
${needsFollowUp ? `6. The user's last answer was vague: "${lastAnswer}". Ask a FOLLOW-UP to get specific numbers, percentages, or concrete details. Be encouraging, not pushy.` : `6. Target the "${nextIntent}" category specifically.`}
${isAlmostDone && !needsFollowUp ? `7. This is one of the final questions. Start your message with an encouraging transition (e.g., "We're almost done!", "Just a couple more questions!", or "Last thing...").` : ""}

INTENT DEFINITIONS:
- business_context: What the client's company does, what they were looking for
- problem: The specific challenge or pain point before working together
- result: The outcome or transformation achieved
- metrics: Specific numbers, percentages, dollar amounts, KPIs
- timeframe: How long it took to see results
- testimonial: A personal quote or recommendation they'd share

Return JSON ONLY with this exact schema:
{
  "question": "your question here",
  "intent": "${nextIntent}",
  "isFollowUp": ${needsFollowUp ? "true" : "false"}
}`;

    const userPrompt = needsFollowUp
      ? `The interviewee just answered: "${lastAnswer}". Ask a follow-up to get specifics.`
      : `Generate the next question targeting: ${nextIntent}`;

    try {
      const parsed = await GeminiService.generateJSON<any>({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
      });

      return {
        question: parsed.question || this.getFallbackQuestion(nextIntent),
        intent: nextIntent,
        isFollowUp: needsFollowUp || false,
        isComplete: false,
      };
    } catch (err) {
      console.error("[QuestionEngine] Gemini call failed, using fallback:", err);
      return {
        question: this.getFallbackQuestion(nextIntent),
        intent: nextIntent,
        isFollowUp: false,
        isComplete: false,
      };
    }
  },

  /**
   * Fallback questions in case Gemini is unavailable
   */
  getFallbackQuestion(intent: InterviewIntent): string {
    const fallbacks: Record<InterviewIntent, string> = {
      business_context:
        "Can you tell me a bit about your company and what you were looking for?",
      problem:
        "What was the main challenge you were facing before working with us?",
      result:
        "What changed after we started working together? What results did you see?",
      metrics:
        "Can you share any specific numbers — like percentage improvements, revenue gains, or time saved?",
      timeframe:
        "How quickly did you start seeing results?",
      testimonial:
        "If a colleague asked you about your experience, what would you tell them?",
    };
    return fallbacks[intent];
  },
};
