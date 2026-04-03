import { SignUp } from "@clerk/nextjs";
import { AuricaiLogo } from "@/components/ui/AuricaiLogo";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      {/* Brand header */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <AuricaiLogo size={48} className="text-white" />
        <span className="text-xl font-bold text-white tracking-tight">Auricai</span>
      </div>

      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "bg-[#111111] border border-white/10 shadow-xl",
          }
        }}
      />
    </div>
  );
}
