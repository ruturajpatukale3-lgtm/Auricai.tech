import { notFound } from "next/navigation";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { MinimalTemplate } from "@/components/templates/MinimalTemplate";
import { DarkTemplate } from "@/components/templates/DarkTemplate";
import { AgencyTemplate } from "@/components/templates/AgencyTemplate";
import { EnterpriseTemplate } from "@/components/templates/EnterpriseTemplate";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const study = await CaseStudyRepository.findPublicBySlug(slug);
    if (!study) return { title: "Case Study Not Found" };
    
    return {
      title: `${study.headline || "Case Study"} | Auricai`,
      description: study.summary || study.story || `Read how ${study.company_name} achieved results.`,
    };
  } catch {
    return { title: "Case Study Not Found" };
  }
}

export default async function PublicCaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // ─── Fetch case study by slug ───────────────────────
  let study;
  try {
    study = await CaseStudyRepository.findPublicBySlug(slug);
    console.log("[/c/slug] Fetched case study:", study ? study.id : "NOT FOUND", "slug:", slug);
  } catch (error) {
    console.error("[/c/slug] Error fetching case study:", error);
    return notFound();
  }

  if (!study) {
    return notFound();
  }

  // ─── Fetch org ──────────────────────────────────────
  let org;
  try {
    org = await OrganizationRepository.findById(study.org_id);
  } catch (error) {
    console.error("[/c/slug] Error fetching org:", error);
    return notFound();
  }

  if (!org) {
    return notFound();
  }

  // ─── Increment views (non-blocking) ─────────────────
  CaseStudyRepository.incrementViews(study.id).catch(() => {});

  // ─── Template rendering ─────────────────────────────
  const templateId = study.template_id || "minimal";
  const showWatermark = org.plan_type === "free" || org.plan_type === "starter" || org.plan_type === "trial";

  const templateProps = {
    caseStudy: study,
    org,
    showWatermark,
  };

  switch (templateId) {
    case "dark":
      return <DarkTemplate {...templateProps} />;
    case "agency":
      return <AgencyTemplate {...templateProps} />;
    case "enterprise":
      return <EnterpriseTemplate {...templateProps} />;
    case "minimal":
    default:
      return <MinimalTemplate {...templateProps} />;
  }
}
