import { notFound } from "next/navigation";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // Verify org exists
  const org = await OrganizationRepository.findById(orgId).catch(() => null);
  if (!org) return notFound();

  // Fetch only public / live case studies for this org
  const studies = await CaseStudyRepository.findByOrg(orgId, { status: "live" });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-white/10 selection:text-white">
      {/* Portfolio Header */}
      <nav className="border-b border-white/10 py-6 px-8 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org.logo_url && <img src={org.logo_url} alt={org.name} className="h-8 w-auto object-contain" />}
            <span className="text-xl font-bold tracking-tight text-white">{org.name}</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Client Outcomes
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="mb-20">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            Proven Results.
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl font-medium">
            Explore the exact outcomes we've generated for our trusted partners.
          </p>
        </div>

        {studies.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#111111] border border-white/5 text-center">
            <h3 className="text-xl font-bold text-white mb-2">No verified case studies yet.</h3>
            <p className="text-zinc-500">Check back later for updated client results.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {studies.map((study) => (
              <Link 
                href={`/c/${study.slug}`} 
                key={study.id}
                className="group relative flex flex-col justify-between bg-[#111111] border border-white/5 rounded-2xl p-8 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 min-h-[320px]"
              >
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 bg-white/5 inline-block px-3 py-1.5 rounded-full">
                    {study.company_name}
                  </div>
                  
                  <div className="flex flex-col gap-1 mb-6">
                    <span className="text-5xl font-black text-white font-mono tracking-tighter shadow-sm">
                      {study.metric_type || "N/A"}
                    </span>
                    {study.before_value && study.after_value && (
                      <span className="text-sm font-semibold text-zinc-400 font-mono tracking-tight mt-2">
                        {study.before_value} → {study.after_value}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white/90 leading-snug">
                    {study.headline}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-8 mt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-sm font-bold text-white">Read Case Study</span>
                  <ExternalLink className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
