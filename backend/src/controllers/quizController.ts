import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../config/supabase";
import { generateQuiz } from "../services/ai/quizService";
import { updateWeakTopicsFromQuiz } from "../services/ai/weakTopicService";
import { ensureUploadExtractedText } from "../services/uploadContentService";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { buildQuizScoreBreakdown } from "../utils/quizScoring";
import { isMissingColumnError } from "../utils/supabaseSchema";
import { validateQuizAnswer, validateQuizQuestionStructure } from "../utils/quizValidation";
import { QuizQuestion } from "../types";

const QUIZ_LIST_SELECT_EXTENDED =
  "id, topic, score, max_score, total_questions, correct_answers, wrong_answers, percentage_score, time_taken_seconds, created_at";
const QUIZ_LIST_SELECT_LEGACY =
  "id, topic, score, max_score, time_taken_seconds, created_at";

const generateSchema = z.object({
  uploadId: z.string().uuid().optional(),
  content: z.string().optional(),
  topic: z.string().default("General"),
  count: z.number().min(5).max(20).default(10),
});

const submitSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.record(z.union([z.string(), z.number()])),
  timeTakenSeconds: z.number().optional(),
});

export async function generateQuizHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.message, 400);

    const supabase = getSupabaseAdmin();
    let content = parsed.data.content || "";

    if (parsed.data.uploadId) {
      const extracted = await ensureUploadExtractedText(
        supabase,
        parsed.data.uploadId,
        req.user.id
      );
      if (!extracted && !content.trim()) {
        return sendError(
          res,
          "Upload not found or text could not be extracted. Supported formats: PDF, DOCX, PPTX, images, TXT.",
          404
        );
      }
      content = extracted || content;
    }

    if (!content.trim()) {
      return sendError(
        res,
        "No content for quiz generation. Select an uploaded file or paste study material.",
        400
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("university, branch, semester")
      .eq("id", req.user.id)
      .single();

    const { data: weakTopics } = await supabase
      .from("weak_topics")
      .select("topic_name")
      .eq("user_id", req.user.id)
      .lt("accuracy_percentage", 60);

    const questions = await generateQuiz({
      content,
      topic: parsed.data.topic,
      count: parsed.data.count,
      weakTopics: weakTopics?.map((w) => w.topic_name) || [],
      university: profile?.university,
      branch: profile?.branch,
      semester: profile?.semester,
    });

    const { data, error } = await supabase
      .from("quizzes")
      .insert({
        user_id: req.user.id,
        topic: parsed.data.topic,
        questions,
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, "Quiz generated", 201);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function submitQuiz(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.message, 400);

    const supabase = getSupabaseAdmin();
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", parsed.data.quizId)
      .eq("user_id", req.user.id)
      .single();

    if (!quiz) return sendError(res, "Quiz not found", 404);

    const questions = quiz.questions as QuizQuestion[];
    let score = 0;
    const results: { topic: string; correct: boolean }[] = [];
    const detailedResults: Array<{
      questionId: string;
      topic: string;
      userAnswer: number | string | undefined;
      expectedIndex: number;
      correct: boolean;
    }> = [];

    // Validate question structure first
    for (const q of questions) {
      const structureError = validateQuizQuestionStructure(q);
      if (structureError) {
        console.error(
          `[QUIZ_SUBMIT] Invalid question structure for quiz ${parsed.data.quizId}:`,
          structureError
        );
        return sendError(
          res,
          `Quiz has invalid structure: ${structureError}. Contact support.`,
          500
        );
      }
    }

    // Score each question using index-based validation ONLY
    for (const q of questions) {
      const userAnswer = parsed.data.answers[q.id];
      const correct = validateQuizAnswer(userAnswer, q);

      if (correct) score++;

      results.push({
        topic: q.topic || quiz.topic,
        correct,
      });

      detailedResults.push({
        questionId: q.id,
        topic: q.topic || quiz.topic,
        userAnswer,
        expectedIndex: q.correctAnswerIndex ?? -1,
        correct,
      });
    }

    // Log any validation issues for debugging
    const incorrectAnswers = detailedResults.filter((r) => !r.correct);
    if (incorrectAnswers.length > 0) {
      console.debug(
        `[QUIZ_SUBMIT] Quiz ${parsed.data.quizId} - ${incorrectAnswers.length}/${questions.length} incorrect`,
        incorrectAnswers.slice(0, 3) // Log first 3 for debugging
      );
    }

    await updateWeakTopicsFromQuiz(req.user.id, results);

    const breakdown = buildQuizScoreBreakdown(score, questions.length);
    if (!breakdown) {
      return sendError(res, "Invalid quiz score: no questions to grade", 400);
    }

    const legacyUpdate = {
      score,
      max_score: questions.length,
      answers: parsed.data.answers,
      time_taken_seconds: parsed.data.timeTakenSeconds,
    };
    const extendedUpdate = {
      ...legacyUpdate,
      total_questions: breakdown.totalQuestions,
      correct_answers: breakdown.correctAnswers,
      wrong_answers: breakdown.wrongAnswers,
      percentage_score: breakdown.percentageScore,
    };

    let { data, error } = await supabase
      .from("quizzes")
      .update(extendedUpdate)
      .eq("id", parsed.data.quizId)
      .select()
      .single();

    if (error && isMissingColumnError(error)) {
      ({ data, error } = await supabase
        .from("quizzes")
        .update(legacyUpdate)
        .eq("id", parsed.data.quizId)
        .select()
        .single());
    }

    if (error) return sendError(res, error.message, 500);

    await supabase.from("activity_logs").insert({
      user_id: req.user.id,
      action_type: "quiz",
      metadata: {
        topic: quiz.topic,
        correct_answers: breakdown.correctAnswers,
        total_questions: breakdown.totalQuestions,
        percentage_score: breakdown.percentageScore,
      },
    });

    return sendSuccess(res, {
      ...data,
      total_questions: breakdown.totalQuestions,
      correct_answers: breakdown.correctAnswers,
      wrong_answers: breakdown.wrongAnswers,
      percentage_score: breakdown.percentageScore,
      percentage: breakdown.percentageScore,
    });
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getQuizzes(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    let { data, error } = await supabase
      .from("quizzes")
      .select(QUIZ_LIST_SELECT_EXTENDED)
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error && isMissingColumnError(error)) {
      ({ data, error } = await supabase
        .from("quizzes")
        .select(QUIZ_LIST_SELECT_LEGACY)
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false }));
    }

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function retakeQuiz(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("quizzes")
      .select("id, questions")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (!existing) return sendError(res, "Quiz not found", 404);

    const questions = existing.questions as QuizQuestion[];
    if (!questions?.length) return sendError(res, "This quiz has no questions", 400);

    const legacyReset = {
      score: null,
      max_score: null,
      answers: null,
      time_taken_seconds: null,
    };
    const extendedReset = {
      ...legacyReset,
      total_questions: null,
      correct_answers: null,
      wrong_answers: null,
      percentage_score: null,
    };

    let { data, error } = await supabase
      .from("quizzes")
      .update(extendedReset)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && isMissingColumnError(error)) {
      ({ data, error } = await supabase
        .from("quizzes")
        .update(legacyReset)
        .eq("id", req.params.id)
        .eq("user_id", req.user.id)
        .select()
        .single());
    }

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, "Quiz reset — good luck on your re-quiz!");
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getQuizById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (error || !data) return sendError(res, "Quiz not found", 404);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}
