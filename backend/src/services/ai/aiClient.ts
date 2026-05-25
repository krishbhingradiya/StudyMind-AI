import { env } from "../../config/env";
import { callGemini } from "./gemini";
import { callOpenRouter } from "./openRouter";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  preferFast?: boolean;
}

export async function generateAI(
  messages: ChatMessage[],
  options?: AIOptions
): Promise<string> {
  // If Gemini API Key is available, use callGemini
  if (env.geminiApiKey) {
    try {
      // Find system instruction if any
      const systemMsg = messages.find((m) => m.role === "system");
      const systemInstruction = systemMsg ? systemMsg.content : undefined;

      // Extract and combine the user/assistant messages for the prompt
      const nonSystemMessages = messages.filter((m) => m.role !== "system");
      const conversationHistory = nonSystemMessages
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");

      // If there's only one user message, just use its content directly
      const prompt =
        nonSystemMessages.length === 1 && nonSystemMessages[0].role === "user"
          ? nonSystemMessages[0].content
          : conversationHistory;

      return await callGemini(prompt, systemInstruction, undefined, options);
    } catch (err) {
      console.warn("Gemini call failed, falling back to OpenRouter:", err);
      if (env.openRouterApiKey) {
        return await callOpenRouter(messages, options);
      }
      throw err;
    }
  }

  // Fallback to OpenRouter if Gemini key is not present but OpenRouter key is present
  if (env.openRouterApiKey) {
    return await callOpenRouter(messages, options);
  }

  throw new Error("No AI API keys configured (Gemini or OpenRouter)");
}

export function parseJsonFromAI<T>(text: string): T {
  let cleaned = text.trim();
  // Remove markdown code blocks
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    const firstBrace = cleaned.indexOf("{");
    const firstBracket = cleaned.indexOf("[");
    const lastBrace = cleaned.lastIndexOf("}");
    const lastBracket = cleaned.lastIndexOf("]");

    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
      end = lastBrace;
    } else if (firstBracket !== -1) {
      start = firstBracket;
      end = lastBracket;
    }

    if (start !== -1 && end !== -1 && end > start) {
      try {
        const jsonSegment = cleaned.slice(start, end + 1);
        return JSON.parse(jsonSegment) as T;
      } catch (innerError) {
        // Fall back to original error
      }
    }
    throw error;
  }
}