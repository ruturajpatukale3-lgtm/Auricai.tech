import { supabaseAdmin } from "@/lib/supabase-admin";

const TABLE = "webhook_events";

export const ProcessedWebhooksRepository = {
  /**
   * Log a webhook as processed atomically.
   * Returns true if successfully inserted (first time processing).
   * Returns false if it already exists (duplicate webhook).
   */
  async processEvent(eventId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .insert({ event_id: eventId });
    
    if (error) {
      if (error.code === '23505') return false; // Unique violation -> Duplicate
      throw new Error(`Failed to log processed webhook: ${error.message}`);
    }
    
    return true; // Successfully logged
  },
};
