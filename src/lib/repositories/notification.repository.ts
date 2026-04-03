// ═══════════════════════════════════════════════════════════
// Auricai — Notification Repository
// All notification CRUD operations. Database is source of truth.
// ═══════════════════════════════════════════════════════════

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Notification, NotificationType } from "@/types";

export const NotificationRepository = {
  /**
   * Create a new notification
   */
  async create(
    orgId: string,
    type: NotificationType,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<Notification> {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        org_id: orgId,
        type,
        message,
        metadata: metadata || null,
        read: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create notification: ${error.message}`);
    return data as Notification;
  },

  /**
   * Get unread notifications for an org
   */
  async findUnread(orgId: string, limit: number = 20): Promise<Notification[]> {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("org_id", orgId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch unread notifications: ${error.message}`);
    return (data || []) as Notification[];
  },

  /**
   * Get all recent notifications for an org (read + unread)
   */
  async findAll(orgId: string, limit: number = 50): Promise<Notification[]> {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);
    return (data || []) as Notification[];
  },

  /**
   * Count unread notifications
   */
  async countUnread(orgId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("read", false);

    if (error) return 0;
    return count || 0;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(orgId: string, notificationId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("org_id", orgId);

    if (error) throw new Error(`Failed to mark notification as read: ${error.message}`);
  },

  /**
   * Mark all notifications as read for an org
   */
  async markAllAsRead(orgId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("org_id", orgId)
      .eq("read", false);

    if (error) throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  },

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOlderThan(orgId: string, days: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("org_id", orgId)
      .lt("created_at", cutoff)
      .select("id");

    if (error) return 0;
    return data?.length || 0;
  },
};
