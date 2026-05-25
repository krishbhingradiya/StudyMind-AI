"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callGemini = callGemini;
const env_1 = require("../../config/env");
async function callGemini(prompt, systemInstruction, modelOverride, options, signal) {
    if (!env_1.env.geminiApiKey) {
        throw new Error("Gemini API key not configured");
    }
    const model = modelOverride || env_1.env.geminiModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env_1.env.geminiApiKey}`;
    const response = await fetch(url, {
        method: "POST",
        signal,
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
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini error: ${err}`);
    }
    const data = (await response.json());
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!text) {
        throw new Error("Gemini returned an empty response");
    }
    return text;
}
