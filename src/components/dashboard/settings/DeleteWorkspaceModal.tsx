"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, Loader2, X, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const CONFIRM_WORD = "DELETE";

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgName: string;
}

export function DeleteWorkspaceModal({ isOpen, onClose, orgName }: DeleteWorkspaceModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [stage, setStage] = useState<"confirm" | "processing" | "done">("confirm");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isConfirmed = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmText("");
      setStage("confirm");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleDelete = useCallback(async () => {
    if (!isConfirmed || isPending) return;
    setIsPending(true);
    setStage("processing");

    try {
      const res = await fetch("/api/org/delete", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete workspace");
      }

      setStage("done");

      // Brief pause to show success state, then redirect
      setTimeout(() => {
        toast.success("Workspace deleted. Redirecting...");
        router.push("/");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
      setStage("confirm");
    } finally {
      setIsPending(false);
    }
  }, [isConfirmed, isPending, router]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, isPending, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={!isPending ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md mx-4 bg-[#0A0A0A] border border-red-500/20 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.1)] overflow-hidden"
          >
            {/* Top danger stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-orange-500" />

            {/* Content */}
            <div className="p-6">
              {stage === "done" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-8 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                    <Trash2 className="w-7 h-7 text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Workspace Deleted</h3>
                  <p className="text-sm text-zinc-500">Redirecting you now...</p>
                </motion.div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">Delete Workspace</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">This action is irreversible</p>
                      </div>
                    </div>
                    {!isPending && (
                      <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Warning block */}
                  <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 mb-6">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2 text-sm">
                        <p className="text-red-300 font-semibold">
                          You are about to permanently delete &ldquo;{orgName}&rdquo;.
                        </p>
                        <ul className="text-red-400/80 space-y-1 text-xs list-disc pl-4">
                          <li>All interviews, case studies, and analytics will be erased</li>
                          <li>All team members will lose access immediately</li>
                          <li>Your active subscription will be cancelled</li>
                          <li>Data will be permanently purged after 7 days</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation input */}
                  <div className="space-y-2 mb-6">
                    <label className="text-sm font-medium text-zinc-400">
                      Type <span className="font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded text-xs">{CONFIRM_WORD}</span> to confirm
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      disabled={isPending}
                      placeholder="Type DELETE here..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 font-mono tracking-widest focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all disabled:opacity-40"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClose}
                      disabled={isPending}
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={!isConfirmed || isPending}
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
