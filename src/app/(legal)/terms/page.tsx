import React from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LEGAL_CONFIG } from "@/lib/config/legal";

export const metadata = {
  title: "Terms of Service | Auricai",
  description: "Guidelines and legal terms for using the Auricai platform.",
};

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "service-description", title: "Service Description" },
  { id: "account-responsibility", title: "Account Responsibility" },
  { id: "acceptable-use", title: "Acceptable Use" },
  { id: "billing", title: "Subscription and Billing" },
  { id: "refund-policy", title: "Refund Policy" },
  { id: "trial-usage", title: "Trial Usage" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "user-content", title: "User Content Ownership" },
  { id: "ai-liability", title: "AI Liability & Outputs" },
  { id: "security-limitation", title: "Security Limitation" },
  { id: "availability", title: "Service Availability" },
  { id: "termination", title: "Termination" },
  { id: "warranty", title: "Warranty Disclaimer" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The rules of the road for building trust with Auricai."
      sections={sections}
    >
      <section id="acceptance">
        <p>
          By creating an account or using {LEGAL_CONFIG.companyName}, you agree to these Terms of Service. Please read them carefully-they constitute a binding legal agreement between you and {LEGAL_CONFIG.companyName}.
        </p>
      </section>

      <section id="service-description">
        <h2>Service Description</h2>
        <p>
          {LEGAL_CONFIG.companyName} is an AI-powered case study and client insight platform. We provide tools for interviewing clients, generating structured narratives, and sharing those results to drive sales outcomes.
        </p>
      </section>

      <section id="account-responsibility">
        <h2>Account Responsibility</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
        </p>
      </section>

      <section id="acceptable-use">
        <h2>Acceptable Use</h2>
        <p>We believe in ethical AI. You agree not to use the service to:</p>
        <ul>
          <li>Misrepresent business results or generate fraudulent case studies.</li>
          <li>Scrape or reverse-engineer the {LEGAL_CONFIG.companyName} engine.</li>
          <li>Distribute malicious content or interfere with the platform's stability.</li>
          <li>Submit data or content that you do not have the legal right to share.</li>
        </ul>
      </section>

      <section id="billing">
        <h2>Subscription and Billing</h2>
        <p>
          Subscriptions are billed in advance on a recurring monthly or annual basis. Prices are based on your selected plan's interview limits and feature access. All payments are processed via Paddle, our merchant of record.
        </p>
      </section>

      <section id="refund-policy">
        <h2>Refund Policy</h2>
        <p>
          Due to the high computational costs of our AI features, we do not generally offer refunds for historical usage. However, you can cancel your subscription at any time to prevent future billing.
        </p>
      </section>

      <section id="trial-usage">
        <h2>Trial Usage</h2>
        <p>
          If you are on a free trial or hobby plan, {LEGAL_CONFIG.companyName} reserves the right to limit access to premium features or terminate the trial at its discretion.
        </p>
      </section>

      <section id="intellectual-property">
        <h2>Intellectual Property</h2>
        <p>
          The {LEGAL_CONFIG.companyName} platform, including all software, logos, and UI designs, is the property of {LEGAL_CONFIG.companyName} or its licensors. You are granted a limited, non-exclusive license to use the service.
        </p>
      </section>

      <section id="user-content">
        <h2>User Content Ownership</h2>
        <p>
          <strong>You own your data.</strong> You retain all ownership rights to the business information, client interview answers, and case studies generated on the platform. By using {LEGAL_CONFIG.companyName}, you grant us a license to process this data solely to provide and improve the service for your organization.
        </p>
      </section>

      <section id="ai-liability">
        <h2>AI Liability & Outputs</h2>
        <p>
          {LEGAL_CONFIG.companyName} uses advanced Artificial Intelligence to generate content. You acknowledge and agree that:
        </p>
        <ul>
          <li><strong>No Guarantee</strong>: AI outputs are provided "as is". We do not guarantee the accuracy, completeness, or suitability of any generated case study, testimonial, or insight.</li>
          <li><strong>User Responsibility</strong>: You are 100% responsible for reviewing, editing, and verifying any content before it is published or shared with third parties.</li>
          <li><strong>Hallucinations</strong>: You understand that AI can occasionally produce "hallucinations" (factually incorrect or nonsensical text).</li>
        </ul>
      </section>

      <section id="security-limitation">
        <h2>Security Limitation</h2>
        <p>
          While we employ industry-standard encryption, multi-tenant isolation, and proactive monitoring, you acknowledge that **no method of transmission over the Internet or electronic storage is 100% secure.** We cannot guarantee absolute security against all potential threats.
        </p>
      </section>

      <section id="availability">
        <h2>Service Availability</h2>
        <p>
          While we strive for 99.9% uptime, we do not guarantee that the service will be uninterrupted or error-free. Maintenance windows and unforeseen technical issues may occur.
        </p>
      </section>

      <section id="termination">
        <h2>Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account if you violate these terms or fail to pay subscription fees. Upon termination, your right to use the service ceases immediately.
        </p>
      </section>

      <section id="warranty">
        <h2>Warranty Disclaimer</h2>
        <p>
          <strong>{LEGAL_CONFIG.companyName} is provided "as is".</strong> We do not guarantee specific business outcomes, revenue increases, or the absolute accuracy of AI-generated content. You are responsible for reviewing and verifying all generated case studies before publication.
        </p>
      </section>

      <section id="liability">
        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, {LEGAL_CONFIG.companyName} shall not be liable for any indirect, incidental, or consequential damages resulting from the use of our platform.
        </p>
      </section>

      <section id="contact">
        <h2>Contact</h2>
        <p>
          For legal inquiries regarding these terms, please email: <strong>{LEGAL_CONFIG.supportEmail}</strong>
        </p>
      </section>
    </LegalLayout>
  );
}
