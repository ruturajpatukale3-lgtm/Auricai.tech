import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";

interface PublicSiteRootProps {
  params: {
    domain: string;
  };
}

export async function generateMetadata({ params }: PublicSiteRootProps): Promise<Metadata> {
  const { domain } = params;
  
  const isLocal = domain.includes("localhost");
  const org = isLocal 
    ? await OrganizationRepository.findById(process.env.TEST_ORG_ID || "org_test") // Fallback for local dev
    : await OrganizationRepository.findByDomain(domain);

  if (!org) return { title: "Not Found" };

  const metadata: Metadata = {
    title: `Customer Stories | ${org.name}`,
    description: `Read how ${org.name} helps customers achieve massive scale and ROI.`,
  };

  if (org.logo_url) {
    metadata.icons = { icon: org.logo_url };
    metadata.openGraph = {
      images: [{ url: org.logo_url }],
    };
  }

  return metadata;
}

export default async function PublicSiteRoot({ params }: PublicSiteRootProps) {
  const { domain } = params;
  
  const isLocal = domain.includes("localhost");
  const org = isLocal 
    ? await OrganizationRepository.findById(process.env.TEST_ORG_ID || "org_test") // Dev mode
    : await OrganizationRepository.findByDomain(domain);

  if (!org) return notFound();

  // Fetch verified case studies
  const caseStudies = await CaseStudyRepository.findByOrg(org.id, { status: "live" });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] font-sans selection:bg-[#2563EB] selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-[rgba(255,255,255,0.08)] py-6 px-6 lg:px-10 sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-xl z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org.logo_url && (
              <img src={org.logo_url} alt={org.name} className="h-8 w-auto object-contain" />
            )}
            <span className="text-xl font-bold tracking-tight text-white">{org.name}</span>
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">
              Verified Stories
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Real Proof. <br className="hidden md:block" />
            <span className="text-[#A1A1AA]">Real Customers.</span>
          </h1>
          <p className="text-xl text-[#A1A1AA] max-w-2xl font-medium leading-relaxed">
            See exactly how we help forward-thinking companies unlock massive scale and measurable ROI. 
          </p>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-6 pb-32">
        {caseStudies.length === 0 ? (
          <div className="py-20 border-t border-[rgba(255,255,255,0.08)] flex justify-center">
            <p className="text-[#A1A1AA] text-lg">No verified case studies available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border-t border-[rgba(255,255,255,0.08)] pt-16">
            {caseStudies.map((cs) => (
              <Link
                key={cs.id}
                href={`/c/${cs.slug}`}
                className="group flex flex-col p-8 rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300 relative overflow-hidden"
              >
                {/* Metric Badge */}
                <div className="absolute top-8 right-8 z-10 w-14 h-14 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center flex-col shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform">
                  <span className="text-xs font-bold text-[#10B981] leading-none mb-0.5">+{cs.delta_percent}%</span>
                </div>

                <div className="flex-1">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#A1A1AA] mb-4">
                    {cs.company_name}
                  </h2>
                  <h3 className="text-2xl font-bold leading-tight mb-4 pr-10 group-hover:text-white transition-colors text-gray-200">
                    {cs.headline}
                  </h3>
                  <div className="inline-flex items-center gap-2 mt-auto">
                    <span className="text-sm font-semibold text-[#2563EB]">Read Full Story</span>
                    <span className="text-[#2563EB] group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
