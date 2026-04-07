// ═══════════════════════════════════════════════════════════
// Auricai — State Engine (Layer 2 & 6)
// Enforces DETERMINISTIC FLOW per direct signals:
// problem -> result -> metrics -> timeframe -> testimonial
// ═══════════════════════════════════════════════════════════

export interface InterviewSignals {
  problem: boolean;
  result: boolean;
  metrics: boolean;
  timeframe: boolean;
  testimonial: boolean;
}

import { InterviewStage, InterviewState, ALL_STAGES, AnswerClassification, InterviewAnswer, InterviewMetric } from "@/types";
import { MetricExtractor } from "./metric-extractor";

const METRIC_PRIORITY = ["revenue", "pipeline", "conversion_rate", "leads", "efficiency"];
const QUALITY_THRESHOLD = 70;

export const StateEngine = {
  /**
   * Layer 6 - Interview Flow definition (Locked)
   * Deterministic sequence for proof extraction.
   */
  getExpectedFlow(): InterviewStage[] {
    return [
      "problem",
      "result",
      "metrics",
      "timeframe",
      "testimonial"
    ];
  },

  /**
   * Step 5: State Resolution (Deterministic)
   * Hard-coded logic for the next target state.
   */
  getNextStateId(signals: InterviewSignals): InterviewStage | "complete" {
    if (!signals.problem) return "problem";
    if (!signals.result) return "result";
    if (!signals.metrics) return "metrics";
    if (!signals.timeframe) return "timeframe";
    if (!signals.testimonial) return "testimonial";
    return "complete";
  },

  /**
   * Signal Extraction (Step 4)
   * Scans history and metadata for boolean coverage.
   */
  extractSignals(answers: InterviewAnswer[]): InterviewSignals {
    const signals: InterviewSignals = {
      problem: false,
      result: false,
      metrics: false,
      timeframe: false,
      testimonial: false,
    };

    answers.forEach(a => {
      const meta = a.extracted as any || {};
      const intent = (meta.intent || "").toLowerCase();
      const classification = meta.classification || "vague";
      const hasMetrics = meta.metrics && Array.isArray(meta.metrics) && meta.metrics.length > 0;
      const isSubstantive = classification !== "vague" || (a.answer.split(/\s+/).length >= 10);

      if (intent === "problem" || intent === "pain" || intent === "before_after") {
        if (isSubstantive) signals.problem = true;
      }
      if (intent === "result" || intent === "outcome" || intent === "improvement") {
        if (isSubstantive) signals.result = true;
      }
      if (intent === "metrics" || hasMetrics) {
        // Step 10: Metric strictness
        // Any locked or substantive metric answer counts towards signal
        if (hasMetrics || classification === "exact" || classification === "estimated") signals.metrics = true;
      }
      if (intent === "timeframe" || intent === "duration") {
        if (isSubstantive) signals.timeframe = true;
      }
      if (intent === "testimonial" || intent === "impact" || intent === "recommendation") {
        if (isSubstantive) signals.testimonial = true;
      }
    });

    return signals;
  },

  /**
   * Determine the current state based on all raw answers gathered so far.
   */
  calculateState(rawAnswers: InterviewAnswer[]): InterviewState {
    const signals = this.extractSignals(rawAnswers);
    const nextStageId = this.getNextStateId(signals);
    
    const answers = rawAnswers.map(a => {
      const meta = a.extracted as any || {};
      return {
        stage: this.mapIntentToStage(meta.intent || "result"),
        answer: a.answer,
        classification: (meta.classification || "qualitative") as AnswerClassification
      };
    });

    // Extract metrics list for UI/Generator
    const metrics: InterviewMetric[] = [];
    rawAnswers.forEach(a => {
      const meta = a.extracted as any || {};
      if (meta.metrics && Array.isArray(meta.metrics)) {
        meta.metrics.forEach((m: InterviewMetric) => {
          const normType = MetricExtractor.normalizeType(m.type);
          const hasValue = !!m.value || !!m.before || !!m.after;
          const isLocked = hasValue || m.status === "complete";
          
          if (!metrics.find(em => em.type === normType)) {
             metrics.push({ ...m, type: normType, isLocked });
          }
        });
      }
    });

    // Step 11 & 12: Low Intent & Early Exit logic (moved to controller for side-effects)
    // Here we just calculate the scores.

    const qualityScore = this.computeQualityScore(signals, rawAnswers.length);
    const confidenceScore = this.computeConfidence(answers);

    return {
      stage: (nextStageId === "complete" ? "testimonial" : nextStageId) as InterviewStage,
      answers,
      metrics,
      extractedMetrics: metrics.map(m => `${m.value} ${m.type}`),
      confidenceScore,
      qualityScore
    };
  },

  computeQualityScore(signals: InterviewSignals, count: number): number {
    let score = 0;
    if (signals.problem) score += 20;
    if (signals.result) score += 20;
    if (signals.metrics) score += 30;
    if (signals.timeframe) score += 15;
    if (signals.testimonial) score += 15;
    
    // Penalize high question count if signals are missing
    if (count >= 5 && score < 50) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  },

  /**
   * Maps older 'Intent' strings to the new 'Stage' flow
   */
  mapIntentToStage(intent: string): InterviewStage {
    const raw = (intent || "").toLowerCase();
    
    // Hard Validation Layer (Strict Enum check)
    const valid: Record<string, InterviewStage> = {
      "business_context": "business_context",
      "problem": "problem",
      "result": "result",
      "metrics": "metrics",
      "timeframe": "timeframe",
      "testimonial": "testimonial"
    };

    if (valid[raw]) return valid[raw];

    // Mapping Engine (Synonyms)
    const synonyms: Record<string, InterviewStage> = {
      "experience": "business_context",
      "background": "business_context",
      "pain": "problem",
      "challenge": "problem",
      "before_after": "problem",
      "improvement": "result",
      "outcome": "result",
      "metric": "metrics",
      "conversion": "metrics",
      "numbers": "metrics",
      "duration": "timeframe",
      "impact": "testimonial",
      "recommendation": "testimonial",
      "feedback": "testimonial"
    };

    return synonyms[raw] || "result"; // Failsafe default to 'result'
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

    const lockedMetrics = state.metrics
      .map(m => `[${m.type.toUpperCase()}] status: ${m.status}, value: ${m.value}`)
      .join("\n");

    return `[INTERVIEW STATE]
Current Target Stage: ${state.stage.toUpperCase()}
Total Answered: ${state.answers.length}
Confidence Score: ${state.confidenceScore}/100

[LOCKED METRICS - DO NOT REPEAT]
${lockedMetrics || "None yet"}

[PREVIOUS ANSWERS]
${answeredSummary || "(No answers yet)"}`;
  }
};
