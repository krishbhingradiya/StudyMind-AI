import { QuizQuestion } from "../types";

/**
 * Validates a user's quiz answer using correctAnswerIndex only.
 * NEVER uses text comparison.
 * 
 * @param userAnswer - The user's selected option index (0-based)
 * @param question - The quiz question object
 * @returns true if answer is correct, false otherwise
 */
export function validateQuizAnswer(
  userAnswer: number | string | undefined,
  question: QuizQuestion
): boolean {
  // For MCQ questions only
  if (question.type !== "mcq") {
    return false;
  }

  // Ensure correctAnswerIndex exists and is valid
  if (
    question.correctAnswerIndex == null ||
    !Number.isFinite(question.correctAnswerIndex)
  ) {
    console.error(
      `[QUIZ_VALIDATION] Question ${question.id} has invalid correctAnswerIndex:`,
      question.correctAnswerIndex
    );
    return false;
  }

  // Ensure options array exists
  if (!Array.isArray(question.options) || question.options.length === 0) {
    console.error(`[QUIZ_VALIDATION] Question ${question.id} has no options`);
    return false;
  }

  // Ensure correctAnswerIndex is within bounds
  if (
    question.correctAnswerIndex < 0 ||
    question.correctAnswerIndex >= question.options.length
  ) {
    console.error(
      `[QUIZ_VALIDATION] Question ${question.id} has out-of-bounds correctAnswerIndex:`,
      question.correctAnswerIndex,
      "Total options:",
      question.options.length
    );
    return false;
  }

  // Convert userAnswer to number if it's a string
  let userAnswerIndex: number | null = null;

  if (typeof userAnswer === "number") {
    userAnswerIndex = userAnswer;
  } else if (typeof userAnswer === "string") {
    const parsed = parseInt(userAnswer, 10);
    if (Number.isFinite(parsed)) {
      userAnswerIndex = parsed;
    } else {
      console.warn(
        `[QUIZ_VALIDATION] Could not parse user answer as number:`,
        userAnswer,
        "for question",
        question.id
      );
      return false;
    }
  } else if (userAnswer === undefined || userAnswer === null) {
    console.warn(
      `[QUIZ_VALIDATION] User did not provide answer for question:`,
      question.id
    );
    return false;
  }

  // Validate bounds on user's answer
  if (userAnswerIndex !== null && userAnswerIndex !== undefined) {
    if (userAnswerIndex < 0 || userAnswerIndex >= question.options.length) {
      console.warn(
        `[QUIZ_VALIDATION] User answer index out of bounds:`,
        userAnswerIndex,
        "for question",
        question.id,
        "with",
        question.options.length,
        "options"
      );
      return false;
    }

    // EXACT match check
    const isCorrect = userAnswerIndex === question.correctAnswerIndex;

    if (!isCorrect) {
      console.debug(
        `[QUIZ_VALIDATION] Incorrect answer for Q${question.id}:`,
        `User selected index ${userAnswerIndex} (${question.options[userAnswerIndex]}),`,
        `Correct answer is index ${question.correctAnswerIndex} (${question.options[question.correctAnswerIndex]})`
      );
    }

    return isCorrect;
  }

  return false;
}

/**
 * Validates that a quiz question has all required fields for proper scoring.
 * @returns error message if invalid, null if valid
 */
export function validateQuizQuestionStructure(question: QuizQuestion): string | null {
  if (!question.id) {
    return `Question missing id`;
  }

  if (question.type === "mcq") {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      return `Question ${question.id}: MCQ must have at least 2 options`;
    }

    if (
      !Number.isFinite(question.correctAnswerIndex) ||
      question.correctAnswerIndex == null
    ) {
      return `Question ${question.id}: MCQ missing valid correctAnswerIndex`;
    }

    if (
      question.correctAnswerIndex < 0 ||
      question.correctAnswerIndex >= question.options.length
    ) {
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
export function logValidationError(
  questionId: string,
  userAnswer: number | string | undefined,
  expectedIndex: number,
  options: string[],
  details?: Record<string, any>
): void {
  console.error(
    `[QUIZ_VALIDATION_ERROR] Question: ${questionId}`,
    {
      userAnswer,
      expectedIndex,
      optionsCount: options.length,
      ...details,
    }
  );
}
