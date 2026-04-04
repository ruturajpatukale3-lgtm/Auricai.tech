import 'server-only';
import { Redis } from '@upstash/redis'

/**
 * Upstash Redis Client (Production)
 * 
 * Used for:
 * - Rate Limiting
 * - Caching
 * - Background Job Coordination
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Validation helper
const isConfigured = url && token 
  && !url.startsWith("your_") 
  && !token.startsWith("your_");

if (!isConfigured && process.env.NODE_ENV === "production") {
  console.warn("[Redis] CRITICAL: UPSTASH keys missing in PRODUCTION.");
}

// Only initialize if we have a valid URL to avoid build errors
export const redis = isConfigured 
  ? new Redis({
      url: url!,
      token: token!,
    })
  : null as unknown as Redis; // Type-casting but will be caught by checks in consumer code

export const isRedisConfigured = isConfigured;
