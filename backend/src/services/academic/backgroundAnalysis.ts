import { SupabaseClient } from "@supabase/supabase-js";
import { analyzeAndPersistUpload } from "./persistMaterialAnalysis";
import type { MaterialType } from "./materialAnalysisService";

export function scheduleUploadAnalysis(
  supabase: SupabaseClient,
  userId: string,
  params: {
    uploadId: string;
    extractedText: string;
    fileName: string;
    materialType: MaterialType;
    university?: string;
    branch?: string;
    semester?: number;
    subject?: string;
  }
): void {
  void analyzeAndPersistUpload(supabase, userId, params).catch((err) => {
    console.warn(`Background analysis failed for upload ${params.uploadId}:`, err);
  });
}
