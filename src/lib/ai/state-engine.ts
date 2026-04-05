// ═══════════════════════════════════════════════════════════
// Auricai — State Engine (Layer 2 & 6)
// Enforces PRIORITY ORDER: result -> metric -> before_after -> timeframe -> impact -> experience
// ═══════════════════════════════════════════════════════════

import { InterviewStage, InterviewState, ALL_STAGES, AnswerClassification, InterviewAnswer } from "@/types";

export const StateEngine = {
  /**
   * Layer 6 - Interview Flow definition
   * The ordered sequence we want to follow, rewritten for highest-value data extraction.
   */
  getExpectedFlow(): InterviewStage[] {
    return [
      "improvement",     // AKA "result"
      "metric",
      "before_after",
      "timeframe",
      "impact",
      "experience"       // lowest priority
    ];
  },

  /**
   * Determine the current state based on all raw answers gathered so far.
   */
  calculateState(rawAnswers: InterviewAnswer[]): InterviewState {
    const answers = rawAnswers.map(a => {
      const meta = a.extracted as any || {};
      const intentValue = meta.intent || "improvement";
      const classificationValue = meta.classification || "qualitative";

      const mappedStage = this.mapIntentToStage(intentValue);

      return {
        stage: mappedStage,
        answer: a.answer,
        classification: classificationValue as AnswerClassification
      };
    });

    const flow = this.getExpectedFlow();
    let nextStage: InterviewStage | "recommendation" = "recommendation"; // default if all done

    // Track satisfied intents/stages
    const answeredStages = new Set(answers.map(a => a.stage));
    
    // Dynamic Skipping logic: If strong metric appears early, skip lower priority areas
    const hasExactMetric = answers.some(a => ["exact", "estimated"].includes(a.classification));
    
    if (hasExactMetric) {
      answeredStages.add("experience");
      answeredStages.add("improvement");
    }

    for (const stage of flow) {
      if (!answeredStages.has(stage)) {
        nextStage = stage;
        break;
      }
    }

    // Force loop caps to 4-6 if we already have strong data
    if (rawAnswers.length >= 4 && hasExactMetric && answeredStages.has("before_after") && answeredStages.has("timeframe")) {
      nextStage = "recommendation";
    }

    // Extract metrics strings for passing up
    const extractedMetrics = answers
      .filter(a => a.classification === "exact" || a.classification === "estimated")
      .map(a => a.answer);

    const confidenceScore = this.computeConfidence(answers);

    return {
      stage: nextStage as InterviewStage,
      answers,
      extractedMetrics,
      confidenceScore
    };
  },

  /**
   * Maps older 'Intent' strings to the new 'Stage' flow
   */
  mapIntentToStage(intent: string): InterviewStage {
    const validStages = new Set(ALL_STAGES as string[]);
    if (validStages.has(intent)) {
      return intent as InterviewStage;
    }

    const mapping: Record<string, InterviewStage> = {
      "result": "improvement",
      "metrics": "metric",
      "problem": "before_after",
      "timeframe": "timeframe",
      "impact": "impact",
      "business_context": "experience",
      "testimonial": "recommendation"
    };

    return mapping[intent] || "improvement";
  },

  computeConfidence(answers: { classification: AnswerClassification }[]): number {
    let score = 0;
    answers.forEach(a => {
      if (a.classification === "exact") score += 20;
      if (a.classification === "estimated") score += 15;
      if (a.classification === "qualitative") score += 5;
      if (a.classification === "vague") score += 0;
    });
    return Math.min(score, 100);
  },

  serializeState(state: InterviewState): string {
    const answeredSummary = state.answers.map(a => 
      `[${a.stage.toUpperCase()}] Class: ${a.classification} \nAnswer: "${a.answer}"`
    ).join("\n\n");

    return `[INTERVIEW STATE]
Current Target Stage: ${state.stage.toUpperCase()}
Total Answered: ${state.answers.length}
Confidence Score: ${state.confidenceScore}/100

[EXTRACTED METRICS SO FAR]
${state.extractedMetrics.length > 0 ? state.extractedMetrics.join(" | ") : "None yet"}

[PREVIOUS ANSWERS]
${answeredSummary || "(No answers yet)"}`;
  }
};
