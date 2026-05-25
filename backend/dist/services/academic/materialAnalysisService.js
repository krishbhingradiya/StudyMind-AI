"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeStudyMaterial = analyzeStudyMaterial;
const aiClient_1 = require("../ai/aiClient");
const textCleaner_1 = require("../../utils/textCleaner");
const TYPE_PROMPTS = {
    syllabus: "University SYLLABUS — extract units, chapters, exam scope.",
    ppt: "Lecture slides — extract taught topics and chapter structure.",
    notes: "Student NOTES — extract topics, definitions, priorities.",
    textbook: "TEXTBOOK — extract chapters and learning hierarchy.",
    past_paper: "EXAM PAPER — extract question topics, patterns, repeated concepts only.",
    general: "Study material — extract academic topics and structure.",
};
const ANALYSIS_LIMITS = {
    past_paper: { maxChars: 4500, maxTokens: 1000 },
    ppt: { maxChars: 5500, maxTokens: 1200 },
    notes: { maxChars: 5500, maxTokens: 1200 },
    syllabus: { maxChars: 6500, maxTokens: 1500 },
    textbook: { maxChars: 6500, maxTokens: 1500 },
    general: { maxChars: 5500, maxTokens: 1200 },
};
const PAST_PAPER_JSON = `Return ONLY valid JSON:
{
  "subject": "string",
  "extractedTopics": ["topic1"],
  "units": [],
  "chapters": ["ch1"],
  "importantTopics": ["high priority"],
  "keywords": ["kw1"],
  "difficultyAnalysis": {"overall":"medium"},
  "studyHoursEstimate": 10,
  "topicGraph": []
}`;
const FULL_JSON = `Return ONLY valid JSON:
{
  "subject": "string",
  "extractedTopics": ["topic1"],
  "units": [{"name":"Unit 1","topics":["t1"],"estimatedHours":4,"difficulty":"medium"}],
  "chapters": ["ch1"],
  "importantTopics": ["high priority"],
  "keywords": ["kw1"],
  "difficultyAnalysis": {"overall":"medium","hardest":"topic"},
  "studyHoursEstimate": 20,
  "topicGraph": [{"topic":"Trees","prerequisites":["Arrays"],"difficulty":"hard"}]
}`;
async function analyzeStudyMaterial(text, options) {
    const limits = ANALYSIS_LIMITS[options.materialType] || ANALYSIS_LIMITS.general;
    const content = (0, textCleaner_1.truncateText)(text, limits.maxChars);
    const typeHint = TYPE_PROMPTS[options.materialType] || TYPE_PROMPTS.general;
    const jsonSchema = options.materialType === "past_paper" ? PAST_PAPER_JSON : FULL_JSON;
    const messages = [
        {
            role: "system",
            content: `You are a university academic intelligence engine. ${typeHint}\n${jsonSchema}`,
        },
        {
            role: "user",
            content: `University: ${options.university || "N/A"}
Branch: ${options.branch || "N/A"}
Semester: ${options.semester || "N/A"}
Subject hint: ${options.subject || "infer from content"}
File: ${options.fileName || "upload"}

Content:
${content}`,
        },
    ];
    const response = await (0, aiClient_1.generateAI)(messages, {
        maxTokens: limits.maxTokens,
        temperature: 0.35,
        preferFast: true,
    });
    const parsed = (0, aiClient_1.parseJsonFromAI)(response);
    return {
        subject: parsed.subject || options.subject || "General",
        extractedTopics: parsed.extractedTopics || [],
        units: parsed.units || [],
        chapters: parsed.chapters || [],
        importantTopics: parsed.importantTopics || [],
        keywords: parsed.keywords || [],
        difficultyAnalysis: parsed.difficultyAnalysis || {},
        studyHoursEstimate: parsed.studyHoursEstimate || 10,
        topicGraph: parsed.topicGraph || [],
        fullAnalysis: parsed,
    };
}
