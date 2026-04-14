import { CaseStudy, Organization } from "@/types";
import { PoweredByAuricaiStatic } from "@/components/shared/PoweredByAuricai";

interface TemplateProps {
  caseStudy: CaseStudy;
  org: Organization;
  showWatermark: boolean;
}

export function EnterpriseTemplate({ caseStudy, org, showWatermark }: TemplateProps) {
  const metrics = caseStudy.metrics || [];
  
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Header */}
      <nav className="border-b border-slate-200 py-6 px-10 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {org.logo_url && <img src={org.logo_url} alt={org.name} className="h-8 w-auto object-contain" />}
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">{org.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Enterprise Audit</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <span className="text-sm font-semibold text-slate-500">Case Study: {caseStudy.company_name}</span>
            <div className="px-3 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
              {caseStudy.timeframe} Execution
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        {/* Clean Enterprise Hero */}
        <div className="flex flex-col md:flex-row gap-16 mb-24 items-end">
           <div className="flex-1 space-y-8">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] text-slate-900 max-w-4xl">
                 {caseStudy.headline}
              </h1>
              <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-2xl">
                 A detailed breakdown of how {caseStudy.company_name} scaled from {caseStudy.before_value} to {caseStudy.after_value}.
              </p>
           </div>
           
           <div className="w-full md:w-1/3 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-900 transform origin-left group-hover:scale-x-105 transition-transform" />
              <div className="text-6xl font-black tracking-tighter text-slate-900 mb-2">
                 {caseStudy.delta_percent ? `+${caseStudy.delta_percent}%` : (metrics[0] || "Success")}
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-slate-500">
                 Net Primary Impact
              </div>
           </div>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          {metrics.map((m, i) => (
             <div key={i} className="bg-white border-t-2 border-slate-200 p-8 pt-10">
                <div className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                   <div className="w-2 h-2 rounded bg-slate-400" /> Metric 0{i + 1}
                </div>
                <div className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
                   {m}
                </div>
             </div>
          ))}
        </div>

        {/* Structured Narrative */}
        <div className="bg-white rounded-[2rem] border border-slate-200 p-10 md:p-20 shadow-sm mb-32">
           <div className="max-w-4xl mx-auto space-y-16">
              <div className="space-y-6">
                 <h2 className="text-3xl font-bold tracking-tight text-slate-900">The Context</h2>
                 <p className="text-xl text-slate-600 leading-relaxed font-medium">
                    {caseStudy.story}
                 </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-slate-100">
                 <div className="space-y-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Baseline Performance</span>
                    <p className="text-lg text-slate-700 leading-relaxed font-medium">
                       {caseStudy.before_value}
                    </p>
                 </div>
                 <div className="space-y-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-900 block mb-2">Post-Implementation</span>
                    <p className="text-lg text-slate-700 leading-relaxed font-medium">
                       {caseStudy.after_value}
                    </p>
                 </div>
              </div>
           </div>
        </div>

        {/* Executive Sponsor Quote */}
        {caseStudy.quote && (
          <div className="max-w-4xl mx-auto text-center mb-32">
             <div className="mb-10 text-slate-300 flex justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
             </div>
             <p className="text-3xl md:text-4xl font-bold text-slate-900 leading-snug tracking-tight mb-8">
                {caseStudy.quote}
             </p>
             <div className="flex flex-col items-center justify-center gap-1">
                <div className="text-lg font-bold text-slate-900">{caseStudy.client_name}</div>
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{caseStudy.company_name}</div>
             </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8 text-slate-500 text-sm">
          <div className="font-semibold">
            Produced by {org.name} | Verified Case Study
          </div>
          <PoweredByAuricaiStatic hidden={!showWatermark} />
        </div>
      </main>
    </div>
  );
}
