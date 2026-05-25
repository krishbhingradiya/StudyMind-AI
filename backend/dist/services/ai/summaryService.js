"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSummary = generateSummary;
const aiClient_1 = require("./aiClient");
const PROMPTS = {
    concise: "Create a concise academic summary with clear sections.",
    key_points: "Extract key points as bullet lists with bold topic headers.",
    revision: "Create revision notes optimized for exam preparation.",
    explanation: "Explain concepts in depth with examples and analogies.",
    simplified: "Simplify complex topics for easy understanding.",
};
async function generateSummary(content, type = "concise", context) {
    const contextStr = context
        ? `Student context: ${context.university || "University"}, ${context.branch || "Branch"}, Semester ${context.semester || "N/A"}.`
        : "";
    const pageLimit = context?.targetPages
        ? `
NOTEBOOK PAGE LIMIT: The student wants notes that fit on exactly ${context.targetPages} A4 handwritten page(s).
- Each page holds roughly 250–320 words of handwriting-style notes.
- Cover ALL important exam points within this limit — prioritize high-yield concepts.
- Use clear ## and ### section headers; short bullets; no filler or repetition.
- If ${context.targetPages} page(s): stay under ~${context.targetPages * 300} words total.`
        : "";
    const messages = [
        {
            role: "system",
            content: `You are StudyMind AI, an expert academic tutor. ${contextStr}
Output in Markdown with LaTeX for math ($...$ inline, $$...$$ block).
Use headers, bullet points, and structured formatting.
${PROMPTS[type]}${pageLimit}`,
        },
        {
            role: "user",
            content: `Generate a ${type.replace("_", " ")} from this study material:\n\n${content}`,
        },
    ];
    return (0, aiClient_1.generateAI)(messages, { maxTokens: 4096, temperature: 0.6 });
}
//# sourceMappingURL=summaryService.js.map