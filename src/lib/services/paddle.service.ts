// ═══════════════════════════════════════════════════════════
// Auricai — Paddle Service
// Direct Paddle API integration for subscription management.
// Used ONLY for programmatic cancellation during workspace deletion.
// ═══════════════════════════════════════════════════════════

const PADDLE_API_URL = process.env.PADDLE_API_URL || "https://api.paddle.com";
const PADDLE_API_KEY = process.env.PADDLE_API_KEY || "";

export const PaddleService = {
  /**
   * Cancel a Paddle subscription immediately.
   * Called during workspace deletion to stop future billing.
   */
  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    if (!PADDLE_API_KEY) {
      console.warn("[PaddleService] No API key configured — skipping Paddle cancellation.");
      return { success: false, error: "PADDLE_API_KEY not configured" };
    }

    if (!subscriptionId) {
      console.warn("[PaddleService] No subscription ID provided — nothing to cancel.");
      return { success: true }; // Nothing to cancel is not an error
    }

    try {
      const res = await fetch(`${PADDLE_API_URL}/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          effective_from: "immediately",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // 404 means subscription doesn't exist or already cancelled — not a failure
        if (res.status === 404) {
          console.log(`[PaddleService] Subscription ${subscriptionId} already cancelled or not found.`);
          return { success: true };
        }
        console.error(`[PaddleService] Cancel failed:`, res.status, body);
        return { success: false, error: body?.error?.detail || `HTTP ${res.status}` };
      }

      console.log(`[PaddleService] Subscription ${subscriptionId} cancelled successfully.`);
      return { success: true };
    } catch (err) {
      console.error("[PaddleService] Network error during cancellation:", err);
      return { success: false, error: (err as Error).message };
    }
  },
};
