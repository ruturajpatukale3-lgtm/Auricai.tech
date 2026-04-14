import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/services/auth.service";
import { CaseStudyRepository } from "@/lib/repositories/case-study.repository";
import EditCaseStudyClient from "./EditCaseStudyClient";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Edit Case Study | Auricai",
};

export default async function EditCaseStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await AuthService.getOrgIdForUser(userId);
  if (!orgId) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white/50" /></div>}>
        <EditCaseStudyLoader orgId={orgId} id={id} />
      </Suspense>
    </div>
  );
}

async function EditCaseStudyLoader({ orgId, id }: { orgId: string, id: string }) {
  const study = await CaseStudyRepository.findById(orgId, id);
  if (!study) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold mb-2">Case Study Not Found</h1>
        <p className="text-zinc-500 mb-6">The case study you are looking for does not exist or you don't have access.</p>
        <a href="/dashboard/case-studies" className="bg-white text-black px-6 py-3 rounded-lg font-bold">Go Back to Dashboard</a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Editor</h1>
          <p className="text-zinc-400">Refine the case study narrative and data.</p>
        </div>
        <a href="/dashboard/case-studies" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
          ← Back to Dashboard
        </a>
      </div>
      <EditCaseStudyClient initialData={study} />
    </div>
  );
}
