/** Quiz row fields used for score derivation (DB + API). */
export interface QuizScoreInput {
  score?: number | null;
  max_score?: number | null;
  percentage_score?: number | null;
  total_questions?: number | null;
  correct_answers?: number | null;
}

export interface QuizScoreBreakdown {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentageScore: number;
}

const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

/** Clamp and round a percentage to 0–100. Returns null if input is not a finite number. */
export function clampPercentage(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.round(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value)));
}

/** True when the quiz has a completed, scorable attempt. */
export function isCompletedQuiz(quiz: QuizScoreInput): boolean {
  const total =
    quiz.total_questions ?? quiz.max_score ?? null;
  const correct =
    quiz.correct_answers ?? quiz.score ?? null;

  if (correct == null) return false;
  const totalNum = Number(total);
  if (!Number.isFinite(totalNum) || totalNum <= 0) return false;
  const correctNum = Number(correct);
  return Number.isFinite(correctNum) && correctNum >= 0 && correctNum <= totalNum;
}

/**
 * Derive a 0–100 percentage from stored quiz fields.
 * Prefers persisted percentage_score; otherwise correct/total.
 */
export function getQuizPercentage(quiz: QuizScoreInput): number | null {
  if (!isCompletedQuiz(quiz)) return null;

  const stored = quiz.percentage_score;
  if (stored != null && Number.isFinite(Number(stored))) {
    return clampPercentage(Number(stored));
  }

  const total = Number(quiz.total_questions ?? quiz.max_score);
  const correct = Number(quiz.correct_answers ?? quiz.score);
  if (total <= 0) return null;

  return clampPercentage((correct / total) * 100);
}

/** Build normalized score fields for persistence on quiz submit. */
export function buildQuizScoreBreakdown(
  correctAnswers: number,
  totalQuestions: number
): QuizScoreBreakdown | null {
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) return null;
  if (
    !Number.isFinite(correctAnswers) ||
    correctAnswers < 0 ||
    correctAnswers > totalQuestions
  ) {
    return null;
  }

  const wrongAnswers = totalQuestions - correctAnswers;
  const percentageScore =
    clampPercentage((correctAnswers / totalQuestions) * 100) ?? 0;

  return {
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    percentageScore,
  };
}

/** Average of percentage scores; null when no valid quizzes. */
export function averageQuizPercentages(
  percentages: (number | null)[]
): number | null {
  const valid = percentages.filter(
    (p): p is number => p !== null && Number.isFinite(p)
  );
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, p) => acc + p, 0);
  return clampPercentage(sum / valid.length);
}

/** Clamp any metric to 0–100 for dashboard display. */
export function clampMetric(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value)));
}
