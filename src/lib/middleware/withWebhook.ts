// ═══════════════════════════════════════════════════════════
// CaseFlow — Webhook Middleware
// Paddle signature verification + idempotency.
// ═══════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { apiError, handleApiError } from "@/lib/errors";
import crypto from "crypto";

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

type WebhookHandler = (req: NextRequest, body: Record<string, unknown>) => Promise<Response>;

/**
 * Wrap webhook handler with Paddle signature verification.
 */
export function withWebhook(handler: WebhookHandler) {
  return async (req: NextRequest) => {
    try {
      const rawBody = await req.text();

      // Verify signature if secret is configured
      if (PADDLE_WEBHOOK_SECRET) {
        const signature = req.headers.get("paddle-signature");
        if (!signature) {
          return apiError(401, "Missing Paddle signature", "MISSING_SIGNATURE");
        }

        const isValid = verifyPaddleSignature(rawBody, signature, PADDLE_WEBHOOK_SECRET);
        if (!isValid) {
          return apiError(401, "Invalid Paddle signature", "INVALID_SIGNATURE");
        }
      }

      const body = JSON.parse(rawBody);
      return await handler(req, body);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

function verifyPaddleSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Paddle v2 signature format: ts=TIMESTAMP;h1=HASH
    const parts = signature.split(";");
    const tsStr = parts.find((p) => p.startsWith("ts="));
    const h1Str = parts.find((p) => p.startsWith("h1="));

    if (!tsStr || !h1Str) return false;

    const ts = tsStr.replace("ts=", "");
    const h1 = h1Str.replace("h1=", "");

    const payload = `${ts}:${rawBody}`;
    const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(h1));
  } catch {
    return false;
  }
}
