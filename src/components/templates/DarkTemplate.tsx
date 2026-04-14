import { CaseStudy, Organization } from "@/types";
import { PoweredByAuricaiStatic } from "@/components/shared/PoweredByAuricai";

interface TemplateProps {
  caseStudy: CaseStudy;
  org: Organization;
  showWatermark: boolean;
}

export function DarkTemplate({ caseStudy, org, showWatermark }: TemplateProps) {
  const metrics = caseStudy.metrics || [];
  
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 font-sans selection:bg-blue-500/30 selection:text-white">
      {/* Premium Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <nav className="border-b border-white/[0.03] py-6 px-8 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
               {org.logo_url ? <img src={org.logo_url} alt={org.name} className="w-5 h-5 object-contain invert" /> : <div className="w-4 h-4 bg-white/20 rounded-sm" />}
             </div>
            <span className="text-xl font-bold tracking-tight text-white">{org.name}</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
            Internal Audit — Verified Output
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-24 md:py-32 relative z-10">
        {/* Hero Section */}
        <div className="space-y-12 mb-32">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
              {caseStudy.company_name} • Impact Report
            </div>
            <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.9] text-white max-w-4xl drop-shadow-2xl">
              {caseStudy.headline}
            </h1>
            <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl font-medium leading-relaxed">
              Moving from {caseStudy.before_value} to a optimized state of {caseStudy.after_value} in {caseStudy.timeframe}.
            </p>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.map((m, i) => (
              <div key={i} className="p-10 rounded-3xl bg-white/[0.02] border border-white/[0.05] relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-6xl font-black text-white tracking-tighter mb-2 group-hover:translate-y-[-2px] transition-transform">
                  {m}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Performance Metric
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Narrative Section */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-20 mb-32">
          <div className="space-y-12">
            <div className="space-y-6">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">The Journey</span>
              <p className="text-3xl md:text-4xl font-bold text-zinc-200 leading-tight max-w-4xl">
                {caseStudy.story}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl bg-white/[0.01] border border-white/[0.03] space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Initial State</span>
                <p className="text-lg text-zinc-400 leading-relaxed italic">"{caseStudy.before_value}"</p>
              </div>
              <div className="p-8 rounded-2xl bg-blue-500/[0.02] border border-blue-500/10 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Target Reached</span>
                <p className="text-lg text-blue-100/80 leading-relaxed font-semibold">{caseStudy.after_value}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Quote */}
        {caseStudy.quote && (
          <div className="py-24 border-t border-white/[0.05] mb-32 text-center">
            <div className="max-w-4xl mx-auto space-y-12">
               <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-blue-400 mx-auto rounded-full" />
              <p className="text-3xl md:text-6xl font-black text-white leading-tight tracking-tight italic">
                "{caseStudy.quote}"
              </p>
              <div className="flex flex-col items-center gap-4">
                <div className="text-lg font-bold text-white">{caseStudy.client_name}</div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">{caseStudy.company_name}</div>
              </div>
            </div>
          </div>
        )}

        {/* Verification Footer */}
        <div className="pt-10 border-t border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-8 text-zinc-600 text-sm">
          <div className="flex items-center gap-3 font-medium">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            Verified ROI Asset • {caseStudy.company_name} • CaseFlow Engine
          </div>
          <PoweredByAuricaiStatic hidden={!showWatermark} />
        </div>
      </main>
    </div>
  );
}
