"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clampPercentage = clampPercentage;
exports.isCompletedQuiz = isCompletedQuiz;
exports.getQuizPercentage = getQuizPercentage;
exports.buildQuizScoreBreakdown = buildQuizScoreBreakdown;
exports.averageQuizPercentages = averageQuizPercentages;
exports.clampMetric = clampMetric;
const MIN_PERCENT = 0;
const MAX_PERCENT = 100;
/** Clamp and round a percentage to 0–100. Returns null if input is not a finite number. */
function clampPercentage(value) {
    if (!Number.isFinite(value))
        return null;
    return Math.round(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value)));
}
/** True when the quiz has a completed, scorable attempt. */
function isCompletedQuiz(quiz) {
    const total = quiz.total_questions ?? quiz.max_score ?? null;
    const correct = quiz.correct_answers ?? quiz.score ?? null;
    if (correct == null)
        return false;
    const totalNum = Number(total);
    if (!Number.isFinite(totalNum) || totalNum <= 0)
        return false;
    const correctNum = Number(correct);
    return Number.isFinite(correctNum) && correctNum >= 0 && correctNum <= totalNum;
}
/**
 * Derive a 0–100 percentage from stored quiz fields.
 * Prefers persisted percentage_score; otherwise correct/total.
 */
function getQuizPercentage(quiz) {
    if (!isCompletedQuiz(quiz))
        return null;
    const stored = quiz.percentage_score;
    if (stored != null && Number.isFinite(Number(stored))) {
        return clampPercentage(Number(stored));
    }
    const total = Number(quiz.total_questions ?? quiz.max_score);
    const correct = Number(quiz.correct_answers ?? quiz.score);
    if (total <= 0)
        return null;
    return clampPercentage((correct / total) * 100);
}
/** Build normalized score fields for persistence on quiz submit. */
function buildQuizScoreBreakdown(correctAnswers, totalQuestions) {
    if (!Number.isFinite(totalQuestions) || totalQuestions <= 0)
        return null;
    if (!Number.isFinite(correctAnswers) ||
        correctAnswers < 0 ||
        correctAnswers > totalQuestions) {
        return null;
    }
    const wrongAnswers = totalQuestions - correctAnswers;
    const percentageScore = clampPercentage((correctAnswers / totalQuestions) * 100) ?? 0;
    return {
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        percentageScore,
    };
}
/** Average of percentage scores; null when no valid quizzes. */
function averageQuizPercentages(percentages) {
    const valid = percentages.filter((p) => p !== null && Number.isFinite(p));
    if (valid.length === 0)
        return null;
    const sum = valid.reduce((acc, p) => acc + p, 0);
    return clampPercentage(sum / valid.length);
}
/** Clamp any metric to 0–100 for dashboard display. */
function clampMetric(value) {
    if (!Number.isFinite(value))
        return 0;
    return Math.round(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value)));
}
//# sourceMappingURL=quizScoring.js.map