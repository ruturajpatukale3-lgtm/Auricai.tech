import React from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LEGAL_CONFIG } from "@/lib/config/legal";

export const metadata = {
  title: "GDPR Compliance | Auricai",
  description: "Learn about how Auricai supports GDPR-style data rights for our privacy-conscious users.",
};

const sections = [
  { id: "introduction", title: "GDPR Overview" },
  { id: "roles", title: "Data Roles (Processor vs Controller)" },
  { id: "rights", title: "Your Data Rights" },
  { id: "access-request", title: "Access Request" },
  { id: "deletion-request", title: "Deletion Request" },
  { id: "correction-request", title: "Correction Request" },
  { id: "portability", title: "Data Portability" },
  { id: "legal-basis", title: "Basis for Processing" },
  { id: "retention", title: "Data Retention" },
  { id: "transfers", title: "International Transfers" },
  { id: "contact", title: "Contact Us" },
];

export default function GDPRPage() {
  return (
    <LegalLayout
      title="GDPR Compliance"
      subtitle="Ensuring data privacy and control for our global users."
      sections={sections}
    >
      <section id="introduction">
        <h2>GDPR Overview</h2>
        <p>
          The General Data Protection Regulation (GDPR) is a comprehensive data privacy law in the European Union (EU) that gives individuals more control over their personal data. At {LEGAL_CONFIG.companyName}, we've designed our platform to support these same privacy-conscious principles for all our users worldwide.
        </p>
      </section>

      <section id="roles">
        <h2>Data Roles (Processor vs Controller)</h2>
        <p>
          Under GDPR, it is essential to distinguish between the two primary roles in data processing:
        </p>
        <ul>
          <li><strong>Auricai as Data Processor</strong>: We process personal data only on behalf of our customers (the Data Controllers) and according to their documented instructions.</li>
          <li><strong>The Customer as Data Controller</strong>: Our customers are typically the entities that determine the purposes and means of processing personal data. As a customer, you are responsible for providing appropriate notice to your clients and ensuring a valid legal basis for collection.</li>
        </ul>
      </section>

      <section id="rights">
        <h2>Your Data Rights</h2>
        <p>Under GDPR-style regulations, you have several key rights regarding your personal data:</p>
        <ul>
          <li><strong>The Right to Access</strong>: You can request a copy of the data we hold about you.</li>
          <li><strong>The Right to Erasure</strong>: You can request that we delete your data (the "right to be forgotten").</li>
          <li><strong>The Right to Rectification</strong>: You can ask us to correct or complete inaccurate data.</li>
          <li><strong>The Right to Portability</strong>: You can request to receive your data in a structured, machine-readable format.</li>
        </ul>
      </section>

      <section id="access-request">
        <h2>Access Request</h2>
        <p>
          You have the right to request access to the personal data we store on your behalf. This includes your account profile, organization settings, and interview transcripts. To make a request, please email <strong>{LEGAL_CONFIG.privacyEmail}</strong> with the subject line "DSAR - Access Request".
        </p>
      </section>

      <section id="deletion-request">
        <h2>Deletion Request</h2>
        <p>
          You may request the deletion of your account and all associated data. Once a request is verified, we will remove your information from our active databases and inform our sub-processors to do the same. Note that some data may persist in backups for a limited time (up to 60 days).
        </p>
      </section>

      <section id="correction-request">
        <h2>Correction Request</h2>
        <p>
          If you believe the data we hold about you or your organization is inaccurate, you can update most of it directly within the dashboard. If you need assistance, contact our support team.
        </p>
      </section>

      <section id="portability">
        <h2>Data Portability</h2>
        <p>
          We provide built-in tools to export your case studies and interview insights. If you need a more comprehensive export for compliance purposes, we can provide your core data in a structured JSON or CSV format upon request.
        </p>
      </section>

      <section id="legal-basis">
        <h2>Basis for Processing</h2>
        <p>
          As a Data Processor, {LEGAL_CONFIG.companyName} relies on the instructions and the legal basis established by the Data Controller. Typically, we process your data based on:
        </p>
        <ul>
          <li><strong>Contractual Necessity</strong>: To fulfill our obligations under our service agreement with you.</li>
          <li><strong>Legitimate Interests</strong>: For platform security, fraud prevention, and performance optimization that does not override your fundamental rights.</li>
          <li><strong>Consent</strong>: Where the Controller has obtained explicit consent from the data subject.</li>
        </ul>
      </section>

      <section id="retention">
        <h2>Data Retention</h2>
        <p>
          We retain your data for the duration of our contract with you. If our relationship ends, we will delete your data in accordance with our retention policy, typically within 60 days of account closure.
        </p>
      </section>

      <section id="transfers">
        <h2>International Transfers</h2>
        <p>
          {LEGAL_CONFIG.companyName} is based in {LEGAL_CONFIG.address}. Data may be processed on servers located in the United States and other global regions by our sub-processors (Clerk, Supabase, Google). We ensure these transfers are protected by Standard Contractual Clauses (SCCs) where applicable.
        </p>
      </section>

      <section id="contact">
        <h2>Contact Us</h2>
        <p>
          For any GDPR-related questions or data subject requests, please contact our Data Privacy team:
        </p>
        <p>
          Email: <strong>{LEGAL_CONFIG.privacyEmail}</strong>
        </p>
      </section>
    </LegalLayout>
  );
}
