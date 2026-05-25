export interface QuizScoreFields {
  score?: number | null;
  max_score?: number | null;
  percentage_score?: number | null;
  total_questions?: number | null;
  correct_answers?: number | null;
}

export function getQuizPercentage(quiz: QuizScoreFields): number | null {
  const stored = quiz.percentage_score;
  if (stored != null && Number.isFinite(Number(stored))) {
    return Math.min(100, Math.max(0, Math.round(Number(stored))));
  }

  const total = quiz.total_questions ?? quiz.max_score;
  const correct = quiz.correct_answers ?? quiz.score;
  if (correct == null || total == null || Number(total) <= 0) return null;

  return Math.min(
    100,
    Math.max(0, Math.round((Number(correct) / Number(total)) * 100))
  );
}

export function formatQuizScoreLabel(quiz: QuizScoreFields): string | null {
  const pct = getQuizPercentage(quiz);
  if (pct == null) return null;

  const correct = quiz.correct_answers ?? quiz.score ?? 0;
  const total = quiz.total_questions ?? quiz.max_score ?? 0;
  return `${pct}% (${correct}/${total})`;
}

export function formatMetricPercent(
  value: number | null | undefined,
  hasData?: boolean
): string {
  if (hasData === false || value == null || !Number.isFinite(value)) {
    return "No quiz data yet";
  }
  return `${Math.min(100, Math.max(0, Math.round(value)))}%`;
}
