"use client";

import { useState, useEffect, useMemo } from "react";
import { DeleteWorkspaceModal } from "./DeleteWorkspaceModal";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Palette,
  Globe,
  Users,
  CreditCard,
  BarChart3,
  AlertTriangle,
  Upload,
  Check,
  Shield,
  Crown,
  Loader2,
  ExternalLink,
  Copy,
  RefreshCw,
  Trash2,
  Plus,
  ChevronRight,
  Plug,
  Sparkles,
  Mail,
  AlertCircle,
  Activity,
  Calendar,
} from "lucide-react";
import { useSubscription, type PlanType } from "@/context/SubscriptionContext";
import { FEATURES } from "@/lib/config/features";

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
type TabId = "general" | "business" | "branding" | "domain" | "team" | "billing" | "usage" | "integrations" | "legal" | "danger";

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color?: string;
}

const tabs: TabItem[] = [
  { id: "general", label: "General", icon: Building2 },
  { id: "business", label: "Business Profile", icon: Sparkles },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "domain", label: "Custom Domain", icon: Globe },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "usage", label: "Usage", icon: BarChart3 },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "legal", label: "Legal & Policies", icon: Shield },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, color: "text-red-400" },
];

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const info = await res.json().catch(() => ({}));
      console.error(`[SWR Fetch Error] ${url}:`, res.status, info);
      throw new Error(info.error || "Failed to fetch data");
    }
    return res.json();
  } catch (err) {
    console.error(`[SWR Network Error] ${url}:`, err);
    throw err;
  }
};

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════
function SettingsCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-[#111111] border border-white/10 rounded-xl p-6 hover:border-white/[0.15] transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
      {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
    </div>
  );
}

function InputField({
  name,
  label,
  placeholder,
  value,
  type = "text",
  disabled = false,
  mono = false,
}: {
  name?: string;
  label: string;
  placeholder: string;
  value?: string;
  type?: string;
  disabled?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      <input
        type={type}
        name={name || label.toLowerCase().replace(/\s+/g, "")}
        placeholder={placeholder}
        defaultValue={value}
        disabled={disabled}
        className={`w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${mono ? "font-mono text-xs" : ""
          }`}
      />
    </div>
  );
}

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-white text-black px-5 py-2 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      Save Changes
    </button>
  );
}

// ═══════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════
function GeneralSection({ org, mutate }: { org: any, mutate: any }) {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save settings");
      toast.success("Settings saved");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="General Settings" description="Core configuration for your Auricai workspace." />
      <SettingsCard>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Company Name" name="name" placeholder="Acme Inc." value={org?.name || ""} />
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Industry</label>
              <select name="industry" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white appearance-none focus:outline-none transition-all cursor-pointer">
                <option value="saas">SaaS</option>
                <option value="fintech">FinTech</option>
                <option value="healthcare">Healthcare</option>
                <option value="ecommerce">E-Commerce</option>
              </select>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
            <SaveButton pending={isPending} />
          </div>
        </form>
      </SettingsCard>
    </motion.div>
  );
}

