// GET /api/public/interview/[token] — Public interview fetch (no auth)
// SIMPLE: token → interview → return. No joins.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await props.params;
    
    console.log("----------------------------------");
    console.log("[interview/token] API HIT:", token);

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });
    }

    // RAW DB FETCH — token only, no joins, no subscription lookups
    const { data, error } = await supabaseAdmin
      .from("interviews")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error("[interview/token] DB ERROR:", error);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    // TOKEN NOT FOUND — single clear message
    if (!data) {
      console.warn("[interview/token] NOT FOUND:", token);
      return NextResponse.json(
        { success: false, error: "Invalid or expired link" },
        { status: 404 }
      );
    }

    console.log("[interview/token] FOUND:", { id: data.id, status: data.status, client: data.client_name });

    // EXPIRED / DELETED
    if (data.status === "expired" || data.status === "deleted") {
      return NextResponse.json(
        { success: false, error: "Invalid or expired link" },
        { status: 410 }
      );
    }

    // ALREADY COMPLETED
    if (data.status === "completed" || data.status === "approved" || data.status === "published") {
      return NextResponse.json(
        { success: false, error: "This interview has already been completed", data },
        { status: 200 }
      );
    }

    // SUCCESS — return raw interview data, no joins
    return NextResponse.json({ success: true, data }, { status: 200 });
    
  } catch (error: any) {
    console.error("[interview/token] UNHANDLED:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal Server Error"
    }, { status: 500 });
  }
}
