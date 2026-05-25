"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAI = generateAI;
exports.parseJsonFromAI = parseJsonFromAI;
const env_1 = require("../../config/env");
const gemini_1 = require("./gemini");
const openRouter_1 = require("./openRouter");
async function generateAI(messages, options) {
    // If Gemini API Key is available, use callGemini
    if (env_1.env.geminiApiKey) {
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
            const prompt = nonSystemMessages.length === 1 && nonSystemMessages[0].role === "user"
                ? nonSystemMessages[0].content
                : conversationHistory;
            return await (0, gemini_1.callGemini)(prompt, systemInstruction, undefined, options);
        }
        catch (err) {
            console.warn("Gemini call failed, falling back to OpenRouter:", err);
            if (env_1.env.openRouterApiKey) {
                return await (0, openRouter_1.callOpenRouter)(messages, options);
            }
            throw err;
        }
    }
    // Fallback to OpenRouter if Gemini key is not present but OpenRouter key is present
    if (env_1.env.openRouterApiKey) {
        return await (0, openRouter_1.callOpenRouter)(messages, options);
    }
    throw new Error("No AI API keys configured (Gemini or OpenRouter)");
}
function parseJsonFromAI(text) {
    let cleaned = text.trim();
    // Remove markdown code blocks
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
    }
    else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
    try {
        return JSON.parse(cleaned);
    }
    catch (error) {
        const firstBrace = cleaned.indexOf("{");
        const firstBracket = cleaned.indexOf("[");
        const lastBrace = cleaned.lastIndexOf("}");
        const lastBracket = cleaned.lastIndexOf("]");
        let start = -1;
        let end = -1;
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            start = firstBrace;
            end = lastBrace;
        }
        else if (firstBracket !== -1) {
            start = firstBracket;
            end = lastBracket;
        }
        if (start !== -1 && end !== -1 && end > start) {
            try {
                const jsonSegment = cleaned.slice(start, end + 1);
                return JSON.parse(jsonSegment);
            }
            catch (innerError) {
                // Fall back to original error
            }
        }
        throw error;
    }
}
//# sourceMappingURL=aiClient.js.map