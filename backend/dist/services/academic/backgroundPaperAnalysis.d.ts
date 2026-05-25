import { SupabaseClient } from "@supabase/supabase-js";
export declare function schedulePastPaperAnalysis(supabase: SupabaseClient, userId: string, params: {
    paperId: string;
    extractedText: string;
    subject: string;
    university?: string;
}): void;
//# sourceMappingURL=backgroundPaperAnalysis.d.ts.map