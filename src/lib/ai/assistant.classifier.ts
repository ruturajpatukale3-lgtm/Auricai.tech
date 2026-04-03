// ═══════════════════════════════════════════════════════════
// Auricai — Assistant Classifier
// Lightweight keyword-based intent guard to bypass LLM for certainty.
// ═══════════════════════════════════════════════════════════

export type AssistantAction = {
  label: string;
  route: string;
};

export type AssistantResponse = {
  type: "how_to" | "feature" | "policy" | "feedback" | "other";
  message: string;
  actions: AssistantAction[];
};

export const AssistantClassifier = {
  /**
   * Evaluates the message for predefined high-confidence responses.
   * Returns a complete response if matched, or null to proceed to LLM.
   */
  classify(message: string): AssistantResponse | null {
    const input = message.toLowerCase().trim();

    // 1. SEND INTERVIEW
    if (input.includes("send interview") || input.includes("invite client")) {
      return {
        type: "how_to",
        message: "You can send a new interview from the Interviews tab. Click the 'Send New' button to get started.",
        actions: [{ label: "Go to Interviews", route: "/dashboard/interviews" }],
      };
    }

    // 2. CASE STUDY
    if (input.includes("case study") || input.includes("create study")) {
      return {
        type: "feature",
        message: "Case studies are automatically generated once your client completes an interview. You can view and edit them in your Dashboard.",
        actions: [{ label: "View Case Studies", route: "/dashboard/case-studies" }],
      };
    }

    // 3. BILLING / LIMITS
    if (input.includes("billing") || input.includes("limit") || input.includes("pricing")) {
      return {
        type: "policy",
        message: "Your current usage and plan details are available in the Settings. You get 10 free interviews on the Starter plan.",
        actions: [{ label: "Check Plan Status", route: "/dashboard/settings" }],
      };
    }

    // 4. HUBSPOT
    if (input.includes("hubspot") || input.includes("crm")) {
      return {
        type: "feature",
        message: "You can push published case studies directly to HubSpot deals. First, make sure your HubSpot account is connected in Settings.",
        actions: [{ label: "Connect HubSpot", route: "/dashboard/settings" }],
      };
    }

    // 5. ANALYTICS
    if (input.includes("analytics") || input.includes("pipeline") || input.includes("revenue")) {
      return {
        type: "feature",
        message: "The Dashboard provides real-time analytics on your attributed pipeline and closed-won revenue generated from your case studies.",
        actions: [{ label: "Go to Dashboard", route: "/dashboard" }],
      };
    }

    // 6. FEEDBACK TRIGGERS
    if (input.includes("not working") || input.includes("confusing") || input.includes("bug") || input.includes("help me")) {
      return {
        type: "feedback",
        message: "I'm sorry to hear that. I've noted your feedback. Do you want to submit a formal message to our team?",
        actions: [{ label: "Send Feedback", route: "#feedback" }],
      };
    }

    // No high-confidence match
    return null;
  },
};
