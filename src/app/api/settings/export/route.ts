import { NextRequest, NextResponse } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { apiError } from "@/lib/errors";

export const GET = withOrg(async (req: NextRequest, ctx: OrgContext) => {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // 'case-studies' | 'interviews'
  const format = searchParams.get("format") || "json"; // 'json' | 'csv'

  try {
    let data: any[] = [];
    let filename = `export-${ctx.orgId}-${new Date().toISOString()}`;

    if (type === "case-studies") {
      const result = await CaseStudyRepository.findByOrg(ctx.orgId);
      data = Array.isArray(result) ? result : (result as any).data || [];
      filename = `case-studies-${filename}`;
    } else if (type === "interviews") {
      const result = await InterviewRepository.findByOrg(ctx.orgId);
      data = Array.isArray(result) ? result : (result as any).data || [];
      filename = `interviews-${filename}`;
    } else {
      return apiError(400, "Invalid export type");
    }

    if (format === "csv") {
      const csv = convertToCSV(data);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  } catch (error: any) {
    console.error("[Export API] Error:", error);
    return apiError(500, "Failed to export data");
  }
});

function convertToCSV(objArray: any[]) {
  if (objArray.length === 0) return "";
  const array = typeof objArray !== "object" ? JSON.parse(objArray) : objArray;
  let str = "";
  
  // Headers
  const headers = Object.keys(array[0]);
  str += headers.join(",") + "\r\n";

  // Rows
  for (let i = 0; i < array.length; i++) {
    let line = "";
    for (const index in headers) {
      if (line !== "") line += ",";
      let val = array[i][headers[index]];
      // Escape commas and quotes
      if (typeof val === "string") {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      line += val;
    }
    str += line + "\r\n";
  }
  return str;
}
