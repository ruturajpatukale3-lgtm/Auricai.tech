// GET /api/public/interview/[token] — Public interview fetch (no auth)
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  console.log("VERSION: RAW_FETCH_V1");
  
  const { token } = await props.params;
  console.log("TOKEN:", token);

  const { data, error } = await supabaseAdmin
    .from("interviews")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "NOT FOUND" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data }, { status: 200 });
}
