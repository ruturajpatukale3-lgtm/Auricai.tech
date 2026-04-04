// GET /api/public/interview/[token] — Public interview fetch (no auth)
// Nudge: Triggering fresh deployment with Absolute Raw Fetch V2 fix
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  
  console.log("----------------------------------");
  console.log("INTERVIEW VERIFICATION START");
  console.log("TOKEN:", token);

  // 1. RAW DB FETCH (No Joins for reliability)
  const { data, error } = await supabaseAdmin
    .from("interviews")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("DB ERROR during verification:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // 2. TOKEN NOT FOUND
  if (!data) {
    console.warn("TOKEN NOT FOUND:", token);
    return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
  }

  console.log("INTERVIEW DATA FOUND:", { 
    id: data.id, 
    status: data.status, 
    client: data.client_name 
  });

  // 3. STATUS CHECKS (Basic Expiry)
  if (data.status === "expired" || data.status === "deleted") {
    console.warn("INTERVIEW EXPIRED/DELETED:", token);
    return NextResponse.json({ success: false, error: "Interview has expired" }, { status: 410 });
  }

  if (data.status === "completed" || data.status === "approved" || data.status === "published") {
    console.warn("INTERVIEW ALREADY FINALIZED:", token, "Current status:", data.status);
    return NextResponse.json({ success: false, error: "Interview has already been completed", data }, { status: 200 });
  }

  return NextResponse.json({
    success: true,
    data
  }, { status: 200 });
}
