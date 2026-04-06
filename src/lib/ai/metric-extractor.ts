import { GeminiService } from "./gemini";
import { InterviewMetric } from "@/types";

export const MetricExtractor = {
  /**
   * Extract structured metrics from a raw answer string.
   * Returns a list of metrics found, or an empty array.
   */
  async extract(answer: string): Promise<InterviewMetric[]> {
    const systemPrompt = `You are an expert DATA ANALYST. Your job is to extract structured B2B performance metrics from raw conversational text.

EXTRACT THESE FIELDS FOR EACH METRIC:
1. type: Normalized name (e.g., "conversion_rate", "revenue", "leads", "pipeline", "efficiency").
2. status: "complete" (if exact numbers are given) or "estimated" (if rounded/approximate).
3. value: The current/final result (e.g. "25%", "$10k").
4. before: (Optional) The starting value or baseline.
5. after: (Optional) The final value achieved.
6. timeframe: (Optional) How long it took.
7. confidence: (1-100) How certain you are of this extraction.

SEMANTIC MATCHING & PRIORITY RULES:
- "lead conversion", "funnel conversion", "marketing conversion" -> type: "conversion_rate"
- "money", "earnings", "ARR", "sales", "revenue" -> type: "revenue"
- "inquiries", "meetings", "calls" -> type: "leads"
- "pipeline value", "deal value", "qualified pipe", "pipeline" -> type: "pipeline"
- "faster", "hours saved", "man-days" -> type: "efficiency"

LOCKING CRITERIA (INTERNAL NOTE):
A metric is only truly valuable if it has both 'before' and 'after' data or a very 'complete' status.

OUTPUT FORMAT:
Return valid JSON only in the format: { "metrics": [ { ... }, { ... } ] }
If no metrics are found, return { "metrics": [] }`;

    try {
      const response = await GeminiService.generateJSON<{ metrics: InterviewMetric[] }>({
        systemPrompt,
        userPrompt: `Extract metrics from this answer: "${answer}"`,
        temperature: 0.1, // Low temperature for high precision extraction
      });

      // Filter out low confidence extractions
      return (response.metrics || []).filter(m => (m.confidence || 0) > 70);
    } catch (error) {
      console.error("[MetricExtractor] Extraction failed:", error);
      return [];
    }
  },

  /**
   * Map semantic variations to core types.
   */
  normalizeType(rawType: string): string {
    const lower = rawType.toLowerCase().replace(/_/g, " ");
    
    if (lower.includes("conversion")) return "conversion_rate";
    if (lower.includes("revenue") || lower.includes("sales") || lower.includes("money") || lower.includes("arr")) return "revenue";
    if (lower.includes("lead") || lower.includes("meeting") || lower.includes("call")) return "leads";
    if (lower.includes("efficiency") || lower.includes("time") || lower.includes("faster")) return "efficiency";
    
    return rawType.toLowerCase().replace(/\s+/g, "_");
  }
};
