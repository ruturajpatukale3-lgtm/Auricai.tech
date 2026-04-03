"use client";

import { useState } from "react";
import { X, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { apiDelete } from "@/lib/hooks/useSWR";
import toast from "react-hot-toast";
import type { CaseStudy } from "@/types";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  caseStudy: CaseStudy | null;
}

export function DeleteConfirmModal({ isOpen, onClose, onSuccess, caseStudy }: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !caseStudy) return null;

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);

    try {
      const result = await apiDelete(`/api/case-studies/${caseStudy.id}`);

      if (result.success) {
        toast.success("Case study deleted");
        onClose();
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to delete case study");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !deleting) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#111111] border border-red-500/20 rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Delete Case Study?</h2>
            <p className="text-sm text-zinc-400">
              Are you sure you want to delete <span className="text-white font-medium">{caseStudy.company_name}</span>? This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full pt-4">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
