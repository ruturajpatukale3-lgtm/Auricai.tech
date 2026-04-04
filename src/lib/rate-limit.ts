import { Ratelimit } from "@upstash/ratelimit";
import { redis, isRedisConfigured } from "@/lib/redis";

/**
 * Production-ready Rate Limiting Helper
 * 
 * Protects public endpoints from brute-force and scraping.
 * FAILS CLOSED in production if Redis is not configured.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d` = "60 s"
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  
  if (!isRedisConfigured) {
    if (process.env.NODE_ENV === "production") {
      console.error("[RateLimit] CRITICAL: UPSTASH keys missing in PRODUCTION — BLOCKING REQUEST");
      return { success: false, limit, remaining: 0, reset: Date.now() + 60000 };
    }
    // Allow in development only
    return { success: true, limit, remaining: limit - 1, reset: Date.now() + 60000 };
  }

  try {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      analytics: true,
      prefix: "@caseflow/ratelimit",
    });

    const result = await ratelimit.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("[RateLimit] Error:", error);
    if (process.env.NODE_ENV === "production") {
      // Fail closed in production — block on Redis failure
      return { success: false, limit, remaining: 0, reset: Date.now() + 30000 };
    }
    // Fail open in development only
    return { success: true, limit, remaining: 0, reset: 0 };
  }
}
