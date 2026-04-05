import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CaseStudyService } from "@/lib/services/case-study.service";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { Metadata } from "next";
import { PoweredByAuricaiStatic } from "@/components/shared/PoweredByAuricai";

interface PublicCaseStudyPageProps {
  params: {
    domain: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: PublicCaseStudyPageProps): Promise<Metadata> {
  const { domain, slug } = params;
  
  // Find org by domain (custom or localhost)
  const isLocal = domain.includes("localhost");
  const org = isLocal 
    ? await OrganizationRepository.findById("org_test_123") // Fallback for local dev
    : await OrganizationRepository.findByDomain(domain);

  if (!org) return { title: "Case Study Not Found" };

  const result = await CaseStudyService.getPublicBySlug(slug);
  if (!result.success || !result.data) return { title: "Case Study Not Found" };

  return {
    title: `${result.data.company_name} Case Study | ${org.name}`,
    description: result.data.headline || "",
  };
}

export default async function PublicCaseStudyPage({ params }: PublicCaseStudyPageProps) {
  const { domain, slug } = params;
  // 1. Resolve Organization
  const isLocal = domain.includes("localhost");
  const org = isLocal 
    ? await OrganizationRepository.findById(process.env.TEST_ORG_ID || "org_test") // Dev mode
    : await OrganizationRepository.findByDomain(domain);

  if (!org) return notFound();

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") || "unknown";
  const ua = headerList.get("user-agent") || "unknown";
  const ref = headerList.get("referer") || "direct";

  // 2. Fetch and Increment Views (Enrich with metadata)
  const result = await CaseStudyService.getPublicBySlug(slug, {
    ip,
    user_agent: ua,
    referrer: ref,
  });
  if (!result.success || !result.data) return notFound();

  const cs = result.data;
  const showWatermark = org.plan_type !== "enterprise";

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Premium Header */}
      <nav className="border-b border-gray-100 py-6 px-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org.logo_url && <img src={org.logo_url} alt={org.name} className="h-8 w-auto object-contain" />}
            <span className="text-xl font-bold tracking-tight">{org.name}</span>
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Verified Case Study</div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Metric Hero */}
        <div className="space-y-8 text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-bold tracking-wide uppercase">
            {cs.metric_type} Performance
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
            {cs.headline}
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
            How {cs.company_name} achieved massive scale in just {cs.timeframe}.
          </p>
        </div>

        {/* The "Money" Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          <StatCard 
            label="Improvement" 
            value={`${cs.delta_percent}%`} 
            sub={`In ${cs.timeframe}`}
            highlight
          />
          <StatCard 
            label="Impact Driven" 
            value={cs.pipeline_value ? `$${cs.pipeline_value.toLocaleString()}` : "—"} 
            sub="Verifiable ROI"
          />
          <StatCard 
            label="Social Proof" 
            value={cs.deals_influenced ?? "—"} 
            sub="Community Signal"
          />
        </div>

        {/* Verification Footer */}
        <div className="mt-40 pt-10 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 text-gray-400 text-sm">
          <div className="flex items-center gap-2 italic">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Verified ROI for {cs.company_name}
          </div>
          
          {/* HARD ENFORCEMENT: Server-side watermark — hidden on Enterprise */}
          <PoweredByAuricaiStatic hidden={!showWatermark} />
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string | number; subText?: string; highlight?: boolean; subTextHighlight?: boolean; sub?: string }) {
  return (
    <div className={`p-8 rounded-3xl border ${highlight ? 'bg-[#0A0A0A] text-white border-black shadow-2xl' : 'bg-gray-50 border-gray-100'}`}>
      <div className={`text-xs font-bold uppercase tracking-widest mb-10 ${highlight ? 'text-gray-400' : 'text-gray-400'}`}>
        {label}
      </div>
      <div className="text-5xl font-black mb-2 tracking-tighter">
        {value}
      </div>
      <div className={`text-sm font-semibold ${highlight ? 'text-blue-400' : 'text-gray-500'}`}>
        {sub}
      </div>
    </div>
  );
}
