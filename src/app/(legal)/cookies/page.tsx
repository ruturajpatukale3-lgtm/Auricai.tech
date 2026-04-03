import React from "react";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LEGAL_CONFIG } from "@/lib/config/legal";

export const metadata = {
  title: "Cookies Policy | Auricai",
  description: "Learn how Auricai uses cookies to improve your user experience and platform security.",
};

const sections = [
  { id: "introduction", title: "What are Cookies?" },
  { id: "types", title: "Types of Cookies Used" },
  { id: "why-we-use", title: "Why we use them" },
  { id: "essential", title: "Essential Cookies" },
  { id: "analytics", title: "Analytics Cookies" },
  { id: "preferences", title: "Preference Cookies" },
  { id: "manage", title: "How to Manage Cookies" },
  { id: "browser-settings", title: "Browser Settings" },
  { id: "consent", title: "Cookie Consent" },
  { id: "contact", title: "Contact" },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookies Policy"
      subtitle="Transparency on how we use small data for big impacts."
      sections={sections}
    >
      <section id="introduction">
        <h2>What are Cookies?</h2>
        <p>
          Cookies are small text files that are stored on your device when you visit a website. They help the website recognize your device and remember certain information about your visit, such as your login session, preferences, and how you interact with the platform.
        </p>
      </section>

      <section id="types">
        <h2>Types of Cookies Used</h2>
        <p>
          At {LEGAL_CONFIG.companyName}, we use three primary types of cookies to deliver a secure and smooth experience:
        </p>
        <ul>
          <li><strong>Essential Cookies</strong>: Required for the platform to function.</li>
          <li><strong>Analytics Cookies</strong>: Help us understand product usage.</li>
          <li><strong>Preference Cookies</strong>: Remember your settings across sessions.</li>
        </ul>
      </section>

      <section id="why-we-use">
        <h2>Why we use them</h2>
        <p>
          Cookies allow us to maintain your secure session, prevent unauthorized access to your organization's data, and analyze which features are most valuable to our users. We do not use cookies for cross-site behavioral advertising.
        </p>
      </section>

      <section id="essential">
        <h2>Essential Cookies</h2>
        <p>
          These cookies are technically necessary for the platform to operate. Examples include:
        </p>
        <ul>
          <li><strong>Authentication</strong>: Managed by Clerk to keep you logged in.</li>
          <li><strong>Security</strong>: CRSF protection and session validation via Supabase.</li>
          <li><strong>Billing</strong>: Session cookies used by Paddle for checkout and subscription management.</li>
        </ul>
      </section>

      <section id="analytics">
        <h2>Analytics Cookies</h2>
        <p>
          These cookies collect information about how you use {LEGAL_CONFIG.companyName}. We use this data to:
        </p>
        <ul>
          <li>Identify performance issues or slow-loading pages.</li>
          <li>See which dashboards or AI tools are most frequently used.</li>
          <li>Measure the effectiveness of our onboarding flow for new users.</li>
        </ul>
      </section>

      <section id="preferences">
        <h2>Preference Cookies</h2>
        <p>
          These cookies remember your choices to provide a more personalized experience. For example:
        </p>
        <ul>
          <li>Remembering your preferred dashboard view (list vs. grid).</li>
          <li>Keeping track of dismissed notifications or onboarding hints.</li>
        </ul>
      </section>

      <section id="manage">
        <h2>How to Manage Cookies</h2>
        <p>
          Most web browsers allow you to control cookies through their settings. If you choose to disable all cookies, please note that {LEGAL_CONFIG.companyName} will not function correctly, as we rely on essential cookies for secure authentication.
        </p>
      </section>

      <section id="browser-settings">
        <h2>Browser Settings</h2>
        <p>
          You can typically find cookie settings in the "Options" or "Preferences" menu of your browser. Use the "Help" function in your browser to learn how to block or delete cookies.
        </p>
      </section>

      <section id="consent">
        <h2>Cookie Consent</h2>
        <p>
          By using {LEGAL_CONFIG.companyName}, you consent to the use of cookies as described in this policy. While we do not currently show a persistent banner for essential cookies (which are exempt from common consent requirements), you can always manage your preferences via your browser.
        </p>
      </section>

      <section id="contact">
        <h2>Contact</h2>
        <p>
          If you have any questions about our cookie usage, please contact us at: <strong>{LEGAL_CONFIG.supportEmail}</strong>
        </p>
      </section>
    </LegalLayout>
  );
}
