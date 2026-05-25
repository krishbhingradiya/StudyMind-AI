"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callOpenRouter = callOpenRouter;
const env_1 = require("../../config/env");
async function callOpenRouter(messages, options, modelOverride, signal) {
    if (!env_1.env.openRouterApiKey) {
        throw new Error("OpenRouter API key not configured");
    }
    const model = modelOverride || env_1.env.openRouterModel;
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal,
        headers: {
            Authorization: `Bearer ${env_1.env.openRouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": env_1.env.frontendUrl,
            "X-Title": "StudyMind AI",
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: options?.maxTokens ?? 4096,
            temperature: options?.temperature ?? 0.7,
        }),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter error: ${err}`);
    }
    const data = (await response.json());
    const text = (data.choices?.[0]?.message?.content || "").trim();
    if (!text) {
        throw new Error("OpenRouter returned an empty response");
    }
    return text;
}
//# sourceMappingURL=openRouter.js.map