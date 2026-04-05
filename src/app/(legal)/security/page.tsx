import { LegalLayout } from "@/components/legal/LegalLayout";
import { LEGAL_CONFIG } from "@/lib/config/legal";

export const metadata = {
  title: "Security | Auricai",
  description: "Explore our security posture, data protection, and enterprise-grade isolation.",
};

const sections = [
  { id: "philosophy", title: "Security Philosophy" },
  { id: "limitation", title: "Security Limitation" },
  { id: "auth", title: "Authentication and Access" },
  { id: "isolation", title: "Multi-tenant Isolation" },
  { id: "encryption", title: "Encryption" },
  { id: "api-handling", title: "API and Secret Handling" },
  { id: "rbac", title: "Role-Based Access" },
  { id: "audit-logging", title: "Audit Logging" },
  { id: "backups", title: "Backups and Recovery" },
  { id: "vulnerabilities", title: "Vulnerability Handling" },
  { id: "incident-response", title: "Incident Response" },
  { id: "secure-integrations", title: "Enterprise Integrations" },
  { id: "disclosure", title: "Responsible Disclosure" },
];

export default function SecurityPage() {
  return (
    <LegalLayout
      title="Security"
      subtitle="Enterprise-grade protection for your high-value business data."
      sections={sections}
    >
      <section id="philosophy">
        <h2>Data Protection Philosophy</h2>
        <p>
          At Auricai, security isn't just a feature—it's a fundamental part of our architecture. We build with a "Security-First" approach, ensuring that your organization's sensitive interview data and strategic insights are isolated and protected by default.
        </p>
      </section>

      <section id="limitation">
        <h2>Security Limitation</h2>
        <p>
          While we employ industry-standard encryption, multi-tenant isolation, and proactive monitoring, you acknowledge that **no method of transmission over the Internet or electronic storage is 100% secure.** We work tirelessly to protect your data, but we cannot guarantee absolute security against all potential threats.
        </p>
      </section>

      <section id="auth">
        <h2>Authentication and Access Control</h2>
        <p>
          We use Clerk for enterprise-grade authentication. This includes support for Multi-Factor Authentication (MFA), secure password hashing, and session management. Access to the dashboard is strictly limited to authenticated users who are members of your organization.
        </p>
      </section>

      <section id="isolation">
        <h2>Multi-tenant Isolation</h2>
        <p>
          We use Row-Level Security (RLS) via Supabase to ensure that your organization's data is logically isolated from all other customers. Every database query is scoped to your `org_id`, preventing any possibility of data leakage between different organizations.
        </p>
      </section>

      <section id="encryption">
        <h2>Encryption</h2>
        <p>
          <strong>In Transit</strong>: All data transmitted between your browser and our servers is encrypted using TLS 1.3 or higher. We enforce HTTPS everywhere and use HSTS (HTTP Strict Transport Security).
        </p>
        <p>
          <strong>At Rest</strong>: All database content and backups are encrypted at rest using AES-256 encryption. This includes all interview transcripts and generated case studies.
        </p>
      </section>

      <section id="api-handling">
        <h2>API and Secret Handling</h2>
        <p>
          External API keys (e.g., for OAuth or analytics integrations) are stored securely as encrypted secrets on the server-side. We never expose these keys to the client-side browser, and we use scoped tokens where possible.
        </p>
      </section>

      <section id="rbac">
        <h2>Role-Based Access</h2>
        <p>
          Auricai supports granular role-based access. Administrators can manage team invites and billing, while members focus on interviewing and content generation. This ensures that users only have the permissions necessary for their role.
        </p>
      </section>

      <section id="audit-logging">
        <h2>Audit Logging</h2>
        <p>
          Important events, such as interview completions, case study shares, and security settings changes, are logged in our internal audit trail. This provides a clear history of activities within your organization for compliance and accountability.
        </p>
      </section>

      <section id="backups">
        <h2>Backups and Recovery</h2>
        <p>
          We perform daily automated backups of our primary database. Backups are stored in multiple geographically redundant locations to ensure rapid recovery in the event of a system failure.
        </p>
      </section>

      <section id="vulnerabilities">
        <h2>Vulnerability Handling</h2>
        <p>
          We use automated dependency scanning and regular code audits to identify and patch security vulnerabilities. We prioritize security updates for critical libraries and infrastructure components.
        </p>
      </section>

      <section id="incident-response">
        <h2>Incident Response</h2>
        <p>
          In the unlikely event of a security incident, we have an internal response plan to contain the threat, assess the impact, and notify affected users in accordance with applicable laws and regulations.
        </p>
      </section>

      <section id="secure-integrations">
        <h2>Enterprise Integrations</h2>
        <p>
          When you connect Auricai to supported third-party tools, we use official OAuth flows. This means you never share your passwords with us, and you can revoke our access at any time through your provider.
        </p>
      </section>

      <section id="disclosure">
        <h2>Responsible Disclosure</h2>
        <p>
          We value the work of security researchers. If you believe you've found a vulnerability in Auricai, please contact us at <strong>{LEGAL_CONFIG.securityEmail}</strong>. We ask that you give us a reasonable amount of time to resolve the issue before making it public.
        </p>
      </section>
    </LegalLayout>
  );
}
