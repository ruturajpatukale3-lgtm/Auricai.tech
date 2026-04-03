"use client";

import { useSubscription } from "@/context/SubscriptionContext";
import { AlertCircle, Clock, CreditCard, ArrowRight } from "lucide-react";
import Link from "next/link";

export function SubscriptionBanner() {
  const { 
    paymentStatus, 
    nextPlan, 
    trialEnd, 
    currentPeriodEnd,
    planType,
    showPaywall,
    accessBlocked,
    isLifetime,
    isAtLimit,
    interviewsLimit,
  } = useSubscription();

  // 0a. Free plan at limit (highest priority — hard block)
  if (isLifetime && isAtLimit) {
    return (
      <div className="bg-purple-500/10 border-b border-purple-500/20 px-6 py-3 flex items-center justify-between text-purple-300 text-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <p>
            <span className="font-bold">Free plan limit reached.</span>{" "}
            You&apos;ve used all {interviewsLimit} lifetime interviews. Upgrade to send more.
          </p>
        </div>
        <button
          onClick={() => showPaywall()}
          className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-purple-700 transition-colors"
        >
          Upgrade <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // 0. Account Blocked / Refunded (Highest Priority)
  if (accessBlocked || paymentStatus === "refunded") {
    const isRefund = paymentStatus === "refunded";

    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center justify-between text-red-500 text-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <p>
            <span className="font-bold">Account Blocked.</span> {isRefund ? "Your refund has been processed. Contact support to re-subscribe." : "Your account access has been restricted."}
          </p>
        </div>
        <Link 
          href="mailto:support@auricai.com"
          className="text-xs font-bold underline hover:text-red-400 decoration-red-500/40 transition-colors"
        >
          Contact Support
        </Link>
      </div>
    );
  }

  // 1. Payment Past Due
  if (paymentStatus === "past_due") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center justify-between text-red-500 text-sm animate-pulse">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          <p>
            <span className="font-bold">Payment required.</span> Your subscription renewal failed. Please update your payment method to avoid service interruption.
          </p>
        </div>
        <button 
          onClick={() => showPaywall()}
          className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-red-600 transition-colors"
        >
          Update Payment <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // 2. Trial Ending
  if (trialEnd) {
    const end = new Date(trialEnd);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      return (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-3 flex items-center justify-between text-blue-400 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <p>
              Your trial ends in <span className="font-bold">{diffDays === 0 ? "today" : `${diffDays} days`}</span>. Upgrade now to keep your premium features.
            </p>
          </div>
          <button 
            onClick={() => showPaywall()}
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            Choose Plan <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      );
    }
  }

  // 3. Scheduled Downgrade
  if (nextPlan && currentPeriodEnd) {
    const end = new Date(currentPeriodEnd).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between text-amber-500 text-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <p>
            Your plan will change to <span className="font-bold capitalize">{nextPlan}</span> on <span className="font-bold">{end}</span>.
          </p>
        </div>
        <button 
          onClick={() => showPaywall()}
          className="text-xs font-bold underline hover:text-amber-400 decoration-amber-500/40 transition-colors"
        >
          Keep current plan
        </button>
      </div>
    );
  }

  return null;
}
