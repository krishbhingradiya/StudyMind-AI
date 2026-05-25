export type MaterialType = "syllabus" | "ppt" | "notes" | "textbook" | "past_paper" | "general";
export interface MaterialAnalysisResult {
    subject: string;
    extractedTopics: string[];
    units: {
        name: string;
        topics: string[];
        estimatedHours: number;
        difficulty: string;
    }[];
    chapters: string[];
    importantTopics: string[];
    keywords: string[];
    difficultyAnalysis: Record<string, string>;
    studyHoursEstimate: number;
    topicGraph: {
        topic: string;
        prerequisites: string[];
        difficulty: string;
    }[];
    fullAnalysis: Record<string, unknown>;
}
export declare function analyzeStudyMaterial(text: string, options: {
    materialType: MaterialType;
    university?: string;
    branch?: string;
    semester?: number;
    subject?: string;
    fileName?: string;
}): Promise<MaterialAnalysisResult>;
//# sourceMappingURL=materialAnalysisService.d.ts.map