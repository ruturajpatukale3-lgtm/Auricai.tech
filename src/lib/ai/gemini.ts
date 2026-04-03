import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.warn("[GeminiService] GOOGLE_GENERATIVE_AI_API_KEY is not set. AI features will fail.");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

export const GeminiService = {
  /**
   * Universal JSON generation wrapper for Gemini 1.5 Flash.
   * Handles system instructions, user prompts, and response cleaning.
   */
  async generateJSON<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    model?: string;
  }): Promise<T> {
    const model = genAI.getGenerativeModel({
      model: params.model || "gemini-2.5-flash",
      systemInstruction: params.systemPrompt,
    });

    const generationConfig: GenerationConfig = {
      temperature: params.temperature ?? 0.1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    };

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: params.userPrompt }] }],
        generationConfig,
      });

      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      // CLEANUP: Sometimes models return markdown blocks even with responseMimeType
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/```json\n?/, "").replace(/\n?```/, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/```\n?/, "").replace(/\n?```/, "");
      }

      try {
        return JSON.parse(cleanText) as T;
      } catch (parseError) {
        console.error("[GeminiService] JSON Parse Failed. Raw Text:", text);
        // Attempt minor repair for common JSON issues (e.g., trailing commas)
        const repaired = cleanText.replace(/,\s*([\]}])/g, "$1");
        return JSON.parse(repaired) as T;
      }
    } catch (error) {
      console.error("[GeminiService] Generation Error:", error);
      throw error;
    }
  },
};
