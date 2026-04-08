/**
 * Auricai Landing Page — Production entry point.
 * Assembles all sections in order. Each section is lazy-loaded below fold.
 * No placeholder content. Every pixel is intentional.
 */

import dynamic from "next/dynamic";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";

export const revalidate = 0; // Force-refresh static cache for live pricing update

// Lazy load below-fold sections for performance
const LogoMarquee = dynamic(() => import("@/components/landing/LogoMarquee"));
const ProblemAgitation = dynamic(() => import("@/components/landing/ProblemAgitation"));
const HowItWorks = dynamic(() => import("@/components/landing/HowItWorks"));
const FeatureDeepDive = dynamic(() => import("@/components/landing/FeatureDeepDive"));
const ProofCenterPreview = dynamic(() => import("@/components/landing/ProofCenterPreview"));
const Pricing = dynamic(() => import("@/components/landing/Pricing"));
const FinalCTA = dynamic(() => import("@/components/landing/FinalCTA"));
const Footer = dynamic(() => import("@/components/landing/Footer"));

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <LogoMarquee />
      <ProblemAgitation />
      <HowItWorks />
      <FeatureDeepDive />
      <ProofCenterPreview />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}