// ═══════════════════════════════════════
// BUSINESS PROFILE SECTION
// ═══════════════════════════════════════
const INDUSTRY_OPTIONS = [
  { value: "marketing_agency", label: "Marketing Agency" },
  { value: "saas", label: "SaaS" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

function BusinessProfileSection({ orgProfile, mutate }: { orgProfile: any; mutate: any }) {
  const [industry, setIndustry] = useState(orgProfile?.industry || "");
  const [customIndustry, setCustomIndustry] = useState(orgProfile?.industry_raw || "");
  const [serviceCategory, setServiceCategory] = useState(orgProfile?.service_category || "");
  const [serviceType, setServiceType] = useState(orgProfile?.service_type || "");
  const [targetCustomer, setTargetCustomer] = useState(orgProfile?.target_customer || "");
  const [isPending, setIsPending] = useState(false);

  // Sync when SWR refetches
  useEffect(() => {
    if (orgProfile) {
      setIndustry(orgProfile.industry || "");
      setCustomIndustry(orgProfile.industry_raw || "");
      setServiceCategory(orgProfile.service_category || "");
      setServiceType(orgProfile.service_type || "");
      setTargetCustomer(orgProfile.target_customer || "");
    }
  }, [orgProfile]);

  const hasChanges = useMemo(() => {
    if (!orgProfile) return true; // New profile — always allow save
    return (
      industry !== (orgProfile.industry || "") ||
      customIndustry !== (orgProfile.industry_raw || "") ||
      serviceCategory !== (orgProfile.service_category || "") ||
      serviceType !== (orgProfile.service_type || "") ||
      targetCustomer !== (orgProfile.target_customer || "")
    );
  }, [industry, customIndustry, serviceCategory, serviceType, targetCustomer, orgProfile]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hasChanges) return;
    setIsPending(true);

    try {
      const res = await fetch("/api/org-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          ...(industry === "other" ? { custom_industry: customIndustry } : {}),
          service_category: serviceCategory,
          service_type: serviceType,
          target_customer: targetCustomer,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update business profile");
      }
      toast.success("Business profile updated");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle
        title="Business Profile"
        description="This context powers all AI-generated case studies, testimonials, and outreach."
      />

      {/* AI Impact Warning */}
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl px-5 py-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-300">Changes affect AI output</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Updating your business profile will change how AI generates case studies, interview questions, and outreach messaging.
            Keep this accurate for the best results.
          </p>
        </div>
      </div>

      <SettingsCard>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Industry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all cursor-pointer"
                >
                  <option value="" disabled>Select industry…</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Industry (shown only when "other" is selected) */}
              {industry === "other" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Specify Industry</label>
                  <input
                    type="text"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    placeholder="e.g. Real Estate Tech"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Service Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Service Category</label>
              <input
                type="text"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                placeholder="e.g. Paid social advertising for healthcare"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
              <p className="text-xs text-zinc-600">Be specific — this helps AI tailor case study language.</p>
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Service Description</label>
              <textarea
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder="e.g. We run full-funnel Facebook and Instagram ad campaigns for dental clinics, focusing on new patient acquisition."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
              />
              <p className="text-xs text-zinc-600">Describe what you do in detail — the AI uses this for context.</p>
            </div>

            {/* Target Customer */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Target Customer</label>
              <input
                type="text"
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                placeholder="e.g. Mid-market dental practices with 5-20 locations"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
              <p className="text-xs text-zinc-600">Your ideal customer profile (ICP) — who benefits from your service.</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
            <p className="text-xs text-zinc-600">
              {!hasChanges ? "✓ Up to date" : "Unsaved changes"}
            </p>
            <button
              type="submit"
              disabled={isPending || !hasChanges}
              className="inline-flex items-center gap-2 bg-white text-black px-5 py-2 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </SettingsCard>
    </motion.div>
  );
}

function BrandingSection({ org, mutate }: { org: any, mutate: any }) {
  const [primaryColor, setPrimaryColor] = useState(org?.brand_color || "#2563EB");
  const [isPendingLogo, setIsPendingLogo] = useState(false);
  const [isPendingColor, setIsPendingColor] = useState(false);

  // Sync color state when org data updates from SWR
  useEffect(() => {
    if (org?.brand_color) {
      setPrimaryColor(org.brand_color);
    }
  }, [org?.brand_color]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPendingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/settings/branding", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      toast.success("Logo uploaded");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsPendingLogo(false);
    }
  }

  async function handleColorSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPendingColor(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_color: primaryColor }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Colors updated");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsPendingColor(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="Branding" description="Customize how your case studies appear to prospects." />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <SettingsCard>
            <h4 className="text-sm font-semibold text-white mb-4">Logo</h4>
            <div className="flex items-center gap-6">
              <label className="w-20 h-20 rounded-xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center hover:border-white/20 transition-colors cursor-pointer group relative overflow-hidden">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isPendingLogo} />
                {isPendingLogo ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                ) : org?.logo_url ? (
                  <img src={org.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <Upload className="w-6 h-6 text-zinc-600 group-hover:text-white" />
                )}
              </label>
              <div>
                <p className="text-sm text-zinc-400">Upload your company logo</p>
                <p className="text-xs text-zinc-600 mt-1">SVG, PNG, or JPG • Max 2MB</p>
              </div>
            </div>
          </SettingsCard>
          <SettingsCard>
            <form onSubmit={handleColorSave}>
              <h4 className="text-sm font-semibold text-white mb-4">Colors</h4>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Primary Color</label>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full max-w-sm">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-sm font-mono text-zinc-300">{primaryColor}</span>
                  </div>
                </div>
                <div className="flex justify-end"><SaveButton pending={isPendingColor} /></div>
              </div>
            </form>
          </SettingsCard>
        </div>
        <div className="lg:col-span-2">
          <SettingsCard className="h-full">
            <h4 className="text-sm font-semibold text-white mb-4">Live Preview</h4>
            <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "linear-gradient(135deg, #0A0A0A, #111111)" }}>
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                {org?.logo_url ? (
                  <img src={org.logo_url} className="w-8 h-8 rounded object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: primaryColor }}>{org?.name ? org.name[0] : "A"}</div>
                )}
                <div><p className="text-xs font-semibold text-white">{org?.name || "Acme Inc."}</p><p className="text-[10px] text-zinc-500">Case Study</p></div>
              </div>
              <div className="p-4 flex gap-2"><div className="h-1.5 rounded-full w-16" style={{ background: primaryColor }} /></div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </motion.div>
  );
}

