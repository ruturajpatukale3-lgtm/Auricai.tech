export const LEGAL_CONFIG = {
  companyName: "Auricai",
  supportEmail: "support@auricai.tech",
  privacyEmail: "privacy@auricai.tech",
  securityEmail: "security@auricai.tech",
  dpoEmail: "dpo@auricai.tech",
  lastUpdated: "2026-04-03",
  address: "San Francisco, CA",
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "https://auricai.tech",
};

export const SUBPROCESSORS = [
  { name: "Clerk", purpose: "Authentication & Identity", location: "United States" },
  { name: "Supabase", purpose: "Database & Cloud Storage", location: "United States" },
  { name: "Google Gemini", purpose: "AI Language Processing", location: "United States (via Google Cloud)" },
  { name: "Resend", purpose: "Transactional Email Delivery", location: "United States" },
  { name: "Paddle", purpose: "Payments & Tax Compliance", location: "Global" },
  { name: "Upstash", purpose: "Rate Limiting & Caching", location: "United States" },
];

export const LEGAL_MESSAGES = {
  disclaimer: "This content is provided for product transparency and should be reviewed by legal counsel before production use.",
};
