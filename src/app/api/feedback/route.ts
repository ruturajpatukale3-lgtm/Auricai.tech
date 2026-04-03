// ═══════════════════════════════════════════════════════════
// POST /api/feedback
// API for storing user feedback in the database.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const POST = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("feedback")
      .insert({
        org_id: ctx.orgId,
        message: message.trim(),
      });

    if (error) {
      console.error("[Feedback API] Supabase Error:", error);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Thank you for your feedback!" });
  } catch (error) {
    console.error("[Feedback API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