function DomainSection({ domain, mutate }: { domain: any, mutate: any }) {
  const [inputDomain, setInputDomain] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!inputDomain.trim()) return;
    setIsPending(true);
    try {
      const res = await fetch("/api/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: inputDomain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add domain");
      toast.success("Domain added! Please configure your DNS.");
      setInputDomain("");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to add domain");
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerify() {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/domain/verify", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      toast.success("Domain verified successfully!");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "DNS records not detected yet.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Remove custom domain? This will immediately break any existing links using this domain.")) return;
    setIsRemoving(true);
    try {
      const res = await fetch("/api/domain", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Removal failed");
      toast.success("Domain removed");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove domain");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="Custom Domain" description="Serve your case studies from your own domain for maximum trust." />
      <SettingsCard>
        {!domain ? (
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Domain Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="proof.yourcompany.com"
                  value={inputDomain}
                  onChange={(e) => setInputDomain(e.target.value)}
                  disabled={isPending}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50"
                  required
                />
                <button
                  type="submit"
                  disabled={isPending || !inputDomain}
                  className="flex-shrink-0 bg-white text-black px-4 py-2 font-bold text-sm rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-500">We recommend using a subdomain like verify.*, proof.*, or cases.*</p>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-bold text-white tracking-wide">{domain.domain}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Status: <span className={domain.status === "verified" ? "text-green-400" : "text-amber-400"}>{domain.status.toUpperCase()}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="text-xs text-red-400 hover:text-red-300 transition-colors bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-md font-medium flex items-center gap-2"
              >
                {isRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Remove
              </button>
            </div>

            {domain.status === "pending" && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <h4 className="text-sm font-bold text-amber-500 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> DNS Setup Required
                  </h4>
                  <p className="text-xs text-amber-500/80 mb-4">
                    Please add the following CNAME record to your domain's DNS settings to verify ownership and route traffic. 
                    It can take up to 24 hours to propagate globally.
                  </p>
                  
                  <div className="bg-[#0A0A0A] border border-white/10 rounded overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white/5 text-zinc-400 border-b border-white/10">
                        <tr>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Value / Target</th>
                        </tr>
                      </thead>
                      <tbody className="text-zinc-300">
                        <tr>
                          <td className="px-3 py-3 border-r border-white/5">CNAME</td>
                          <td className="px-3 py-3 border-r border-white/5">{domain.domain.split('.')[0]}</td>
                          <td className="px-3 py-3 font-mono text-blue-400">cname.vercel-dns.com</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Connection"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </SettingsCard>
    </motion.div>
  );
}

function TeamSection({ team, limit, mutate }: { team: any[], limit: number, mutate: any }) {
  const [isPending, setIsPending] = useState(false);

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "editor" }), // Hardcoded role for default invites to match constraints
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to invite");
      toast.success("Member invited");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Invite Failed");
    } finally {
      setIsPending(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Member removed");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed removing member");
    }
  }

  const activeSeats = team?.length || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="Team Members" description="Manage who has access to your workspace." />
      <SettingsCard>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <p className="text-sm text-zinc-500">
            <span className="text-white font-semibold">{activeSeats}</span> of{" "}
            <span className="text-white font-semibold">{limit > 1000 ? 'Unlimited' : limit}</span> seats used
          </p>
          <form className="flex gap-2 w-full sm:w-auto" onSubmit={handleInvite}>
            <input name="email" type="email" placeholder="colleague@acme.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white" required />
            <button type="submit" disabled={isPending || activeSeats >= limit} className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-lg text-sm transition-all hover:bg-white/20 disabled:opacity-50">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Invite
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-500 uppercase">
                <th className="pb-3 text-xs font-medium">Member</th>
                <th className="pb-3 text-xs font-medium">Role</th>
                <th className="pb-3 text-right text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {team?.map((member) => (
                <tr key={member.id} className="group">
                  <td className="py-4">
                    <p className="text-white font-medium">{member.email}</p>
                  </td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/5 text-zinc-400 border border-white/10">
                      {member.role === "owner" && <Crown className="w-3 h-3 mr-1" />}
                      {member.role}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    {member.role !== "owner" && (
                      <button onClick={() => handleRemove(member.id)} className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>
    </motion.div>
  );
}

function BillingSection() {
  const { planType, paymentStatus, currentPeriodEnd, nextPlan } = useSubscription();
  const [upgrading, setUpgrading] = useState(false);
  const planName = planType;
  const status = paymentStatus;

  const PLAN_ORDER: PlanType[] = ["free", "trial", "starter", "growth", "enterprise"];
  const currentIdx = PLAN_ORDER.indexOf(planName);

  // Determine the next upgrade target
  const nextUpgradePlan = (() => {
    if (planName === "enterprise") return null;
    if (planName === "free" || planName === "trial") return "starter";
    if (planName === "starter") return "growth";
    if (planName === "growth") return "enterprise";
    return null;
  })();

  async function handleUpgrade() {
    if (!nextUpgradePlan || upgrading) return;
    setUpgrading(true);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: nextUpgradePlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      if (data.data?.checkout_url) {
        window.location.href = data.data.checkout_url;
        return;
      }
      if (data.data?.action === "subscription_updated") {
        toast.success(data.data.message || "Plan updated!");
        window.location.href = data.data.redirect_url || "/dashboard?checkout=success";
        return;
      }
      throw new Error("No checkout URL received");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="Billing & Subscription" description="Manage your plan, payment method, and invoices." />
      <SettingsCard>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white capitalize">{planName} Plan</h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {status}
                </span>
              </div>
              {currentPeriodEnd && <p className="text-sm text-zinc-500 mt-0.5">Renews {new Date(currentPeriodEnd).toLocaleDateString()}</p>}
              {nextPlan && (
                <p className="text-xs text-amber-400 mt-1">
                  Scheduled change to <span className="font-bold capitalize">{nextPlan}</span> at end of cycle
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentIdx > 2 && (
              <button
                className="text-sm font-medium text-zinc-400 hover:text-white border border-white/10 px-4 py-2 rounded-lg transition-colors"
                onClick={() => {
                  const el = document.getElementById("pricing");
                  if (el) { el.scrollIntoView({ behavior: "smooth" }); }
                  else { window.location.href = "/#pricing"; }
                }}
              >
                Change Plan
              </button>
            )}
            {nextUpgradePlan && (
              <button
                className="text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                disabled={upgrading}
                onClick={handleUpgrade}
              >
                {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Upgrade to {nextUpgradePlan.charAt(0).toUpperCase() + nextUpgradePlan.slice(1)}
              </button>
            )}
          </div>
        </div>
      </SettingsCard>
    </motion.div>
  );
}

import { getPlanLimits } from "@/lib/plans";

function UsageSection() {
  const { 
    interviewsUsed, 
    interviewsLimit, 
    lifetimeInterviewsUsed,
    teamSeatsUsed, 
    teamSeatLimit, 
    usagePercent, 
    planType,
    currentPeriodEnd,
    isLifetime,
    isAtLimit,
    showPaywall,
    isLoading 
  } = useSubscription();

  if (isLoading) return <div className="text-zinc-500 animate-pulse bg-white/5 h-40 rounded-xl" />;

  const limits = getPlanLimits(planType as any);
  const isSoftUnlimited = limits?.isSoftUnlimited;

  const pct = (used: number, limit: number) => limit === 0 ? 0 : Math.min((used / limit) * 100, 100);

  const getColor = (percent: number) => {
    if (percent >= 100) return "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]";
    if (percent >= 90) return "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]";
    if (percent >= 70) return "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]";
    return "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]";
  };

  const bar = (label: string, icon: any, used: number, limit: number) => {
    const isUnlimited = limit === -1 || (label.toLowerCase().includes("interview") && isSoftUnlimited);
    const p = isUnlimited ? 0 : pct(used, limit);
    return (
      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 group hover:border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg text-zinc-400 group-hover:text-blue-400 transition-colors">
              {icon}
            </div>
            <span className="text-zinc-400 font-medium">{label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white">{used}</span>
            <span className="text-sm text-zinc-500">/ {isUnlimited ? "∞" : limit}</span>
          </div>
        </div>
        
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${p}%` }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full transition-colors duration-500 ${getColor(p)}`} 
          />
        </div>

        {p >= 90 && !isUnlimited && (
          <div className="mt-4 flex items-center gap-2 text-xs text-orange-400/80 animate-pulse">
            <AlertCircle size={14} />
            <span>Approaching limit. Consider upgrading for higher volume.</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <SectionTitle 
          title="Usage & Entitlements" 
          description="Resource consumption for your current monthly cycle." 
        />
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Current Plan</span>
          <span className="text-lg font-black text-blue-400 capitalize italic">{planType}</span>
        </div>
      </div>

      <div className="grid gap-6">
        {bar(
          isLifetime ? "Lifetime Interviews (Free plan)" : "Monthly Interviews",
          <Activity size={18} />,
          isLifetime ? lifetimeInterviewsUsed : interviewsUsed,
          interviewsLimit
        )}
        {bar("Team Member Seats", <Users size={18} />, teamSeatsUsed, teamSeatLimit)}
      </div>

      {/* Free plan at-limit block */}
      {isLifetime && isAtLimit && (
        <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-400">Free plan limit reached</p>
              <p className="text-xs text-zinc-500 mt-0.5">You&apos;ve used all 2 lifetime free interviews. Upgrade to unlock monthly interviews.</p>
            </div>
          </div>
          <button
            onClick={() => showPaywall("interviews", 2)}
            className="ml-auto flex-shrink-0 text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Upgrade Now
          </button>
        </div>
      )}

      <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
        <div className="flex items-center gap-2">
          {isLifetime ? (
            <>
              <AlertCircle size={16} className="text-zinc-500" />
              <span>Free plan — usage never resets</span>
            </>
          ) : (
            <>
              <Calendar size={16} />
              <span>Next reset: {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : "Loading..."}</span>
            </>
          )}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="hover:text-white transition-colors flex items-center gap-1 font-medium"
        >
          <RefreshCw size={14} />
          Sync Data
        </button>
      </div>
    </motion.div>
  );
}

function IntegrationsSection({ hubspotConnection, org, mutate }: { hubspotConnection?: any, org?: any, mutate?: any }) {
  const [ga4Id, setGa4Id] = useState(org?.ga4_measurement_id || "");
  const [isSavingGa4, setIsSavingGa4] = useState(false);

  async function handleSaveGa4(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingGa4(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ga4_measurement_id: ga4Id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed finding org");
      toast.success("GA4 Configuration Saved");
      if(mutate) mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSavingGa4(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="Integrations" description="Connect external systems to Auricai." />
      
      {/* Google Analytics */}
      <SettingsCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <span className="font-bold text-orange-500">GA4</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-0.5">Google Analytics</h4>
              <p className="text-sm text-zinc-400 max-w-sm">Track case study views and conversions directly in your GA4 property.</p>
            </div>
          </div>
          <form className="flex items-center gap-2 w-full md:w-auto" onSubmit={handleSaveGa4}>
            <input 
              type="text" 
              placeholder="G-XXXXXXXXXX" 
              value={ga4Id}
              onChange={(e) => setGa4Id(e.target.value)}
              disabled={isSavingGa4}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 w-40" 
            />
            <button 
              type="submit" 
              disabled={isSavingGa4 || ga4Id === org?.ga4_measurement_id}
              className="bg-white text-black px-4 py-2 text-sm font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isSavingGa4 ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </button>
          </form>
        </div>
      </SettingsCard>

      {/* HubSpot */}
      <SettingsCard>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FF7A59] border border-[#FF7A59]/20 flex items-center justify-center shadow-[0_0_15px_rgba(255,122,89,0.2)]">
              <span className="font-extrabold text-white text-lg tracking-tighter">HS</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-0.5">HubSpot CRM</h4>
              <p className="text-sm text-zinc-500">Read-only revenue attribution.</p>
            </div>
          </div>
          <div>
            {!hubspotConnection ? (
              <a href="/api/integrations/hubspot/connect" className="inline-flex items-center gap-2 bg-white text-black px-5 py-2 font-bold text-sm rounded-lg hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                Connect HubSpot
              </a>
            ) : (
              <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-4">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 font-bold tracking-wider uppercase">
                    Connected
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Last sync: {hubspotConnection.last_synced_at ? new Date(hubspotConnection.last_synced_at).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
                <a
                  href="/api/integrations/hubspot/connect"
                  className="bg-white/5 text-white border border-white/10 px-4 py-2 text-sm font-medium rounded-lg hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-zinc-400" />
                  Reconnect
                </a>
              </div>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* Meta Ads (Coming Soon) */}
      {FEATURES.metaAds && (
        <SettingsCard>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 opacity-60 pointer-events-none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-blue-500 border border-blue-500/20 flex items-center justify-center">
                <span className="font-bold text-white text-lg tracking-tighter">M</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white mb-0.5">Meta Ads (Pixel)</h4>
                  <span className="text-[10px] font-bold tracking-wider uppercase bg-white/10 px-2 py-0.5 rounded text-zinc-400 border border-white/10">Coming Soon</span>
                </div>
                <p className="text-sm text-zinc-500">Sync audience segments from case study viewers.</p>
              </div>
            </div>
            <div>
              <button disabled className="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-2 font-bold text-sm rounded-lg opacity-50 cursor-not-allowed">
                Connect Meta
              </button>
            </div>
          </div>
        </SettingsCard>
      )}

    </motion.div>
  );
}

function LegalSection() {
  const policies = [
    { name: "Privacy Policy", href: "/privacy-policy", description: "How we collect, use, and protect your data." },
    { name: "Terms of Service", href: "/terms", description: "Rules and guidelines for using the platform." },
    { name: "Security", href: "/security", description: "Our architecture and security posture." },
    { name: "GDPR", href: "/gdpr", description: "Data rights and compliance for EU users." },
    { name: "Cookies", href: "/cookies", description: "Transparency on how we use cookies." },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="Legal & Policies" description="Review our data handling practices and legal terms." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((policy) => (
          <SettingsCard key={policy.href} className="group cursor-pointer">
            <Link href={policy.href} target="_blank" className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {policy.name}
                </h4>
                <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-blue-400" />
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {policy.description}
              </p>
            </Link>
          </SettingsCard>
        ))}
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Privacy Inquiry</p>
            <p className="text-xs text-zinc-500">Have questions about your data?</p>
          </div>
        </div>
        <a href="mailto:privacy@auricai.tech" className="text-xs font-bold text-white hover:text-blue-400 transition-colors">
          Contact Privacy Team →
        </a>
      </div>
    </motion.div>
  );
}

function DangerSection({ orgName }: { orgName: string }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <SectionTitle title="Danger Zone" description="Irreversible actions. Proceed with caution." />
        <div className="rounded-xl border border-red-500/20 overflow-hidden">
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Delete Workspace</h4>
              <p className="text-sm text-zinc-500">
                Permanently delete <span className="text-white font-medium">&ldquo;{orgName}&rdquo;</span> and all associated data.
                This includes all interviews, case studies, analytics, team members, and your subscription.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 px-4 py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.25)]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Workspace
            </button>
          </div>
        </div>
      </motion.div>

      <DeleteWorkspaceModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        orgName={orgName}
      />
    </>
  );
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export function SettingsView({ initialOrg }: { initialOrg?: any }) {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { data, error, mutate } = useSWR("/api/settings", fetcher, {
    fallbackData: { org: initialOrg },
    revalidateOnFocus: true
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
        <p className="text-zinc-500 max-w-sm mb-8 text-sm">
          We couldn't connect to the dashboard API. Please check your internet connection and ensure the dev server is running locally.
        </p>
        <button
          onClick={() => mutate()}
          className="bg-white/10 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>
      </div>
    );
  }

  if (!data?.org && !initialOrg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-sm text-zinc-500">Initializing workspace...</p>
      </div>
    );
  }

  const { org, usage, team, domain, hubspotConnection, orgProfile, limits } = data.data || data; // handle generic wrappers

  const renderSection = () => {
    switch (activeTab) {
      case "general": return <GeneralSection org={org} mutate={mutate} />;
      case "business": return <BusinessProfileSection orgProfile={orgProfile} mutate={mutate} />;
      case "branding": return <BrandingSection org={org} mutate={mutate} />;
      case "domain": return <DomainSection domain={domain} mutate={mutate} />;
      case "team": return <TeamSection team={team} limit={limits?.teamSeats || 1} mutate={mutate} />;
      case "billing": return <BillingSection />;
      case "usage": return <UsageSection />;
      case "integrations": return <IntegrationsSection hubspotConnection={hubspotConnection} org={org} mutate={mutate} />;
      case "legal": return <LegalSection />;
      case "danger": return <DangerSection orgName={org?.name || "this workspace"} />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
      <div className="mb-8 mt-2">
        <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500">Manage your workspace, brand, team, and billing.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <nav className="lg:w-56 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isDanger = tab.id === "danger";
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${isActive ? (isDanger ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-white/10 text-white") : (isDanger ? "text-red-400/60 hover:bg-red-500/5" : "text-zinc-500 hover:text-white hover:bg-white/5")
                    }`}
                >
                  <tab.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? (isDanger ? "text-red-400" : "text-white") : (isDanger ? "text-red-400/60" : "text-zinc-600")}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
        <div className="flex-1 min-w-0 max-w-3xl">
          <AnimatePresence mode="wait">
            <div key={activeTab}>{renderSection()}</div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
