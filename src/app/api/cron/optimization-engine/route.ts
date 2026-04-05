import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redis, isRedisConfigured } from "@/lib/redis";
import { SystemMemoryRepository } from "@/lib/repositories/system-memory.repository";
import { ALL_STAGES, PlanType } from "@/types";

/**
 * Optimization Engine Cron (The Brain)
 * 
 * Target: /api/cron/optimization-engine
 * Requirement: Daily Offline Analysis (Item 3)
 */
export async function GET(req: NextRequest) {
  // CRITICAL: Basic auth check for Cron (replace with real secret header in prod)
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isRedisConfigured) {
    return NextResponse.json({ error: "Redis not configured" }, { status: 500 });
  }

  try {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    
    // 1. Fetch All Active Data for the rolling window
    const { data: allMemory, error } = await supabaseAdmin
      .from("system_memory")
      .select("*")
      .gte("created_at", sixtyDaysAgo);

    if (error || !allMemory) throw error || new Error("No data found");

    // 2. Define Segments to Analyze
    const industries = ["saas", "marketing_agency", "ecommerce", "consulting", "other"];
    const plans: PlanType[] = ["starter", "growth", "enterprise"];
    
    console.log(`[Cron] Analyzing ${allMemory.length} patterns across segments...`);

    // 3. Process every Segment Combination
    for (const ind of industries) {
      for (const pl of plans) {
        
        // A. Analyze HOOKS for this segment
        const segmentHooks = allMemory.filter(m => m.type === "hook" && m.industry === ind && m.plan === pl);
        if (segmentHooks.length > 0) {
          const globalTrials = await SystemMemoryRepository.getShardedGlobalTotal("hook", ind, pl) 
            || segmentHooks.reduce((s, r) => s + r.times_used, 0);
          
          const ranked = segmentHooks
            .map(row => ({ content: row.content, score: SystemMemoryRepository.computeAlgorithmicScore(row, globalTrials) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(r => r.content);

          await redis.setex(`cached:top:hooks:${ind}:${pl}:all`, 90000, ranked); // 25 hours
        }

        // B. Analyze QUESTIONS for each stage
        for (const stage of ALL_STAGES) {
          const segmentQuestions = allMemory.filter(m => 
            m.type === "question" && m.industry === ind && m.plan === pl && m.stage === stage
          );

          if (segmentQuestions.length > 0) {
             const globalTrials = await SystemMemoryRepository.getShardedGlobalTotal("question", ind, pl)
               || segmentQuestions.reduce((s, r) => s + r.times_used, 0);

             const ranked = segmentQuestions
               .map(row => ({ content: row.content, score: SystemMemoryRepository.computeAlgorithmicScore(row, globalTrials) }))
               .sort((a, b) => b.score - a.score)
               .slice(0, 10)
               .map(r => r.content);

             await redis.setex(`cached:top:questions:${ind}:${pl}:${stage}`, 90000, ranked);
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: allMemory.length,
      timestamp: new Date().toISOString() 
    });

  } catch (err: any) {
    console.error("[Cron] Optimization Engine Failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
