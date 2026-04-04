import { CaseStudy } from "@/types";

/**
 * Validates if a case study has enough data to be considered "Complete".
 * Threshold: Must have at least one measurable performance metric (ROI).
 */
export const isCaseStudyComplete = (study: CaseStudy): boolean => {
  const hasROI = (study.delta_percent !== null && study.delta_percent > 0);
  
  return hasROI;
};

/**
 * Replaces generic AI-generated "stub" headlines with a professional pending placeholder.
 */
export const getValidHeadline = (headline: string | null): string => {
  if (!headline) return "Case study pending — awaiting data";

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
    return "Case study pending — awaiting data";
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
