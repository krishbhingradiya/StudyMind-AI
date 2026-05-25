import { SupabaseClient } from "@supabase/supabase-js";
export interface AcademicContext {
    profile: {
        university?: string;
        branch?: string;
        semester?: number;
    };
    universityProfile: Record<string, unknown> | null;
    materials: {
        id: string;
        file_type: string;
        subject?: string;
        important_topics: string[];
        units: unknown[];
        topic_graph: unknown[];
    }[];
    examPatterns: {
        subject_name: string;
        high_weightage_topics: string[];
        predicted_topics: string[];
        repeated_questions: string[];
    }[];
    weakTopics: string[];
    performance: {
        topic: string;
        accuracy: number;
    }[];
    aggregatedTopics: string[];
    highPriorityTopics: string[];
    totalStudyHoursFromMaterials: number;
}
export declare function buildAcademicContext(supabase: SupabaseClient, userId: string): Promise<AcademicContext>;
//# sourceMappingURL=academicContextService.d.ts.map