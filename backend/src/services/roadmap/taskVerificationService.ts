import { generateAI, parseJsonFromAI } from "../ai/aiClient";
import { QuizQuestion } from "../../types";
import { isTaskPassed } from "./roadmapProgressService";
import { validateQuizAnswer } from "../../utils/quizValidation";

const MIN_QUIZ_QUESTIONS = 3;

export interface VerificationChallenge {
  method: string;
  questions?: QuizQuestion[];
  prompt?: string;
  minMinutes?: number;
  sessionId?: string;
}

export async function buildVerificationChallenge(
  task: {
    task_title: string;
    subject?: string;
    topic?: string;
    description?: string;
    verification_method: string;
    metadata?: Record<string, unknown>;
  }
): Promise<VerificationChallenge> {
  const method = task.verification_method || "mini_quiz";
  const context = `${task.subject || "General"} — ${task.topic || task.task_title}: ${task.description || ""}`;

  if (method === "mini_quiz") {
    const messages = [
      {
        role: "system" as const,
        content: `Generate exactly 4 short MCQ questions to verify the student learned this topic. 
CRITICAL: Provide correctAnswerIndex (0-based) for each question, NOT correctAnswer text.
Return ONLY JSON array:
[{"id":"v1","type":"mcq","question":"...","options":["A","B","C","D"],"correctAnswerIndex":0,"explanation":"brief","topic":"..."}]`,
      },
      { role: "user" as const, content: context },
    ];
    const response = await generateAI(messages, { maxTokens: 1500, temperature: 0.5, preferFast: true });
    const questions = parseJsonFromAI<QuizQuestion[]>(response);
    return { method, questions: questions.slice(0, 5) };
  }

  if (method === "scenario") {
    const messages = [
      {
        role: "system" as const,
        content: `Return ONLY JSON: {"prompt":"One realistic scenario question requiring conceptual understanding","sampleAnswer":"brief model answer"}`,
      },
      { role: "user" as const, content: context },
    ];
    const response = await generateAI(messages, { maxTokens: 800, preferFast: true });
    const parsed = parseJsonFromAI<{ prompt: string; sampleAnswer: string }>(response);
    return { method, prompt: parsed.prompt };
  }

  if (method === "writing") {
    return {
      method,
      prompt: `In 4–6 sentences, explain the key concepts for: ${task.topic || task.task_title} (${task.subject || "your subject"}). Be specific and accurate.`,
    };
  }

  if (method === "timer") {
    const minMinutes = Number(task.metadata?.minMinutes) || 15;
    return { method, minMinutes, prompt: `Study this task for at least ${minMinutes} minutes, then end your session.` };
  }

  // practice — text-based proof for MVP
  return {
    method: "writing",
    prompt: `Describe what you practiced for "${task.task_title}" and show your understanding with examples or steps you completed.`,
  };
}

export function gradeMiniQuiz(
  questions: QuizQuestion[],
  answers: Record<string, number | string>
): { score: number; passed: boolean; feedback: string } {
  let correct = 0;
  for (const q of questions) {
    const isCorrect = validateQuizAnswer(answers[q.id], q);
    if (isCorrect) correct++;
  }
  const score = questions.length
    ? Math.round((correct / questions.length) * 100)
    : 0;
  const passed = isTaskPassed(score);
  return {
    score,
    passed,
    feedback: passed
      ? `Great work! ${correct}/${questions.length} correct.`
      : `Need ${70}% to pass. You got ${correct}/${questions.length}. Review and try again.`,
  };
}

export async function gradeWrittenResponse(
  taskContext: string,
  studentAnswer: string
): Promise<{ score: number; passed: boolean; feedback: string }> {
  const messages = [
    {
      role: "system" as const,
      content: `You grade university student answers. Return ONLY JSON: {"score":0-100,"passed":boolean,"feedback":"2 sentences"}
Pass if score >= 70. Be fair but rigorous.`,
    },
    {
      role: "user" as const,
      content: `Task: ${taskContext}\n\nStudent answer:\n${studentAnswer}`,
    },
  ];
  const response = await generateAI(messages, { maxTokens: 500, temperature: 0.3, preferFast: true });
  const result = parseJsonFromAI<{ score: number; passed: boolean; feedback: string }>(response);
  const score = Math.min(100, Math.max(0, Math.round(result.score)));
  const passed = result.passed ?? isTaskPassed(score);
  return { score, passed, feedback: result.feedback || (passed ? "Verified!" : "Keep studying and retry.") };
}
