import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing.service";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    const limit = await checkRateLimit("global_paddle_webhook", 50, "1 m");
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const rawBody = await req.text();

    // Verify signature if configured
    if (PADDLE_WEBHOOK_SECRET) {
      const signature = req.headers.get("paddle-signature");
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }
      if (!verifySignature(rawBody, signature, PADDLE_WEBHOOK_SECRET)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    await BillingService.handleWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Paddle Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

function verifySignature(body: string, sig: string, secret: string): boolean {
  try {
    // Extract timestamp (ts) and hash (h1) from the paddle-signature header
    const parts: Record<string, string> = {};
    sig.split(";").forEach((part) => {
      const [key, value] = part.split("=");
      if (key && value) parts[key] = value;
    });

    const ts = parts["ts"];
    const h1 = parts["h1"];

    if (!ts || !h1) return false;

    // Reject if the timestamp is too old (e.g., > 5 mins) to prevent replay attacks
    const timestamp = parseInt(ts, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      console.warn("[Paddle Webhook] Expired signature timestamp:", ts);
      return false;
    }

    // Official Paddle v2 signature structure: HMAC-SHA256(secret, ts + ":" + body)
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(`${ts}:${body}`)
      .digest("hex");

    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedHmac), 
      Buffer.from(h1)
    );
  } catch (error) {
    console.error("[Paddle Webhook] Signature verification error:", error);
    return false;
  }
}
