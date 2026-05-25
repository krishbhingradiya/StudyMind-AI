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
/** Clamp and round a percentage to 0–100. Returns null if input is not a finite number. */
export declare function clampPercentage(value: number): number | null;
/** True when the quiz has a completed, scorable attempt. */
export declare function isCompletedQuiz(quiz: QuizScoreInput): boolean;
/**
 * Derive a 0–100 percentage from stored quiz fields.
 * Prefers persisted percentage_score; otherwise correct/total.
 */
export declare function getQuizPercentage(quiz: QuizScoreInput): number | null;
/** Build normalized score fields for persistence on quiz submit. */
export declare function buildQuizScoreBreakdown(correctAnswers: number, totalQuestions: number): QuizScoreBreakdown | null;
/** Average of percentage scores; null when no valid quizzes. */
export declare function averageQuizPercentages(percentages: (number | null)[]): number | null;
/** Clamp any metric to 0–100 for dashboard display. */
export declare function clampMetric(value: number): number;
//# sourceMappingURL=quizScoring.d.ts.map