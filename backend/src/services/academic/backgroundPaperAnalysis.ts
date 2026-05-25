import { SupabaseClient } from "@supabase/supabase-js";
import { analyzePastPaper } from "../ai/paperAnalysisService";
import { persistExamPattern } from "./persistMaterialAnalysis";
export function schedulePastPaperAnalysis(
  supabase: SupabaseClient,
  userId: string,
  params: {
    paperId: string;
    extractedText: string;
    subject: string;
    university?: string;
  }
): void {
  void (async () => {
    const analysis = await analyzePastPaper(
      params.extractedText,
      params.subject,
      params.university
    );

    await supabase
      .from("past_papers")
      .update({ analysis })
      .eq("id", params.paperId)
      .eq("user_id", userId);

    await persistExamPattern(supabase, userId, {
      pastPaperId: params.paperId,
      subjectName: params.subject,
      university: params.university,
      analysis,
    });
  })().catch((err) => {
    console.warn(`Background paper analysis failed for ${params.paperId}:`, err);
  });
}
