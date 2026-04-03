import { NextRequest } from "next/server";
import { withOrg, OrgContext } from "@/lib/middleware/withOrg";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { EventService } from "@/lib/services/event.service";
import { apiSuccess, apiError } from "@/lib/errors";
import { z } from "zod";

const trackSchema = z.object({
  type: z.enum(["case_study_shared"]),
});

export const POST = withOrg(async (
  req: NextRequest,
  ctx: OrgContext,
  params?: Record<string, string>
) => {
  const { id } = params || {};
  if (!id) return apiError(400, "ID is required");

  const body = await req.json();
  const validation = trackSchema.safeParse(body);

  if (!validation.success) {
    return apiError(400, "Invalid event type");
  }

  const { orgId } = ctx;
  const caseStudy = await CaseStudyService.getById(orgId, id);
  if (!caseStudy) return apiError(404, "Case study not found");

  if (validation.data.type === "case_study_shared") {
    await EventService.caseStudyShared(orgId, id, caseStudy.company_name);
  }

  return apiSuccess({ tracked: true });
});
