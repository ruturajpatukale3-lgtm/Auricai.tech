import { notFound } from "next/navigation";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { MinimalTemplate } from "@/components/templates/MinimalTemplate";
import { DarkTemplate } from "@/components/templates/DarkTemplate";
import { AgencyTemplate } from "@/components/templates/AgencyTemplate";
import { EnterpriseTemplate } from "@/components/templates/EnterpriseTemplate";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { data: study } = await CaseStudyService.getPublicBySlug(slug);
    if (!study) return { title: "Case Study Not Found" };
    
    return {
      title: `${study.headline} | Case Study`,
      description: study.summary || study.story || `Read how ${study.company_name} achieved massive results.`,
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

  let study, org;
  try {
    const result = await CaseStudyService.getPublicBySlug(slug, { source: "public_page" });
    if (!result.success || !result.data) return notFound();
    study = result.data;

    org = await OrganizationRepository.findById(study.org_id);
    if (!org) return notFound();

  } catch (error) {
    return notFound();
  }

  // Choose template based on study.template_id (if your DB supports it, else default to Minimal)
  // Our types define "minimal" | "dark" | "agency" | "enterprise"
  // Assuming default is minimal
  const templateId = study.template_id || "minimal";
  const showWatermark = org.plan_type === "free" || org.plan_type === "starter" || org.plan_type === "trial";

  const templateProps = {
    caseStudy: study,
    org: org,
    showWatermark
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
