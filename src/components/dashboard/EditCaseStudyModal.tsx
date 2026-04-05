"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Edit3 } from "lucide-react";
import { apiPatch } from "@/lib/hooks/useSWR";
import toast from "react-hot-toast";
import type { CaseStudy } from "@/types";

interface EditCaseStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  caseStudy: CaseStudy | null;
}

export function EditCaseStudyModal({ isOpen, onClose, onSuccess, caseStudy }: EditCaseStudyModalProps) {
  const [formData, setFormData] = useState({
    company_name: "",
    headline: "",
    metric_type: "",
    before_value: "",
    after_value: "",
    timeframe: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (caseStudy && isOpen) {
      setFormData({
        company_name: caseStudy.company_name || "",
        headline: caseStudy.headline || "",
        metric_type: caseStudy.metric_type || "",
        before_value: caseStudy.before_value || "",
        after_value: caseStudy.after_value || "",
        timeframe: caseStudy.timeframe || "",
      });
    }
  }, [caseStudy, isOpen]);

  if (!isOpen || !caseStudy) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim() || saving) return;

    setSaving(true);

    try {
      const result = await apiPatch(`/api/case-studies/${caseStudy.id}`, {
        ...formData,
        company_name: formData.company_name.trim(),
        headline: formData.headline.trim() || undefined,
        metric_type: formData.metric_type.trim() || undefined,
        before_value: formData.before_value.trim() || undefined,
        after_value: formData.after_value.trim() || undefined,
        timeframe: formData.timeframe.trim() || undefined,
      });

      if (result.success) {
        toast.success("Case study updated successfully");
        onClose();
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to update case study");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5">
              <Edit3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Case Study</h2>
              <p className="text-xs text-zinc-500">Update company & metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="edit-cs-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Main Metric
                </label>
                <input
                  type="text"
                  value={formData.metric_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, metric_type: e.target.value }))}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                Headline
              </label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Before Value
                </label>
                <input
                  type="text"
                  value={formData.before_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, before_value: e.target.value }))}
                  placeholder="e.g. $10k/mo"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  After Value
                </label>
                <input
                  type="text"
                  value={formData.after_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, after_value: e.target.value }))}
                  placeholder="e.g. $50k/mo"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Timeframe
                </label>
                <input
                  type="text"
                  value={formData.timeframe}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeframe: e.target.value }))}
                  placeholder="e.g. 3 months"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-white/5 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            form="edit-cs-form"
            type="submit"
            disabled={!formData.company_name.trim() || saving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all bg-white hover:bg-zinc-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
