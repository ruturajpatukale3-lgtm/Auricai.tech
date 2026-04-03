import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Production-ready Rate Limiting Helper
 * 
 * Protects public endpoints from brute-force and scraping.
 * Gracefully falls back if Redis keys are missing in dev.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d` = "60 s"
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Fallback for local development or missing keys
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[RateLimit] WARNING: UPSTASH keys missing in PRODUCTION!");
    }
    return { success: true, limit, remaining: limit - 1, reset: Date.now() + 60000 };
  }

  try {
    const redis = new Redis({
      url,
      token,
    });

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
    // Fail open in case of Upstash downtime so the app doesn't crash for real users
    return { success: true, limit, remaining: 0, reset: 0 };
  }
}
