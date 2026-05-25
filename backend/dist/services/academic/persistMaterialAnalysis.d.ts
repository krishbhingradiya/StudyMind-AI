import { SupabaseClient } from "@supabase/supabase-js";
import { MaterialType } from "./materialAnalysisService";
export declare function analyzeAndPersistUpload(supabase: SupabaseClient, userId: string, params: {
    uploadId: string;
    extractedText: string;
    fileName: string;
    materialType: MaterialType;
    university?: string;
    branch?: string;
    semester?: number;
    subject?: string;
}): Promise<any>;
export declare function persistExamPattern(supabase: SupabaseClient, userId: string, params: {
    pastPaperId: string;
    subjectName: string;
    university?: string;
    analysis: {
        repeatedTopics: string[];
        examPatterns: string[];
        importantChapters: string[];
        highPriorityQuestions: string[];
        predictedTopics: string[];
    };
}): Promise<any>;
//# sourceMappingURL=persistMaterialAnalysis.d.ts.map