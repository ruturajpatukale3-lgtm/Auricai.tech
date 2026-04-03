import React from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LEGAL_CONFIG, SUBPROCESSORS } from "@/lib/config/legal";

export const metadata = {
  title: "Privacy Policy | Auricai",
  description: "Learn how Auricai collects, uses, and protects your data.",
};

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "data-roles", title: "Data Role Clarity" },
  { id: "what-we-collect", title: "What we collect" },
  { id: "why-we-collect", title: "Why we collect it" },
  { id: "how-we-use", title: "How we use it" },
  { id: "data-sharing", title: "Subprocessors & Sharing" },
  { id: "data-retention", title: "Data retention" },
  { id: "data-security", title: "Data security" },
  { id: "user-rights", title: "User rights" },
  { id: "childrens-privacy", title: "Children’s privacy" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact information" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="Transparent, secure, and respectful of your data rights."
      sections={sections}
    >
      <section id="introduction">
        <p>
          At {LEGAL_CONFIG.companyName}, we believe privacy is a fundamental human right. This policy explains how we handle your information when you use our platform to generate case studies and manage client insights.
        </p>
      </section>

      <section id="data-roles">
        <h2>Data Role Clarity</h2>
        <p>
          To ensure legal and regulatory compliance, it is important to define the roles of each party involved in data processing:
        </p>
        <ul>
          <li><strong>Auricai (Data Processor)</strong>: We process information on your behalf and according to your instructions to provide the service.</li>
          <li><strong>You / The Customer (Data Controller)</strong>: You are the owner of the data and are responsible for ensuring you have the legal right to collect it from your clients.</li>
        </ul>
      </section>

      <section id="what-we-collect">
        <h2>What we collect</h2>
        <p>To provide the {LEGAL_CONFIG.companyName} service, we collect the following categories of information:</p>
        <ul>
          <li><strong>Account Information</strong>: Your name, business email, and Clerk-provided authentication metadata.</li>
          <li><strong>Organization Information</strong>: Business name, industry, service categories, and target customer profiles.</li>
          <li><strong>Interview Content</strong>: Transcripts, audio recordings, and extracted insights from client interviews.</li>
          <li><strong>Case Study Content</strong>: Generated narratives, metrics (revenue, ROI, etc.), and media shared in your Proof Center.</li>
          <li><strong>Analytics and Usage Data</strong>: Information on how you interact with the dashboard, including event logs and session telemetry.</li>
          <li><strong>Billing Information</strong>: Transaction history and subscription status managed via Paddle (we do not store raw credit card numbers).</li>
          <li><strong>Integration Data</strong>: Tokens and metadata from connected platforms like HubSpot or CRM systems.</li>
        </ul>
      </section>

      <section id="why-we-collect">
        <h2>Why we collect it</h2>
        <p>We only collect data that is necessary to deliver the core value of {LEGAL_CONFIG.companyName}. This includes:</p>
        <ul>
          <li>Powering the AI engines that generate your case studies.</li>
          <li>Maintaining secure access to your organization dashboard.</li>
          <li>Personalizing the platform experience based on your industry.</li>
          <li>Providing accurate revenue attribution and usage metrics.</li>
          <li>Improving our AI models through anonymized performance analysis.</li>
        </ul>
      </section>

      <section id="how-we-use">
        <h2>How we use it</h2>
        <p>Your data is used to orchestrate the "Proof-to-Pay" loop. Specifically:</p>
        <ul>
          <li><strong>Orchestration</strong>: Routing interviews to the correct client and mapping answers to your business profile.</li>
          <li><strong>AI Generation</strong>: Feeding interview data into our LLM pipelines (via Google Gemini) to produce refined case study copy.</li>
          <li><strong>Security</strong>: Validating organization isolation so your internal data is never exposed to other users.</li>
        </ul>
      </section>

      <section id="data-sharing">
        <h2>Subprocessors & Sharing</h2>
        <p>We do not sell your personal data. To provide our service, we engage the following third-party subprocessors:</p>
        
        <div className="overflow-x-auto my-8 border border-white/10 rounded-xl">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 font-bold text-white uppercase tracking-wider text-xs">Entity</th>
                <th className="px-6 py-4 font-bold text-white uppercase tracking-wider text-xs">Purpose</th>
                <th className="px-6 py-4 font-bold text-white uppercase tracking-wider text-xs">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {SUBPROCESSORS.map((sp) => (
                <tr key={sp.name} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{sp.name}</td>
                  <td className="px-6 py-4 text-zinc-400">{sp.purpose}</td>
                  <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{sp.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-zinc-500 italic mt-4">
          All subprocessing is governed by Data Processing Agreements (DPAs) that ensure a level of protection equivalent to our own standards.
        </p>
      </section>

      <section id="data-retention">
        <h2>Data retention</h2>
        <p>We keep your data for as long as your account is active. If you choose to close your account, we delete your organization profile and all associated interview content within 60 days, unless required otherwise by law.</p>
      </section>

      <section id="data-security">
        <h2>Data security</h2>
        <p>Security is baked into our architecture. We use multi-tenant isolation at the database level (Supabase RLS), encryption for all data in transit (TLS 1.3), and AES-256 encryption at rest.</p>
      </section>

      <section id="user-rights">
        <h2>User rights</h2>
        <p>Depending on your location, you have rights regarding your personal data:</p>
        <ul>
          <li>The right to access and export your data.</li>
          <li>The right to request deletion (the "right to be forgotten").</li>
          <li>The right to correct inaccurate information.</li>
          <li>The right to object to automated processing.</li>
        </ul>
        <p>To exercise these rights, please contact our privacy team at {LEGAL_CONFIG.privacyEmail}.</p>
      </section>

      <section id="childrens-privacy">
        <h2>Children’s privacy</h2>
        <p>{LEGAL_CONFIG.companyName} is a B2B service intended for professional use. We do not knowingly collect information from children under 16.</p>
      </section>

      <section id="changes">
        <h2>Changes to this policy</h2>
        <p>We may update this policy to reflect changes in our service or legal requirements. We will notify you of any significant changes via the dashboard or email.</p>
      </section>

      <section id="contact">
        <h2>Contact information</h2>
        <p>For any questions or privacy-related requests, please contact us:</p>
        <p>
          Email: <strong>{LEGAL_CONFIG.privacyEmail}</strong><br />
          Subject: Privacy Inquiry
        </p>
      </section>
    </LegalLayout>
  );
}
