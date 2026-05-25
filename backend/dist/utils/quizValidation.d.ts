import { QuizQuestion } from "../types";
/**
 * Validates a user's quiz answer using correctAnswerIndex only.
 * NEVER uses text comparison.
 *
 * @param userAnswer - The user's selected option index (0-based)
 * @param question - The quiz question object
 * @returns true if answer is correct, false otherwise
 */
export declare function validateQuizAnswer(userAnswer: number | string | undefined, question: QuizQuestion): boolean;
/**
 * Validates that a quiz question has all required fields for proper scoring.
 * @returns error message if invalid, null if valid
 */
export declare function validateQuizQuestionStructure(question: QuizQuestion): string | null;
/**
 * Logs validation errors with context for debugging
 */
export declare function logValidationError(questionId: string, userAnswer: number | string | undefined, expectedIndex: number, options: string[], details?: Record<string, any>): void;
//# sourceMappingURL=quizValidation.d.ts.map