import { createHash } from "crypto";

/**
 * Filter out common bots to ensure clean analytics data.
 */
export function isBot(ua: string | null): boolean {
  if (!ua) return false;
  const botPatterns = [
    /bot/i, /spider/i, /crawl/i, /slurp/i, /bing/i, /google/i, /lighthouse/i,
    /adsbot/i, /mediapartners/i, /sogou/i, /python/i, /node/i, /curl/i, /wget/i,
    /postman/i, /insomnia/i, /vercel/i, /nextjs/i, /k8s/i
  ];
  return botPatterns.some(pattern => pattern.test(ua));
}

/**
 * Generate a unique visitor ID hash from IP and User-Agent.
 * Fallback to reading an explicit `cf_vid` cookie when Network IPs are stripped internally.
 * This allows us to track unique views without storing raw PII in logs.
 */
import { cookies } from "next/headers";

export async function generateVisitorId(ip: string, ua: string): Promise<string> {
  const salt = process.env.ANALYTICS_SALT || "caseflow_salt_2024";
  
  let cookieFallback = null;
  try {
    const store = await cookies();
    cookieFallback = store.get("cf_vid")?.value;
  } catch(e) { /* silent fail for background jobs */ }

  const baseIdentity = cookieFallback || `${ip}-${ua}`;

  return createHash("sha256")
    .update(`${baseIdentity}-${salt}`)
    .digest("hex")
    .substring(0, 16); // Shortened for efficiency
}
