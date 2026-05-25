import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../config/supabase";
import { getWeakTopics } from "../services/ai/weakTopicService";
import { sendSuccess, sendError } from "../utils/apiResponse";
import {
  averageQuizPercentages,
  clampMetric,
  getQuizPercentage,
  isCompletedQuiz,
} from "../utils/quizScoring";
import { isMissingColumnError } from "../utils/supabaseSchema";
import type { SupabaseClient } from "@supabase/supabase-js";

const QUIZ_ANALYTICS_SELECT_EXTENDED =
  "score, max_score, total_questions, correct_answers, wrong_answers, percentage_score, topic, created_at, time_taken_seconds";
const QUIZ_ANALYTICS_SELECT_LEGACY =
  "score, max_score, topic, created_at, time_taken_seconds";

async function fetchCompletedQuizzes(supabase: SupabaseClient, userId: string) {
  let result = await supabase
    .from("quizzes")
    .select(QUIZ_ANALYTICS_SELECT_EXTENDED)
    .eq("user_id", userId)
    .not("score", "is", null);

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from("quizzes")
      .select(QUIZ_ANALYTICS_SELECT_LEGACY)
      .eq("user_id", userId)
      .not("score", "is", null);
  }

  return result;
}

interface QuizRow {
  score: number | null;
  max_score: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  percentage_score: number | null;
  topic: string;
  created_at: string;
  time_taken_seconds?: number | null;
}

function computeWeakTopicScore(weakTopics: { accuracy_percentage: number }[]): number {
  if (weakTopics.length === 0) return 100;
  const penalty =
    weakTopics.reduce(
      (acc, t) => acc + Math.max(0, 60 - Math.min(60, Number(t.accuracy_percentage) || 0)),
      0
    ) / weakTopics.length;
  return clampMetric(100 - penalty);
}

function computeStudyConsistency(
  activities: { created_at: string }[],
  windowDays = 14
): number {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const activeDays = new Set<string>();
  for (const a of activities) {
    const ts = new Date(a.created_at).getTime();
    if (ts >= cutoff) activeDays.add(a.created_at.split("T")[0]);
  }
  const targetDays = 7;
  return clampMetric((activeDays.size / targetDays) * 100);
}

function computeWeeklyImprovement(
  quizzes: { percentage: number | null; created_at: string }[]
): number | null {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeek: number[] = [];
  const lastWeek: number[] = [];

  for (const q of quizzes) {
    if (q.percentage == null) continue;
    const age = now - new Date(q.created_at).getTime();
    if (age <= weekMs) thisWeek.push(q.percentage);
    else if (age <= weekMs * 2) lastWeek.push(q.percentage);
  }

  if (thisWeek.length === 0 || lastWeek.length === 0) return null;
  const thisAvg = thisWeek.reduce((a, b) => a + b, 0) / thisWeek.length;
  const lastAvg = lastWeek.reduce((a, b) => a + b, 0) / lastWeek.length;
  return Math.round(thisAvg - lastAvg);
}

function computeTopicPerformance(
  quizzes: { percentage: number | null; topic: string }[]
): { topic: string; avgScore: number; attempts: number }[] {
  const byTopic: Record<string, number[]> = {};
  for (const q of quizzes) {
    if (q.percentage == null) continue;
    if (!byTopic[q.topic]) byTopic[q.topic] = [];
    byTopic[q.topic].push(q.percentage);
  }
  return Object.entries(byTopic)
    .map(([topic, scores]) => ({
      topic,
      avgScore: clampMetric(scores.reduce((a, b) => a + b, 0) / scores.length),
      attempts: scores.length,
    }))
    .sort((a, b) => a.avgScore - b.avgScore);
}

export async function getDashboardAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    const userId = req.user.id;

    const [quizzes, uploads, roadmaps, activities, weakTopics] = await Promise.all([
      fetchCompletedQuizzes(supabase, userId),
      supabase.from("uploads").select("id").eq("user_id", userId),
      supabase.from("roadmaps").select("progress_percentage").eq("user_id", userId),
      supabase
        .from("activity_logs")
        .select("action_type, created_at")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      getWeakTopics(userId),
    ]);

    if (quizzes.error) return sendError(res, quizzes.error.message, 500);

    const allRows = (quizzes.data || []) as QuizRow[];
    const completedQuizzes = allRows.filter(isCompletedQuiz);

    const percentages = completedQuizzes.map((q) => getQuizPercentage(q));
    const avgQuizScore = averageQuizPercentages(percentages);
    const hasQuizData = completedQuizzes.length > 0;

    const roadmapProgress =
      roadmaps.data && roadmaps.data.length > 0
        ? clampMetric(
            roadmaps.data.reduce((acc, r) => acc + (Number(r.progress_percentage) || 0), 0) /
              roadmaps.data.length
          )
        : 0;

    const strongTopics = weakTopics.filter((t) => Number(t.accuracy_percentage) >= 70);
    const weakTopicsList = weakTopics.filter((t) => Number(t.accuracy_percentage) < 60);

    const activityByDay: Record<string, number> = {};
    (activities.data || []).forEach((a) => {
      const day = a.created_at.split("T")[0];
      activityByDay[day] = (activityByDay[day] || 0) + 1;
    });

    const scoredQuizzes = completedQuizzes.map((q) => ({
      topic: q.topic,
      created_at: q.created_at,
      percentage: getQuizPercentage(q),
    }));

    const quizPerformance = scoredQuizzes.slice(-10).map((q) => ({
      date: q.created_at.split("T")[0],
      score: q.percentage ?? 0,
      topic: q.topic,
    }));

    const weakTopicScore = computeWeakTopicScore(weakTopicsList);
    const studyConsistency = computeStudyConsistency(activities.data || []);
    const quizComponent = avgQuizScore ?? 0;

    const examReadiness = (!hasQuizData && roadmapProgress === 0) 
      ? 0 
      : clampMetric(
          quizComponent * 0.4 +
            roadmapProgress * 0.3 +
            weakTopicScore * 0.2 +
            studyConsistency * 0.1
        );

    const weeklyImprovement = computeWeeklyImprovement(scoredQuizzes);
    const topicPerformance = computeTopicPerformance(scoredQuizzes);

    const avgTimeSeconds =
      completedQuizzes.length > 0
        ? Math.round(
            completedQuizzes.reduce(
              (acc, q) => acc + (Number(q.time_taken_seconds) || 0),
              0
            ) / completedQuizzes.length
          )
        : null;

    return sendSuccess(res, {
      stats: {
        totalQuizzes: completedQuizzes.length,
        totalUploads: uploads.data?.length || 0,
        avgQuizScore: avgQuizScore ?? null,
        hasQuizData,
        roadmapProgress,
        examReadiness,
        weakTopicCount: weakTopicsList.length,
        strongTopicCount: strongTopics.length,
        weeklyImprovement,
        avgTimeSeconds,
        studyConsistency,
      },
      weakTopics: weakTopicsList,
      strongTopics,
      activityByDay,
      quizPerformance,
      topicPerformance,
      masteryLevel:
        avgQuizScore == null
          ? "none"
          : avgQuizScore >= 80
            ? "advanced"
            : avgQuizScore >= 60
              ? "proficient"
              : avgQuizScore >= 40
                ? "developing"
                : "beginner",
    });
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}
