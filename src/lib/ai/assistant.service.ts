import { GeminiService } from "./gemini";
import { ASSISTANT_SYSTEM_PROMPT } from "./assistant.system-prompt";
import { AssistantClassifier } from "./assistant.classifier";
import type { AssistantResponse } from "./assistant.classifier";

export const AssistantService = {
  /**
   * High-level orchestration for the Assistant chat.
   */
  async getResponse(
    message: string, 
    currentRoute?: string,
    userContext?: { userName: string; orgName: string }
  ): Promise<AssistantResponse> {
    // 1. LIGHTWEIGHT CLASSIFIER (INTENT GUARD)
    const classified = AssistantClassifier.classify(message);
    if (classified) return classified;

    // 2. LLM CALL (FALLBACK TO GEMINI FLASH)
    let systemPrompt = ASSISTANT_SYSTEM_PROMPT;
    
    if (userContext) {
      systemPrompt = `${systemPrompt}\nUSER CONTEXT: You are talking to ${userContext.userName} from ${userContext.orgName}.`;
    }

    if (currentRoute) {
      systemPrompt = `${systemPrompt}\nCURRENT CONTEXT: The user is currently on the ${currentRoute} page.`;
    }

    try {
      const response = await GeminiService.generateJSON<AssistantResponse>({
        systemPrompt,
        userPrompt: message,
        temperature: 0,
      });

      return {
        type: response.type || "other",
        message: response.message || "I'm not sure about that. Try again?",
        actions: Array.isArray(response.actions) ? response.actions : [],
      };
    } catch (err) {
      console.error("[AssistantService] Gemini Chat Failed:", err);
      return {
        type: "other",
        message: "Something went wrong on our end. Please try again or contact support at help@auricai.com.",
        actions: [],
      };
    }
  },
};
