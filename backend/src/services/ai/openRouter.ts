import { env } from "../../config/env";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callOpenRouter(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number },
  modelOverride?: string,
  signal?: AbortSignal
): Promise<string> {
  if (!env.openRouterApiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const model = modelOverride || env.openRouterModel;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const activeSignal = signal || controller.signal;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: activeSignal,
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.frontendUrl,
        "X-Title": "StudyMind AI",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 401) {
        throw new Error("OpenRouter API key is unauthorized or invalid (401). Please verify the OPENROUTER_API_KEY environment variable on your server/Render dashboard.");
      }
      throw new Error(`OpenRouter error: ${err}`);
    }

    const data = (await response.json()) as {
      choices?: {
        message?: {
          content?: string | null;
        };
      }[];
    };

    const text = (data.choices?.[0]?.message?.content || "").trim();

    if (!text) {
      throw new Error("OpenRouter returned an empty response");
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
