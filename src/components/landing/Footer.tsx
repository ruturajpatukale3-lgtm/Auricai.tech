/**
 * Footer — 4-column footer with brand, product, company, and legal links.
 * Background: #080808. Social icons. SOC2 meta badge.
 */

import { AuricaiLogo } from "@/components/ui/AuricaiLogo";

const footerLinks = {
  product: {
    heading: "Product",
    links: [
      { name: "Features", href: "#features" },
      { name: "Pricing", href: "#pricing" },
    ],
  },
  legal: {
    heading: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy-policy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Security", href: "/security" },
      { name: "GDPR", href: "/gdpr" },
      { name: "Cookies", href: "/cookies" },
    ],
  },
};

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-[rgba(255,255,255,0.06)]">
      <div className="container-max pt-20 pb-10">
        {/* Top row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-10 mb-16">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="inline-flex items-center gap-2 group">
              <AuricaiLogo size={24} className="text-white opacity-70 group-hover:opacity-100 transition-all duration-300" />
              <span className="text-lg font-bold tracking-tight text-white">Auricai</span>
            </a>
            <p className="text-sm text-[#52525B] mt-3 leading-relaxed max-w-[220px]">
              Turn happy clients into closed deals. Automatically.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="#"
                className="text-[#52525B] hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <TwitterIcon className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="text-[#52525B] hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <LinkedinIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h4 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">
                {section.heading}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-[#52525B] hover:text-[#A1A1AA] transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-[rgba(255,255,255,0.06)] gap-4">
          <p className="text-caption text-[#52525B]">
            © 2026 Auricai. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
