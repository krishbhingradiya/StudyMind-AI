import { SupabaseClient } from "@supabase/supabase-js";
import type { MaterialType } from "./materialAnalysisService";
export declare function scheduleUploadAnalysis(supabase: SupabaseClient, userId: string, params: {
    uploadId: string;
    extractedText: string;
    fileName: string;
    materialType: MaterialType;
    university?: string;
    branch?: string;
    semester?: number;
    subject?: string;
}): void;
//# sourceMappingURL=backgroundAnalysis.d.ts.map