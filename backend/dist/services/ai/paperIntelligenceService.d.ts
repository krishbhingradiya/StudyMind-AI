import { z } from "zod";
export declare const combinedAnalysisSchema: z.ZodObject<{
    confidenceScore: z.ZodNumber;
    difficultyAnalysis: z.ZodObject<{
        difficulty: z.ZodEnum<["Easy", "Medium", "Hard"]>;
        reasoning: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        difficulty: "Easy" | "Medium" | "Hard";
        reasoning: string;
    }, {
        difficulty: "Easy" | "Medium" | "Hard";
        reasoning: string;
    }>;
    repeatedTopics: z.ZodArray<z.ZodObject<{
        topic: z.ZodString;
        frequencyPercentage: z.ZodNumber;
        importance: z.ZodEnum<["High", "Medium", "Low"]>;
    }, "strip", z.ZodTypeAny, {
        topic: string;
        frequencyPercentage: number;
        importance: "Medium" | "High" | "Low";
    }, {
        topic: string;
        frequencyPercentage: number;
        importance: "Medium" | "High" | "Low";
    }>, "many">;
    chapterWeightage: z.ZodArray<z.ZodObject<{
        chapter: z.ZodString;
        expectedMarks: z.ZodNumber;
        unitLabel: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        chapter: string;
        expectedMarks: number;
        unitLabel: string;
    }, {
        chapter: string;
        expectedMarks: number;
        unitLabel: string;
    }>, "many">;
    predictedPatterns: z.ZodArray<z.ZodObject<{
        patternType: z.ZodString;
        ratioPercentage: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        patternType: string;
        ratioPercentage: number;
    }, {
        patternType: string;
        ratioPercentage: number;
    }>, "many">;
    importantQuestionBank: z.ZodArray<z.ZodObject<{
        questionText: z.ZodString;
        estimatedMarks: z.ZodNumber;
        unitTag: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        questionText: string;
        estimatedMarks: number;
        unitTag: string;
    }, {
        questionText: string;
        estimatedMarks: number;
        unitTag: string;
    }>, "many">;
    examPatternSummary: z.ZodString;
}, "strip", z.ZodTypeAny, {
    difficultyAnalysis: {
        difficulty: "Easy" | "Medium" | "Hard";
        reasoning: string;
    };
    repeatedTopics: {
        topic: string;
        frequencyPercentage: number;
        importance: "Medium" | "High" | "Low";
    }[];
    confidenceScore: number;
    chapterWeightage: {
        chapter: string;
        expectedMarks: number;
        unitLabel: string;
    }[];
    predictedPatterns: {
        patternType: string;
        ratioPercentage: number;
    }[];
    importantQuestionBank: {
        questionText: string;
        estimatedMarks: number;
        unitTag: string;
    }[];
    examPatternSummary: string;
}, {
    difficultyAnalysis: {
        difficulty: "Easy" | "Medium" | "Hard";
        reasoning: string;
    };
    repeatedTopics: {
        topic: string;
        frequencyPercentage: number;
        importance: "Medium" | "High" | "Low";
    }[];
    confidenceScore: number;
    chapterWeightage: {
        chapter: string;
        expectedMarks: number;
        unitLabel: string;
    }[];
    predictedPatterns: {
        patternType: string;
        ratioPercentage: number;
    }[];
    importantQuestionBank: {
        questionText: string;
        estimatedMarks: number;
        unitTag: string;
    }[];
    examPatternSummary: string;
}>;
export type CombinedAnalysis = z.infer<typeof combinedAnalysisSchema>;
export declare function analyzeCombinedPapers(files: Array<{
    text: string;
    fileName: string;
    year?: number;
}>, metadata: {
    subject: string;
    university?: string;
    branch?: string;
    semester?: string;
}): Promise<CombinedAnalysis>;
//# sourceMappingURL=paperIntelligenceService.d.ts.map