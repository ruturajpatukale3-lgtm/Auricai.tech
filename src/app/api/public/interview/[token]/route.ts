// GET /api/public/interview/[token] — Public interview fetch (no auth)
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await props.params;

    const { data, error } = await supabaseAdmin
      .from("interviews")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    console.log("TOKEN:", token);
    console.log("DB DATA:", data);
    console.log("DB ERROR:", error);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: "NOT FOUND"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: data
    }, { status: 200 });
  } catch (error: any) {
    console.error("[GET public interview] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
