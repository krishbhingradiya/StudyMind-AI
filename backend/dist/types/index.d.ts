export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
export interface AuthUser {
    id: string;
    email: string;
}
export interface QuizQuestion {
    id: string;
    type: "mcq" | "theory" | "scenario" | "writing";
    question: string;
    options?: string[];
    correctAnswerIndex?: number;
    correctAnswer?: string | null;
    explanation?: string;
    topic?: string;
}
export interface RoadmapContext {
    university: string;
    semester: number;
    subject: string;
    uploadedMaterialIds: string[];
    syllabusPdfId?: string;
    examDate: string;
    dailyStudyHours: number;
    examType?: string;
}
export interface TaskVerificationResult {
    taskId: string;
    userId: string;
    verificationMethod: "mini_quiz" | "study_timer" | "writing" | "practice" | "reading";
    verified: boolean;
    score?: number;
    masteryScore: number;
    verifiedAt: Date;
    metadata: Record<string, any>;
}
export interface RoadmapTask {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    dueDate?: string;
    priority: "low" | "medium" | "high";
}
export interface PaperAnalysis {
    repeatedTopics: string[];
    examPatterns: string[];
    importantChapters: string[];
    highPriorityQuestions: string[];
    predictedTopics: string[];
    confidenceScore?: number;
    chapterWeightage?: Array<{
        chapter: string;
        weightage: number;
        importanceScore: number;
    }>;
    unitFrequency?: Array<{
        unit: string;
        count: number;
    }>;
    difficultyAnalysis?: {
        difficulty: "Easy" | "Medium" | "Hard";
        reasoning: string;
    };
    trendAnalysis?: string[];
}
//# sourceMappingURL=index.d.ts.map