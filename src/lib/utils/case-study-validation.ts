import { CaseStudy } from "@/types";



/**
 * Replaces generic AI-generated "stub" headlines with a professional pending placeholder.
 */
export const getValidHeadline = (headline: string | null): string => {
  if (!headline) return "Draft — Ready for Review";

  const genericPhrases = [
    "help results",
    "business results",
    "generic headline",
    "placeholder",
    "case study for",
    "click to edit"
  ];

  // BANNED: Vague phrases that should never appear in a headline
  const bannedPhrases = [
    "meaningful improvement",
    "meaningful performance",
    "better performance",
    "significant growth",
    "game changer",
    "game-changer",
    "revolutionary",
    "groundbreaking",
    "best in class",
    "world-class results",
    "impressive outcomes",
    "+xx%",
  ];

  const lowcaseHeadline = headline.toLowerCase();
  const isGeneric = genericPhrases.some(phrase => lowcaseHeadline.includes(phrase));
  const isBanned = bannedPhrases.some(phrase => lowcaseHeadline.includes(phrase));

  if (isGeneric || isBanned) {
    return "Draft — Ready for Review";
  }

  // Headline must be max ~120 chars (roughly 2 lines)
  if (headline.length > 120) {
    return headline.substring(0, 117) + "...";
  }

  return headline;
};

/**
 * Formats a metric value, returning null if it's 0 or null to prevent rendering empty stats.
 */
export const formatMetricValue = (value: number | null): string | null => {
  if (value === null || value === 0) return null;
  return value.toLocaleString();
};

/**
 * Validates a primary metric string. Returns empty string if it's fake/fallback.
 * Cards should NOT display metric if this returns empty.
 */
export const getValidMetric = (metric: string | null): string => {
  if (!metric) return "";

  const fakePhrases = [
    "+xx%",
    "improvement",
    "not provided",
    "n/a",
    "null",
    "undefined",
    "meaningful",
    "significant",
    "better performance",
  ];

  const lower = metric.toLowerCase().trim();
  if (fakePhrases.some(p => lower.includes(p))) return "";
  if (lower.length < 3) return "";

  return metric;
};
