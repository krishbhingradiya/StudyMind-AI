import { env } from "../../config/env";

export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  modelOverride?: string,
  options?: { maxTokens?: number; temperature?: number },
  signal?: AbortSignal
): Promise<string> {
  if (!env.geminiApiKey) {
    throw new Error("Gemini API key not configured");
  }

  const model = modelOverride || env.geminiModel;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const activeSignal = signal || controller.signal;

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: activeSignal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction }] }
          : undefined,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 4096,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini error: ${err}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
