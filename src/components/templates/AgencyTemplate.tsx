import { CaseStudy, Organization } from "@/types";
import { PoweredByAuricaiStatic } from "@/components/shared/PoweredByAuricai";

interface TemplateProps {
  caseStudy: CaseStudy;
  org: Organization;
  showWatermark: boolean;
}

export function AgencyTemplate({ caseStudy, org, showWatermark }: TemplateProps) {
  const metrics = caseStudy.metrics || [];
  
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-orange-500/20 selection:text-orange-900">
      {/* Header */}
      <nav className="border-b border-zinc-200/60 py-5 px-8 bg-zinc-50/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center shadow-md">
               {org.logo_url ? <img src={org.logo_url} alt={org.name} className="w-5 h-5 object-contain invert brightness-0" /> : <div className="w-4 h-4 bg-white/20 rounded-full" />}
             </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900">{org.name}</span>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-xs font-bold text-zinc-500">Case Study</span>
             <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
             <span className="text-xs font-bold text-zinc-500">{caseStudy.company_name}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20">
        
        {/* Split Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-32 items-center">
           <div className="lg:col-span-7 space-y-8">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-100/50 border border-orange-200/50 text-orange-600 text-sm font-bold uppercase tracking-widest">
               Client Success Story
             </div>
             <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1] text-zinc-900">
               {caseStudy.headline}
             </h1>
             <p className="text-xl md:text-2xl text-zinc-500 font-medium leading-relaxed max-w-xl border-l-4 border-orange-500 pl-6">
               {caseStudy.story}
             </p>
           </div>
           
           <div className="lg:col-span-5 bg-white p-10 rounded-[2rem] shadow-xl border border-zinc-100 flex flex-col justify-center space-y-10 relative overflow-hidden">
               {/* Decorative Element */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-[100px]" />
               
               {metrics.map((m, i) => (
                 <div key={i} className="relative z-10">
                   <div className="text-6xl md:text-7xl font-black text-zinc-900 tracking-tighter mb-2">
                     {m}
                   </div>
                   <div className="text-sm font-bold uppercase tracking-widest text-orange-500">
                     Key Metric Achieved
                   </div>
                 </div>
               ))}
           </div>
        </div>

        {/* Challenge to Solution Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
           <div className="bg-red-50/50 rounded-3xl p-12 border border-red-100/50">
               <div className="mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black">1</div>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">The Friction</h3>
               </div>
               <p className="text-lg text-zinc-600 leading-relaxed font-medium">
                  {caseStudy.before_value}
               </p>
           </div>
           
           <div className="bg-emerald-50/50 rounded-3xl p-12 border border-emerald-100/50">
               <div className="mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">2</div>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">The Outcome</h3>
               </div>
               <p className="text-lg text-zinc-600 leading-relaxed font-medium">
                  {caseStudy.after_value}
               </p>
           </div>
        </div>

        {/* Testimonial Feature */}
        {caseStudy.quote && (
          <div className="py-20 px-8 md:px-20 bg-[#0A0A0A] rounded-[3rem] text-white shadow-2xl relative overflow-hidden mb-20 text-center">
            <div className="max-w-4xl mx-auto flex flex-col items-center relative z-10">
               <div className="text-8xl text-orange-500 font-serif leading-none absolute top-[-40px] left-[-40px] opacity-20">"</div>
               <p className="text-3xl md:text-5xl font-black leading-[1.2] tracking-tight mb-12">
                 {caseStudy.quote}
               </p>
               <div className="flex flex-col items-center gap-2">
                 <div className="text-xl font-bold">{caseStudy.client_name}</div>
                 <div className="text-sm text-zinc-400 font-medium tracking-wide uppercase">{caseStudy.company_name}</div>
               </div>
            </div>
            {/* Background ambient light */}
            <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[500px] h-[500px] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
          </div>
        )}

        {/* Verification Footer */}
        <div className="pt-8 border-t border-zinc-200/60 flex flex-col md:flex-row items-center justify-between gap-8 text-zinc-500 text-sm">
          <div className="flex items-center gap-3 font-bold">
            <div className="w-2 h-2 rounded-full bg-zinc-900" />
            Verified Case Study • {caseStudy.company_name}
          </div>
          <PoweredByAuricaiStatic hidden={!showWatermark} />
        </div>
      </main>
    </div>
  );
}
