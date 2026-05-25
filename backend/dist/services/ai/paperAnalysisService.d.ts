import { PaperAnalysis } from "../../types";
import type { PredictedExamPaper } from "../../types/predictedExamPaper";
import { z } from "zod";
export declare const predictedExamPaperSchema: z.ZodObject<{
    university: z.ZodString;
    examTitle: z.ZodString;
    subject: z.ZodString;
    subjectCode: z.ZodOptional<z.ZodString>;
    branch: z.ZodOptional<z.ZodString>;
    semester: z.ZodOptional<z.ZodString>;
    examDate: z.ZodString;
    durationMinutes: z.ZodNumber;
    totalMarks: z.ZodNumber;
    examType: z.ZodString;
    instructions: z.ZodArray<z.ZodString, "many">;
    sections: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        sectionMarks: z.ZodNumber;
        attemptRule: z.ZodString;
        questions: z.ZodArray<z.ZodObject<{
            number: z.ZodString;
            marks: z.ZodNumber;
            text: z.ZodString;
            subparts: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                marks: z.ZodNumber;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                text: string;
                label: string;
                marks: number;
            }, {
                text: string;
                label: string;
                marks: number;
            }>, "many">>;
            note: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            text: string;
            marks: number;
            subparts?: {
                text: string;
                label: string;
                marks: number;
            }[] | undefined;
            note?: string | undefined;
        }, {
            number: string;
            text: string;
            marks: number;
            subparts?: {
                text: string;
                label: string;
                marks: number;
            }[] | undefined;
            note?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        title: string;
        questions: {
            number: string;
            text: string;
            marks: number;
            subparts?: {
                text: string;
                label: string;
                marks: number;
            }[] | undefined;
            note?: string | undefined;
        }[];
        sectionMarks: number;
        attemptRule: string;
    }, {
        title: string;
        questions: {
            number: string;
            text: string;
            marks: number;
            subparts?: {
                text: string;
                label: string;
                marks: number;
            }[] | undefined;
            note?: string | undefined;
        }[];
        sectionMarks: number;
        attemptRule: string;
    }>, "many">;
    footerNote: z.ZodString;
}, "strip", z.ZodTypeAny, {
    subject: string;
    university: string;
    examDate: string;
    examTitle: string;
    durationMinutes: number;
    totalMarks: number;
    examType: string;
    instructions: string[];
    sections: {
        title: string;
        questions: {
            number: string;
            text: string;
            marks: number;
            subparts?: {
                text: string;
                label: string;
                marks: number;
            }[] | undefined;
            note?: string | undefined;
        }[];
        sectionMarks: number;
        attemptRule: string;
    }[];
    footerNote: string;
    branch?: string | undefined;
    semester?: string | undefined;
    subjectCode?: string | undefined;
}, {
    subject: string;
    university: string;
    examDate: string;
    examTitle: string;
    durationMinutes: number;
    totalMarks: number;
    examType: string;
    instructions: string[];
    sections: {
        title: string;
        questions: {
            number: string;
            text: string;
            marks: number;
            subparts?: {
                text: string;
                label: string;
                marks: number;
            }[] | undefined;
            note?: string | undefined;
        }[];
        sectionMarks: number;
        attemptRule: string;
    }[];
    footerNote: string;
    branch?: string | undefined;
    semester?: string | undefined;
    subjectCode?: string | undefined;
}>;
export declare const paperAnalysisSchema: z.ZodObject<{
    repeatedTopics: z.ZodArray<z.ZodString, "many">;
    examPatterns: z.ZodArray<z.ZodString, "many">;
    importantChapters: z.ZodArray<z.ZodString, "many">;
    highPriorityQuestions: z.ZodArray<z.ZodString, "many">;
    predictedTopics: z.ZodArray<z.ZodString, "many">;
    confidenceScore: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    chapterWeightage: z.ZodOptional<z.ZodArray<z.ZodObject<{
        chapter: z.ZodString;
        weightage: z.ZodNumber;
        importanceScore: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        chapter: string;
        weightage: number;
        importanceScore: number;
    }, {
        chapter: string;
        weightage: number;
        importanceScore: number;
    }>, "many">>;
    unitFrequency: z.ZodOptional<z.ZodArray<z.ZodObject<{
        unit: z.ZodString;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
        unit: string;
    }, {
        count: number;
        unit: string;
    }>, "many">>;
    difficultyAnalysis: z.ZodOptional<z.ZodObject<{
        difficulty: z.ZodEnum<["Easy", "Medium", "Hard"]>;
        reasoning: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        difficulty: "Easy" | "Medium" | "Hard";
        reasoning: string;
    }, {
        difficulty: "Easy" | "Medium" | "Hard";
        reasoning: string;
    }>>;
    trendAnalysis: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    examPatterns: string[];
    repeatedTopics: string[];
    importantChapters: string[];
    highPriorityQuestions: string[];
    predictedTopics: string[];
    confidenceScore: number;
    difficultyAnalysis?: {
        difficulty: "Easy" | "Medium" | "Hard";
        reasoning: string;
    } | undefined;
    chapterWeightage?: {
        chapter: string;
        weightage: number;
        importanceScore: number;
    }[] | undefined;
    unitFrequency?: {
        count: number;
        unit: string;
    }[] | undefined;
    trendAnalysis?: string[] | undefined;
}, {
    examPatterns: string[];
    repeatedTopics: string[];
    importantChapters: string[];
    highPriorityQuestions: string[];
    predictedTopics: string[];
    difficultyAnalysis?: {
        difficulty: "Easy" | "Medium" | "Hard";
        reasoning: string;
    } | undefined;
    confidenceScore?: number | undefined;
    chapterWeightage?: {
        chapter: string;
        weightage: number;
        importanceScore: number;
    }[] | undefined;
    unitFrequency?: {
        count: number;
        unit: string;
    }[] | undefined;
    trendAnalysis?: string[] | undefined;
}>;
export declare function analyzePastPaper(extractedText: string, subject: string, university?: string): Promise<PaperAnalysis>;
export declare function generatePredictedPaper(analysis: PaperAnalysis, options: {
    subject: string;
    university?: string;
    branch?: string;
    semester?: string | number;
    year?: number;
    questionCount?: number;
    examPatterns?: string[];
    totalMarks?: number;
}): Promise<PredictedExamPaper>;
export declare function generateMultiPaperPrediction(papers: Array<{
    year?: number | null;
    university?: string | null;
    analysis: PaperAnalysis;
}>, options: {
    subject: string;
    university?: string;
    branch?: string;
    semester?: string | number;
    questionCount?: number;
    totalMarks?: number;
}): Promise<PredictedExamPaper>;
//# sourceMappingURL=paperAnalysisService.d.ts.map