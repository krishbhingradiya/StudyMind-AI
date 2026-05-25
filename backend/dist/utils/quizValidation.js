"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuizAnswer = validateQuizAnswer;
exports.validateQuizQuestionStructure = validateQuizQuestionStructure;
exports.logValidationError = logValidationError;
/**
 * Validates a user's quiz answer using correctAnswerIndex only.
 * NEVER uses text comparison.
 *
 * @param userAnswer - The user's selected option index (0-based)
 * @param question - The quiz question object
 * @returns true if answer is correct, false otherwise
 */
function validateQuizAnswer(userAnswer, question) {
    // For MCQ questions only
    if (question.type !== "mcq") {
        return false;
    }
    // Ensure correctAnswerIndex exists and is valid
    if (question.correctAnswerIndex == null ||
        !Number.isFinite(question.correctAnswerIndex)) {
        console.error(`[QUIZ_VALIDATION] Question ${question.id} has invalid correctAnswerIndex:`, question.correctAnswerIndex);
        return false;
    }
    // Ensure options array exists
    if (!Array.isArray(question.options) || question.options.length === 0) {
        console.error(`[QUIZ_VALIDATION] Question ${question.id} has no options`);
        return false;
    }
    // Ensure correctAnswerIndex is within bounds
    if (question.correctAnswerIndex < 0 ||
        question.correctAnswerIndex >= question.options.length) {
        console.error(`[QUIZ_VALIDATION] Question ${question.id} has out-of-bounds correctAnswerIndex:`, question.correctAnswerIndex, "Total options:", question.options.length);
        return false;
    }
    // Convert userAnswer to number if it's a string
    let userAnswerIndex = null;
    if (typeof userAnswer === "number") {
        userAnswerIndex = userAnswer;
    }
    else if (typeof userAnswer === "string") {
        const parsed = parseInt(userAnswer, 10);
        if (Number.isFinite(parsed)) {
            userAnswerIndex = parsed;
        }
        else {
            console.warn(`[QUIZ_VALIDATION] Could not parse user answer as number:`, userAnswer, "for question", question.id);
            return false;
        }
    }
    else if (userAnswer === undefined || userAnswer === null) {
        console.warn(`[QUIZ_VALIDATION] User did not provide answer for question:`, question.id);
        return false;
    }
    // Validate bounds on user's answer
    if (userAnswerIndex < 0 || userAnswerIndex >= question.options.length) {
        console.warn(`[QUIZ_VALIDATION] User answer index out of bounds:`, userAnswerIndex, "for question", question.id, "with", question.options.length, "options");
        return false;
    }
    // EXACT match check
    const isCorrect = userAnswerIndex === question.correctAnswerIndex;
    if (!isCorrect) {
        console.debug(`[QUIZ_VALIDATION] Incorrect answer for Q${question.id}:`, `User selected index ${userAnswerIndex} (${question.options[userAnswerIndex]}),`, `Correct answer is index ${question.correctAnswerIndex} (${question.options[question.correctAnswerIndex]})`);
    }
    return isCorrect;
}
/**
 * Validates that a quiz question has all required fields for proper scoring.
 * @returns error message if invalid, null if valid
 */
function validateQuizQuestionStructure(question) {
    if (!question.id) {
        return `Question missing id`;
    }
    if (question.type === "mcq") {
        if (!Array.isArray(question.options) || question.options.length < 2) {
            return `Question ${question.id}: MCQ must have at least 2 options`;
        }
        if (!Number.isFinite(question.correctAnswerIndex) ||
            question.correctAnswerIndex == null) {
            return `Question ${question.id}: MCQ missing valid correctAnswerIndex`;
        }
        if (question.correctAnswerIndex < 0 ||
            question.correctAnswerIndex >= question.options.length) {
            return `Question ${question.id}: correctAnswerIndex ${question.correctAnswerIndex} out of bounds (0-${question.options.length - 1})`;
        }
        // Ensure all options are strings
        for (let i = 0; i < question.options.length; i++) {
            if (typeof question.options[i] !== "string") {
                return `Question ${question.id}: Option ${i} is not a string`;
            }
        }
    }
    return null;
}
/**
 * Logs validation errors with context for debugging
 */
function logValidationError(questionId, userAnswer, expectedIndex, options, details) {
    console.error(`[QUIZ_VALIDATION_ERROR] Question: ${questionId}`, {
        userAnswer,
        expectedIndex,
        optionsCount: options.length,
        ...details,
    });
}
//# sourceMappingURL=quizValidation.js.map