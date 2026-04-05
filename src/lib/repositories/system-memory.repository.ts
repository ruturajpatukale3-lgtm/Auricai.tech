import { supabaseAdmin } from "@/lib/supabase-admin";
import { redis, isRedisConfigured } from "@/lib/redis";
import { PlanType } from "@/types";

const TABLE = "system_memory";
const SHARD_COUNT = 10; // Item 2: Shard global counters to reduce hot key contention

export const SystemMemoryRepository = {
  /**
   * Internal helper to aggregate sharded counters globally.
   */
  async getShardedGlobalTotal(type: string, industry: string, plan: string): Promise<number> {
    if (!isRedisConfigured) return 0;
    try {
      const keys = Array.from({ length: SHARD_COUNT }, (_, i) => 
        `stats:global_trials:${type}:${industry}:${plan}:shard:${i}`
      );
      const values = await redis.mget<number[]>(...keys);
      return values.reduce((sum, val) => sum + (Number(val) || 0), 0);
    } catch {
      return 0;
    }
  },

  /**
   * Called whenever a question or hook is actually loaded and used in generating an artifact.
   * Increments the `times_used` denominator for ratio math and the global trials in Redis.
   */
  async recordUsage(
    content: string, 
    type: "question" | "hook", 
    industry?: string, 
    stage?: string,
    plan?: PlanType
  ) {
    if (!content) return;
    const ind = industry || "all";
    const pl = plan || "starter";

    try {
      // 1. Supabase Update (Atomic via RPC)
      await supabaseAdmin.rpc("increment_memory_usage", {
        p_content: content,
        p_type: type,
        p_industry: ind,
        p_stage: stage || null,
        p_plan: pl
      });

      // 2. Global Trial Counter (Redis Sharded - Item 2)
      if (isRedisConfigured) {
        const shardIndex = Math.floor(Math.random() * SHARD_COUNT);
        const key = `stats:global_trials:${type}:${ind}:${pl}:shard:${shardIndex}`;
        await redis.incr(key);
      }
      
      console.log(`[MemoryRepo] Logged sharded usage for ${type}: "${content.substring(0, 30)}..."`);
    } catch (err) {
      console.error("[MemoryRepo] recordUsage failed:", err);
    }
  },

  /**
   * Called whenever the artifacts generated from these patterns yield real-world engagement.
   */
  async recordOutcome(content: string, type: "question" | "hook", scoreIncrement: number = 1) {
    if (!content) return;
    try {
      await supabaseAdmin.rpc("increment_memory_engagement", {
        p_content: content,
        p_type: type,
        p_score: scoreIncrement
      });
      console.log(`[MemoryRepo] Logged REAL OUTCOME (+${scoreIncrement}) for ${type}: "${content.substring(0, 30)}..."`);
    } catch (err) {
      console.error("[MemoryRepo] recordOutcome failed:", err);
    }
  },

  /**
   * Computes the algorithmic ranking applying Cold Start, True UCB, and Decay.
   */
  computeAlgorithmicScore(row: any, globalTotalTrials: number): number {
    const uses = row.times_used || 0;
    
    // Item 4: Cold Start Fix
    if (uses === 0) {
      return 0.2;
    }

    const eng = row.engagement_score || 0;
    const baseValue = eng / uses;
    
    // Item 1: True UCB Formula: sqrt(2 * ln(total_trials) / times_used)
    const explorationBonus = Math.sqrt((2 * Math.log(Math.max(2, globalTotalTrials))) / uses);
    
    // Time decay calculation (Item 4 from previous request)
    const ageDays = (Date.now() - new Date(row.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24);
    const decayMultiplier = Math.exp(-ageDays / 30);
    
    return (baseValue + explorationBonus) * decayMultiplier;
  },

  /**
   * Returns top performing questions ranked by advanced outcome algorithms.
   */
  async getTopQuestions(
    industry: string, 
    stage: string, 
    plan: PlanType,
    limit: number = 3
  ): Promise<string[]> {
    const cacheKey = `cached:top:questions:${industry}:${plan}:${stage}`;
    
    try {
      // 1. FAST PATH: Check Redis Cache (Item 3)
      if (isRedisConfigured) {
        const cached = await redis.get<string[]>(cacheKey);
        if (cached && cached.length > 0) return cached.slice(0, limit);
      }

      // 2. ROLLING WINDOW: Fetch Candidates within last 60 days (Item 1)
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select("content, engagement_score, times_used, created_at")
        .eq("industry", industry)
        .eq("stage", stage)
        .eq("plan", plan)
        .eq("type", "question")
        .gte("created_at", sixtyDaysAgo);

      if (!error && data && data.length > 0) {
        // Compute total_trials from shards
        const globalTrials = await this.getShardedGlobalTotal("question", industry, plan) 
          || data.reduce((sum, row) => sum + (row.times_used || 0), 0);
        
        const ranked = data
          .map(row => ({ content: row.content, score: this.computeAlgorithmicScore(row, globalTrials) }))
          .sort((a, b) => b.score - a.score);
          
        return ranked.slice(0, limit).map(r => r.content);
      }
    } catch (err) {
      console.error("[MemoryRepo] getTopQuestions failed:", err);
    }
    return [];
  },

  /**
   * Returns top hooks prioritizing advanced outcome algorithms.
   */
  async getTopHooks(
    industry: string,
    plan: PlanType,
    limit: number = 3
  ): Promise<string[]> {
    const cacheKey = `cached:top:hooks:${industry}:${plan}:all`;

    try {
      // 1. FAST PATH (Item 3)
      if (isRedisConfigured) {
        const cached = await redis.get<string[]>(cacheKey);
        if (cached && cached.length > 0) return cached.slice(0, limit);
      }

      // 2. ROLLING WINDOW (Item 1)
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select("content, engagement_score, times_used, created_at")
        .eq("industry", industry)
        .eq("plan", plan)
        .eq("type", "hook")
        .gte("created_at", sixtyDaysAgo);

      if (!error && data && data.length > 0) {
        const globalTrials = await this.getShardedGlobalTotal("hook", industry, plan)
          || data.reduce((sum, row) => sum + (row.times_used || 0), 0);
        
        const ranked = data
          .map(row => ({ content: row.content, score: this.computeAlgorithmicScore(row, globalTrials) }))
          .sort((a, b) => b.score - a.score);
          
        return ranked.slice(0, limit).map(r => r.content);
      }
    } catch (err) {
      console.error("[MemoryRepo] getTopHooks failed:", err);
    }
    return [];
  }
};
