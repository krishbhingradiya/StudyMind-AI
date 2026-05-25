import { QuizQuestion } from "../../types";
export interface VerificationChallenge {
    method: string;
    questions?: QuizQuestion[];
    prompt?: string;
    minMinutes?: number;
    sessionId?: string;
}
export declare function buildVerificationChallenge(task: {
    task_title: string;
    subject?: string;
    topic?: string;
    description?: string;
    verification_method: string;
    metadata?: Record<string, unknown>;
}): Promise<VerificationChallenge>;
export declare function gradeMiniQuiz(questions: QuizQuestion[], answers: Record<string, number | string>): {
    score: number;
    passed: boolean;
    feedback: string;
};
export declare function gradeWrittenResponse(taskContext: string, studentAnswer: string): Promise<{
    score: number;
    passed: boolean;
    feedback: string;
}>;
//# sourceMappingURL=taskVerificationService.d.ts.map