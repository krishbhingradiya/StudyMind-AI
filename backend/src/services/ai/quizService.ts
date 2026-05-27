import { generateAI, parseJsonFromAI } from "./aiClient";
import { truncateText } from "../../utils/textCleaner";
import { QuizQuestion } from "../../types";

const QUIZ_CONTENT_LIMIT = 6000;

interface QuizGenerationInput {
  content: string;
  topic?: string;
  count?: number;
  weakTopics?: string[];
  university?: string;
  branch?: string;
  semester?: number;
}

function normalizeQuizQuestion(question: QuizQuestion, index: number): QuizQuestion {
  const normalized: QuizQuestion = {
    ...question,
    id: question.id || `q${index + 1}`,
  };

  if (normalized.type === "mcq") {
    const options = Array.isArray(normalized.options)
      ? normalized.options.map((opt) => String(opt))
      : [];

    let correctAnswerIndex = Number.isFinite(normalized.correctAnswerIndex)
      ? normalized.correctAnswerIndex
      : undefined;

    if (correctAnswerIndex == null && normalized.correctAnswer) {
      const target = normalized.correctAnswer.trim().toLowerCase();
      correctAnswerIndex = options.findIndex(
        (opt) => opt.trim().toLowerCase() === target
      );
      if (correctAnswerIndex < 0) {
        const letter = target.toUpperCase();
        if (letter.length === 1 && letter >= "A" && letter <= "Z") {
          correctAnswerIndex = letter.charCodeAt(0) - 65;
        }
      }
    }

    if (correctAnswerIndex == null || correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
      throw new Error(
        `Quiz question ${normalized.id} is missing a valid correctAnswerIndex for MCQ validation.`
      );
    }

    normalized.options = options;
    normalized.correctAnswerIndex = correctAnswerIndex;
  }

  return normalized;
}

export async function generateQuiz(input: QuizGenerationInput): Promise<QuizQuestion[]> {
  const count = input.count || 10;
  const weakFocus = input.weakTopics?.length
    ? `Focus extra questions on weak topics: ${input.weakTopics.join(", ")}.`
    : "";

  const material = truncateText(input.content, QUIZ_CONTENT_LIMIT);

  const messages = [
    {
      role: "system" as const,
      content: `You are an exam question generator. Generate exactly ${count} questions (mostly MCQ, some short theory).
${weakFocus}
Keep explanations under 20 words. Be concise.

CRITICAL: For MCQ questions, you MUST provide:
1. "options": array of exactly 4-5 options
2. "correctAnswerIndex": the ZERO-BASED index (0, 1, 2, or 3) of the correct answer in the options array
3. DO NOT provide "correctAnswer" text field - use correctAnswerIndex ONLY

Return ONLY a valid JSON array:
[{"id":"q1","type":"mcq","question":"...","options":["A","B","C","D"],"correctAnswerIndex":0,"explanation":"brief","topic":"..."}]

For theory questions use empty options array, omit correctAnswerIndex, and omit correctAnswer.
Preserve option order exactly as shown; do not shuffle answers.`,
    },
    {
      role: "user" as const,
      content: `Topic: ${input.topic || "General"}
University: ${input.university || "N/A"}, Branch: ${input.branch || "N/A"}

Study material:
${material}`,
    },
  ];

  const response = await generateAI(messages, {
    maxTokens: 2048,
    temperature: 0.6,
    preferFast: true,
  });
  let questions: QuizQuestion[];
  try {
    questions = parseJsonFromAI<QuizQuestion[]>(response);
  } catch (err) {
    console.error(`[generateQuiz] Failed to parse AI JSON response:`, (err as Error).message);
    console.error(`[generateQuiz] Raw AI Response was:`, response);
    throw new Error("AI returned invalid quiz format. Please try again.");
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("AI returned no questions. Please try again with more study material.");
  }
  return questions.map((q, i) => normalizeQuizQuestion(q, i));
}
