// GET /api/public/case-study/[id] — Public case study view (no auth)
import { NextRequest, NextResponse } from "next/server";
import { CaseStudyService } from "@/lib/services/case-study.service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await CaseStudyService.getPublic(id);
    if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
