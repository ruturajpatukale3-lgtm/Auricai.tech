import { CaseStudy, Organization } from "@/types";
import { PoweredByAuricaiStatic } from "@/components/shared/PoweredByAuricai";

interface TemplateProps {
  caseStudy: CaseStudy;
  org: Organization;
  showWatermark: boolean;
}

export function MinimalTemplate({ caseStudy, org, showWatermark }: TemplateProps) {
  const metrics = caseStudy.metrics || [];
  
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-100 selection:text-zinc-900">
      {/* Header */}
      <nav className="border-b border-zinc-100 py-6 px-8 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org.logo_url && <img src={org.logo_url} alt={org.name} className="h-8 w-auto object-contain" />}
            <span className="text-xl font-bold tracking-tight text-zinc-900">{org.name}</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Verified Proof Asset
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-24 md:py-32">
        {/* Hero Section */}
        <div className="space-y-12 mb-32">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.95] text-zinc-900 max-w-4xl">
              {caseStudy.headline}
            </h1>
            <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl font-medium leading-relaxed">
              How {caseStudy.company_name} achieved massive scale and moved from {caseStudy.before_value} to {caseStudy.after_value} in {caseStudy.timeframe}.
            </p>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {metrics.map((m, i) => (
              <div key={i} className="p-10 rounded-3xl bg-zinc-50 border border-zinc-100 group hover:border-zinc-200 transition-colors">
                <div className="text-5xl font-black text-zinc-900 tracking-tighter mb-2 group-hover:scale-105 transition-transform duration-500">
                  {m}
                </div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                  Key Result
                </div>
              </div>
            ))}
            {metrics.length === 0 && (
               <div className="p-10 rounded-3xl bg-zinc-50 border border-zinc-100">
                <div className="text-5xl font-black text-zinc-900 tracking-tighter mb-2">
                  {caseStudy.delta_percent ? `+${caseStudy.delta_percent}%` : "Success"}
                </div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                  {caseStudy.metric_type || "Performance"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 mb-32 items-start">
          <div className="lg:col-span-12 space-y-10">
            <div className="space-y-4">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 block">The Transformation</span>
              <p className="text-2xl md:text-3xl font-bold text-zinc-800 leading-snug max-w-4xl">
                {caseStudy.story}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/80">The Challenge</span>
                <p className="text-lg text-zinc-600 leading-relaxed font-semibold">{caseStudy.before_value}</p>
              </div>
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">The Outcome</span>
                <p className="text-lg text-zinc-600 leading-relaxed font-semibold">{caseStudy.after_value}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Quote */}
        {caseStudy.quote && (
          <div className="py-24 border-t border-zinc-100 mb-32">
            <blockquote className="relative">
              <p className="text-3xl md:text-5xl font-black text-zinc-900 leading-[1.1] tracking-tight mb-10">
                "{caseStudy.quote}"
              </p>
              <footer className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center font-black text-zinc-400 text-sm">
                  {caseStudy.client_name?.[0] || "?"}
                </div>
                <div>
                  <div className="text-base font-bold text-zinc-900">{caseStudy.client_name}</div>
                  <div className="text-sm font-medium text-zinc-400">{caseStudy.company_name}</div>
                </div>
              </footer>
            </blockquote>
          </div>
        )}

        {/* Verification Footer */}
        <div className="pt-10 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-8 text-zinc-400 text-sm">
          <div className="flex items-center gap-3 font-medium">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            Verified ROI Asset for {caseStudy.company_name}
          </div>
          <PoweredByAuricaiStatic hidden={!showWatermark} />
        </div>
      </main>
    </div>
  );
}
