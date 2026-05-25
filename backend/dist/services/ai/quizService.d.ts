import { QuizQuestion } from "../../types";
interface QuizGenerationInput {
    content: string;
    topic?: string;
    count?: number;
    weakTopics?: string[];
    university?: string;
    branch?: string;
    semester?: number;
}
export declare function generateQuiz(input: QuizGenerationInput): Promise<QuizQuestion[]>;
export {};
//# sourceMappingURL=quizService.d.ts.map