// GET /api/public/interview/[token] — Public interview fetch (no auth)
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  console.log("DEPLOY VERSION: FINAL_RAW_FETCH_V2");
  
  const { token } = await props.params;
  console.log("TOKEN:", token);

  const { data, error } = await supabaseAdmin
    .from("interviews")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  console.log("DATA:", data);
  console.log("ERROR:", error);

  return NextResponse.json({
    data,
    error
  }, { status: 200 });
}
