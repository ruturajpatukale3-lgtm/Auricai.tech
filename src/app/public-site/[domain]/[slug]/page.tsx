import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { Metadata } from "next";
import { MinimalTemplate } from "@/components/templates/MinimalTemplate";
import { DarkTemplate } from "@/components/templates/DarkTemplate";
import { AgencyTemplate } from "@/components/templates/AgencyTemplate";
import { EnterpriseTemplate } from "@/components/templates/EnterpriseTemplate";

interface PublicCaseStudyPageProps {
  params: {
    domain: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: PublicCaseStudyPageProps): Promise<Metadata> {
  const { domain, slug } = params;
  
  const isLocal = domain.includes("localhost");
  const org = isLocal 
    ? await OrganizationRepository.findById("org_test_123") 
    : await OrganizationRepository.findByDomain(domain);

  if (!org) return { title: "Case Study Not Found" };

  const result = await CaseStudyService.getPublicBySlug(slug);
  if (!result.success || !result.data) return { title: "Case Study Not Found" };

  const metadata: Metadata = {
    title: `${result.data.company_name} Case Study | ${org.name}`,
    description: result.data.headline || "",
  };

  if (org.logo_url) {
    metadata.icons = { icon: org.logo_url };
    metadata.openGraph = {
      images: [{ url: org.logo_url }],
    };
  }

  return metadata;
}

export default async function PublicCaseStudyPage({ params }: PublicCaseStudyPageProps) {
  const { domain, slug } = params;
  
  // 1. Resolve Organization
  const isLocal = domain.includes("localhost");
  const org = isLocal 
    ? await OrganizationRepository.findById(process.env.TEST_ORG_ID || "org_test") 
    : await OrganizationRepository.findByDomain(domain);

  if (!org) return notFound();

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") || "unknown";
  const ua = headerList.get("user-agent") || "unknown";
  const ref = headerList.get("referer") || "direct";

  // 2. Fetch and Increment Views
  const result = await CaseStudyService.getPublicBySlug(slug, {
    ip,
    user_agent: ua,
    referrer: ref,
  });
  if (!result.success || !result.data) return notFound();

  const cs = result.data;
  const showWatermark = org.plan_type !== "enterprise";

  return (
    <>
      {cs.template_id === "dark" ? (
         <DarkTemplate caseStudy={cs} org={org} showWatermark={showWatermark} />
      ) : cs.template_id === "agency" ? (
         <AgencyTemplate caseStudy={cs} org={org} showWatermark={showWatermark} />
      ) : cs.template_id === "enterprise" ? (
         <EnterpriseTemplate caseStudy={cs} org={org} showWatermark={showWatermark} />
      ) : (
         <MinimalTemplate caseStudy={cs} org={org} showWatermark={showWatermark} />
      )}
    </>
  );
}
