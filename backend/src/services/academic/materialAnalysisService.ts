import { generateAI, parseJsonFromAI } from "../ai/aiClient";
import { truncateText } from "../../utils/textCleaner";

export type MaterialType = "syllabus" | "ppt" | "notes" | "textbook" | "past_paper" | "general";

export interface MaterialAnalysisResult {
  subject: string;
  extractedTopics: string[];
  units: { name: string; topics: string[]; estimatedHours: number; difficulty: string }[];
  chapters: string[];
  importantTopics: string[];
  keywords: string[];
  difficultyAnalysis: Record<string, string>;
  studyHoursEstimate: number;
  topicGraph: { topic: string; prerequisites: string[]; difficulty: string }[];
  fullAnalysis: Record<string, unknown>;
}

const TYPE_PROMPTS: Record<MaterialType, string> = {
  syllabus: "University SYLLABUS — extract units, chapters, exam scope.",
  ppt: "Lecture slides — extract taught topics and chapter structure.",
  notes: "Student NOTES — extract topics, definitions, priorities.",
  textbook: "TEXTBOOK — extract chapters and learning hierarchy.",
  past_paper: "EXAM PAPER — extract question topics, patterns, repeated concepts only.",
  general: "Study material — extract academic topics and structure.",
};

const ANALYSIS_LIMITS: Record<MaterialType, { maxChars: number; maxTokens: number }> = {
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

export async function analyzeStudyMaterial(
  text: string,
  options: {
    materialType: MaterialType;
    university?: string;
    branch?: string;
    semester?: number;
    subject?: string;
    fileName?: string;
  }
): Promise<MaterialAnalysisResult> {
  const limits = ANALYSIS_LIMITS[options.materialType] || ANALYSIS_LIMITS.general;
  const content = truncateText(text, limits.maxChars);
  const typeHint = TYPE_PROMPTS[options.materialType] || TYPE_PROMPTS.general;
  const jsonSchema = options.materialType === "past_paper" ? PAST_PAPER_JSON : FULL_JSON;

  const messages = [
    {
      role: "system" as const,
      content: `You are a university academic intelligence engine. ${typeHint}\n${jsonSchema}`,
    },
    {
      role: "user" as const,
      content: `University: ${options.university || "N/A"}
Branch: ${options.branch || "N/A"}
Semester: ${options.semester || "N/A"}
Subject hint: ${options.subject || "infer from content"}
File: ${options.fileName || "upload"}

Content:
${content}`,
    },
  ];

  const response = await generateAI(messages, {
    maxTokens: limits.maxTokens,
    temperature: 0.35,
    preferFast: true,
  });
  const parsed = parseJsonFromAI<MaterialAnalysisResult & { fullAnalysis?: Record<string, unknown> }>(
    response
  );

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
    fullAnalysis: parsed as unknown as Record<string, unknown>,
  };
}
