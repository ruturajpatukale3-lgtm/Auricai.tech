// ═══════════════════════════════════════════════════════════
// Auricai — Memory System (Layer 7)
// Stores and retrieves anonymized patterns for dynamic improvement.
// Uses mathematical Top-3 logic + 1 injected random pattern.
// ═══════════════════════════════════════════════════════════

import { InterviewStage, PlanType } from "@/types";
import { SystemMemoryRepository } from "@/lib/repositories/system-memory.repository";

export const MemorySystem = {
  /**
   * Generates a structural fallback randomizer specific to the stage to prevent overfitting.
   */
  getFallbackRandomQuestion(stage: InterviewStage): string {
    const wildcards: Record<string, string[]> = {
      improvement: [
        "What was the single biggest metric that changed for your team?",
        "If you had to point to one undeniable result we delivered, what would it be?",
      ],
      metric: [
        "Roughly how much did that jump? Were we talking 20% or 200%?",
        "Do you have an estimate on the exact numbers behind that?",
      ],
      before_after: [
        "Paint a picture for me: what was the absolute worst part of this before we started?",
        "How is your daily workflow different now compared to day one?",
      ],
      timeframe: [
        "How fast did you actually see those results materialize?",
        "Did it take a week, a month, or a year to see that outcome?",
      ],
      impact: [
        "How did hitting those numbers actually affect your business culturally?",
        "What does achieving this let you do next?",
      ],
      experience: [
        "Why did you trust us vs the alternatives?",
        "What surprised you most about the whole process?",
      ],
      recommendation: [
        "If another founder was on the fence, what explicitly would you tell them?",
        "Who is this service a perfect fit for?",
      ]
    };
    
    // Pick randomly from the target stage
    const possibilities = wildcards[stage] || wildcards["improvement"];
    return possibilities[Math.floor(Math.random() * possibilities.length)];
  },

  /**
   * Generates a random baseline hook variation for the case study anti-overfit injection.
   */
  getFallbackRandomHook(): string {
    const fallbacks = [
      "How [Client] achieved [Result] without [Pain Point]",
      "The exact strategy [Client] used to [Result]",
      "Why [Client] switched to [Solution] for [Result]"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  },

  /**
   * Layer 7 - Retrieve top performing questions historically strictly by industry & stage.
   * Injects 1 random fallback pattern to prevent AI mode-collapse/overfitting.
   */
  async getBestQuestions(industry: string, stage: InterviewStage, plan: PlanType): Promise<string[]> {
    const limit = 3;
    const questions = await SystemMemoryRepository.getTopQuestions(industry, stage as string, plan, limit);
    
    const randomInjection = this.getFallbackRandomQuestion(stage);
    
    // Always inject the wild-card at the end
    return [...questions, randomInjection];
  },

  /**
   * Retrieves high-performing hook patterns based on algorithm.
   */
  async getBestHooks(industry: string, plan: PlanType): Promise<string[]> {
    const limit = 3;
    const hooks = await SystemMemoryRepository.getTopHooks(industry, plan, limit);
    
    const randomInjection = this.getFallbackRandomHook();

    return [...hooks, randomInjection];
  },

  /**
   * Ingest new sequences into system memory usage count when generated.
   */
  async recordUsage(
    content: string, 
    type: "question" | "hook", 
    industry?: string, 
    stage?: InterviewStage,
    plan?: PlanType
  ) {
    await SystemMemoryRepository.recordUsage(content, type, industry, stage as string, plan);
  }
};
