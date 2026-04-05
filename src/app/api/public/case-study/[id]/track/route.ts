import { NextRequest, NextResponse } from "next/server";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { redis, isRedisConfigured } from "@/lib/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing Case Study ID" }, { status: 400 });

    const body = await request.json();
    const { 
      event, 
      duration = 0, 
      tabActive = true, 
      scrolled = true,
      scrollDepth = 0,
      sessionStartTime 
    } = body;

    // ─── FILTER 1: INTERNAL/DEV TRAFFIC ────────────────────
    const referer = request.headers.get("referer") || "";
    const origin = request.headers.get("origin") || "";
    if (
      referer.includes("localhost") ||
      referer.includes("127.0.0.1") ||
      referer.includes(".local") ||
      origin.includes("localhost")
    ) {
      return NextResponse.json({ success: true, filtered: "internal" });
    }

    // Capture IP
    const ip = request.headers.get("x-forwarded-for") || "unknown-ip";

    if (!isRedisConfigured) {
      // Fallback if Redis is down — allow tracking but log warning
      console.warn("[TrackAPI] Redis not configured, bypassing throttling.");
    }

    // ─── EVENT MATCHING ────────────────────────────────────
    if (event === "click") {
      // 1. Filter sessions under 2 seconds (Item 3)
      if (duration < 2000) {
        return NextResponse.json({ success: true, filtered: "short_session" });
      }

      if (isRedisConfigured) {
        const throttleKey = `track:throttle:click:${ip}:${id}`;
        const spikeKey = `track:spikes:${ip}`;

        // 2. Click Spike Detection (Item 6: Fraud)
        // Max 10 clicks per IP per 5 mins across the system
        const currentSpikes = await redis.incr(spikeKey);
        if (currentSpikes === 1) await redis.expire(spikeKey, 300);
        if (currentSpikes > 10) {
          return NextResponse.json({ success: true, filtered: "fraud_spike" });
        }

        // 3. Duplicate IP Throttling (Item 1: Redis)
        const isThrottled = await redis.exists(throttleKey);
        if (isThrottled) {
          return NextResponse.json({ success: true, filtered: "duplicate_ip" });
        }
        
        // Mark as tracked for 1 min
        await redis.setex(throttleKey, 60, "1");
      }
      
      await CaseStudyRepository.incrementClicks(id);
      return NextResponse.json({ success: true, tracked: "click" });
    } 
    
    if (event === "read") {
      // 4. Validation Hardening (Item 4: Multi-signal)
      // Must be active + scrolled + have significant scroll depth (e.g. 20%)
      if (!tabActive || !scrolled || scrollDepth < 20) {
        return NextResponse.json({ success: true, filtered: "low_engagement" });
      }

      // 5. Fraud Detection (Item 6: Unrealistic read_time)
      // If they claim to have read for more than the session has been alive
      if (sessionStartTime) {
        const sessionDuration = Date.now() - sessionStartTime;
        if (duration > sessionDuration + 5000) { // 5s grace
           return NextResponse.json({ success: true, filtered: "unrealistic_time" });
        }
      }

      await CaseStudyRepository.incrementReadTime(id, 0.2);
      return NextResponse.json({ success: true, tracked: "read" });
    }

    return NextResponse.json({ error: "Invalid event" }, { status: 400 });

  } catch (error) {
    console.error("[TrackAPI] Error processing engagement:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
