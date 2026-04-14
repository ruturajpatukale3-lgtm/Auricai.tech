"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, ExternalLink } from "lucide-react";
import { apiPatch } from "@/lib/hooks/useSWR";
import toast from "react-hot-toast";
import type { CaseStudy } from "@/types";

export default function EditCaseStudyClient({ initialData }: { initialData: CaseStudy }) {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    company_name: initialData.company_name || "",
    headline: initialData.headline || "",
    metric_type: initialData.metric_type || "",
    story: initialData.story || "",
    quote: initialData.quote || "",
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ─── Hard Validation ───────────────────────
    if (!formData.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!formData.headline.trim()) {
      toast.error("Headline is required");
      return;
    }
    if (!formData.story.trim() || formData.story.trim().length < 100) {
      toast.error("Story must be at least 100 characters");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const result = await apiPatch(`/api/case-studies/${initialData.id}`, {
        company_name: formData.company_name.trim(),
        headline: formData.headline.trim(),
        metric_type: formData.metric_type.trim() || undefined,
        story: formData.story.trim(),
        quote: formData.quote.trim() || undefined,
      });

      if (result.success) {
        toast.success("Case study updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update case study");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const wordCount = formData.story.trim().split(/\s+/).filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 space-y-6 shadow-2xl">
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">
              Primary Metric
            </label>
            <input
              type="text"
              value={formData.metric_type}
              onChange={(e) => setFormData(prev => ({ ...prev, metric_type: e.target.value }))}
              placeholder="e.g. +158% Engagement"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">
            Headline
          </label>
          <input
            type="text"
            value={formData.headline}
            onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-semibold"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Story
            </label>
            <span className={`text-xs font-mono ${wordCount < 100 ? 'text-red-400' : wordCount > 200 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {wordCount} words
            </span>
          </div>
          <textarea
            value={formData.story}
            onChange={(e) => setFormData(prev => ({ ...prev, story: e.target.value }))}
            rows={10}
            placeholder="The full structured case study (120-180 words). This is the main content shown on the public page."
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all resize-y leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">
            Client Quote
          </label>
          <textarea
            value={formData.quote}
            onChange={(e) => setFormData(prev => ({ ...prev, quote: e.target.value }))}
            rows={2}
            placeholder="Natural, human-sounding quote from the client"
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all resize-none font-serif italic text-zinc-300"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (initialData.slug) {
              window.open(`/c/${initialData.slug}`, '_blank');
            } else {
              toast.error("No public link available yet");
            }
          }}
          className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" /> Live Preview
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold transition-all bg-white hover:bg-zinc-200 text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-5 h-5" /> Save Changes</>
          )}
        </button>
      </div>
    </form>
  );
}
