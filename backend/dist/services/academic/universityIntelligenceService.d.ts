import { SupabaseClient } from "@supabase/supabase-js";
export declare function ensureUniversityProfile(supabase: SupabaseClient, universityName: string, branch?: string, semester?: number): Promise<any>;
export declare function listUniversityCatalog(): {
    name: string;
    branches: string[];
    semesters: number;
    exam_trends: string[];
}[];
export declare function upsertSubjectFromAnalysis(supabase: SupabaseClient, userId: string, params: {
    universityId?: string;
    subjectName: string;
    branch?: string;
    semester?: number;
    units: unknown[];
    topicGraph: unknown[];
}): Promise<any>;
//# sourceMappingURL=universityIntelligenceService.d.ts.map