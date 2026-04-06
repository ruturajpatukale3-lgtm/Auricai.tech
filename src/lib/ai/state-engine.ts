// ═══════════════════════════════════════════════════════════
// Auricai — State Engine (Layer 2 & 6)
// Enforces PRIORITY ORDER: result -> metric -> before_after -> timeframe -> impact -> experience
// ═══════════════════════════════════════════════════════════

import { InterviewStage, InterviewState, ALL_STAGES, AnswerClassification, InterviewAnswer, InterviewMetric } from "@/types";
import { MetricExtractor } from "./metric-extractor";

const METRIC_PRIORITY = ["revenue", "pipeline", "conversion_rate", "leads", "efficiency"];
const QUALITY_THRESHOLD = 70;

export const StateEngine = {
  /**
   * Layer 6 - Interview Flow definition
   * The ordered sequence we want to follow, rewritten for highest-value data extraction.
   */
  getExpectedFlow(): InterviewStage[] {
    return [
      "business_context",
      "problem",
      "result",
      "metrics",
      "timeframe",
      "testimonial"
    ];
  },

  /**
   * Determine the current state based on all raw answers gathered so far.
   */
  calculateState(rawAnswers: InterviewAnswer[]): InterviewState {
    const answers = rawAnswers.map(a => {
      const meta = a.extracted as any || {};
      const intentValue = meta.intent || "result";
      const classificationValue = meta.classification || "qualitative";

      const mappedStage = this.mapIntentToStage(intentValue);

      return {
        stage: mappedStage,
        answer: a.answer,
        classification: classificationValue as AnswerClassification
      };
    });

    const flow = this.getExpectedFlow();
    let nextStage: InterviewStage | "recommendation" = "recommendation";

    // 1. Extract structured metrics for locking & priority
    const metrics: InterviewMetric[] = [];
    rawAnswers.forEach(a => {
      const meta = a.extracted as any || {};
      if (meta.metrics && Array.isArray(meta.metrics)) {
        meta.metrics.forEach((m: InterviewMetric) => {
          const normType = MetricExtractor.normalizeType(m.type);
          
          // LOCK CONDITION: before+after present OR complete + high confidence
          const isHardLocked = (!!m.before && !!m.after) || (m.status === "complete" && (m.confidence || 0) > 90);
          
          const existing = metrics.find(em => em.type === normType);
          if (!existing || (existing.status === "estimated" && m.status === "complete") || (!existing.isLocked && isHardLocked)) {
            const updatedMetric = { ...m, type: normType, isLocked: isHardLocked };
            if (existing) {
               metrics[metrics.indexOf(existing)] = updatedMetric;
            } else {
               metrics.push({ ...m, type: normType, isLocked: isHardLocked });
            }
          }
        });
      }
    });

    // 2. PRIORITY OVERRIDE: Check if higher priority metrics are missing/unlocked
    const answeredStages = new Set(answers.map(a => a.stage));
    
    // Find highest priority missing or unlocked metric
    const highestPriorityMetricNeeded = METRIC_PRIORITY.find(type => {
      const found = metrics.find(m => m.type === type);
      return !found || !found.isLocked;
    });

    // If we've started the metric phase but haven't locked a high-priority one yet, stay on 'metric'
    if (answeredStages.has("result") && highestPriorityMetricNeeded && rawAnswers.length < 5) {
      // If we don't have ANY metrics yet, or our best one isn't locked, keep pushing
      const bestMetric = metrics.find(m => METRIC_PRIORITY.indexOf(m.type) <= METRIC_PRIORITY.indexOf(highestPriorityMetricNeeded));
      if (!bestMetric || !bestMetric.isLocked) {
         nextStage = "metrics";
      }
    }

    if (nextStage !== "metrics") {
      for (const stage of flow) {
        if (!answeredStages.has(stage)) {
          nextStage = stage;
          break;
        }
      }
    }

    // 3. QUALITY SCORING (0-100)
    let qualityScore = 0;
    const hasLockedMetric = metrics.some(m => m.isLocked);
    const hasTimeframe = answeredStages.has("timeframe");
    const hasImpact = answeredStages.has("testimonial");
    const hasBeforeAfter = answeredStages.has("problem");

    if (hasLockedMetric) qualityScore += 40;
    else if (metrics.length > 0) qualityScore += 20;

    if (hasBeforeAfter) qualityScore += 20;
    if (hasTimeframe) qualityScore += 15;
    if (hasImpact) qualityScore += 15;
    if (rawAnswers.length >= 5) qualityScore += 10;

    // Force recommendation only if quality is decent OR we hit raw length limit
    if (rawAnswers.length >= 6 || (qualityScore >= QUALITY_THRESHOLD && hasLockedMetric)) {
      nextStage = "recommendation";
    }

    const confidenceScore = this.computeConfidence(answers);

    return {
      stage: nextStage as InterviewStage,
      answers,
      metrics,
      extractedMetrics: metrics.map(m => `${m.value} ${m.type}`),
      confidenceScore,
      qualityScore
    };
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
