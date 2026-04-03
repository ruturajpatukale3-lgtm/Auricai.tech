"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSubscription } from "@/context/SubscriptionContext";
import toast from "react-hot-toast";

/**
 * Detects ?checkout=success in the URL after Paddle redirect.
 * Uses refreshWithRetry to poll until the webhook has updated the DB,
 * then shows a success toast and cleans up the URL.
 */
export function CheckoutSuccessHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshWithRetry } = useSubscription();
  const hasHandled = useRef(false);

  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success" && !hasHandled.current) {
      hasHandled.current = true;

      // Show a "processing" toast immediately
      const toastId = toast.loading("Processing your payment...", {
        style: {
          background: "#1C1C1C",
          color: "#FAFAFA",
          border: "1px solid rgba(255,255,255,0.1)",
        },
      });

      // Poll until webhook has synced the new plan
      refreshWithRetry().then((planChanged) => {
        toast.dismiss(toastId);

        if (planChanged) {
          toast.success("🎉 Payment successful! Your plan has been upgraded.", {
            duration: 5000,
            style: {
              background: "#1C1C1C",
              color: "#FAFAFA",
              border: "1px solid rgba(34,197,94,0.3)",
            },
            iconTheme: { primary: "#22C55E", secondary: "#FAFAFA" },
          });
        } else {
          // Webhook may still be processing — show a softer message
          toast.success("Payment received! Your plan will update shortly.", {
            duration: 5000,
            style: {
              background: "#1C1C1C",
              color: "#FAFAFA",
              border: "1px solid rgba(59,130,246,0.3)",
            },
            iconTheme: { primary: "#3B82F6", secondary: "#FAFAFA" },
          });
        }
      });

      // Clean up URL (remove ?checkout=success)
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, refreshWithRetry, router]);

  return null;
}
