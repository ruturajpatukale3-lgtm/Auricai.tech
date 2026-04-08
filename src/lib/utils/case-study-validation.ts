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

  const lowcaseHeadline = headline.toLowerCase();
  const isGeneric = genericPhrases.some(phrase => lowcaseHeadline.includes(phrase));

  if (isGeneric) {
    return "Draft — Ready for Review";
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
