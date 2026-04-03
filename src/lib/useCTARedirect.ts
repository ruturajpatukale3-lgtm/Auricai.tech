"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * useCTARedirect — Global auth-gated CTA handler.
 * If signed in: Redirect to /dashboard.
 * If signed out: Redirect to /sign-up.
 */
export function useCTARedirect() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleCTA = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isLoaded || isRedirecting) return;

    setIsRedirecting(true);

    try {
      if (!isSignedIn) {
        router.push("/sign-up");
      } else {
        router.push("/dashboard/command-center");
      }
    } catch (error) {
      console.error("CTA Redirect failed:", error);
      setIsRedirecting(false);
    }
  };

  return { handleCTA, isRedirecting, isSignedIn, isLoaded };
}
