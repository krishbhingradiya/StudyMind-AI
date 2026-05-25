import { SupabaseClient } from "@supabase/supabase-js";
import { analyzeStudyMaterial, MaterialType } from "./materialAnalysisService";
import {
  ensureUniversityProfile,
  upsertSubjectFromAnalysis,
} from "./universityIntelligenceService";

export async function analyzeAndPersistUpload(
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
) {
  if (!params.extractedText?.trim()) return null;

  const [analysis, universityRow] = await Promise.all([
    analyzeStudyMaterial(params.extractedText, {
      materialType: params.materialType,
      university: params.university,
      branch: params.branch,
      semester: params.semester,
      subject: params.subject,
      fileName: params.fileName,
    }),
    params.university
      ? ensureUniversityProfile(supabase, params.university, params.branch, params.semester)
      : Promise.resolve(null),
  ]);

  const universityId = universityRow?.id;

  const { data: row, error } = await supabase
    .from("study_material_analysis")
    .insert({
      user_id: userId,
      upload_id: params.uploadId,
      file_type: params.materialType,
      file_name: params.fileName,
      university: params.university,
      branch: params.branch,
      semester: params.semester,
      subject: analysis.subject,
      extracted_topics: analysis.extractedTopics,
      units: analysis.units,
      chapters: analysis.chapters,
      difficulty_analysis: analysis.difficultyAnalysis,
      important_topics: analysis.importantTopics,
      keywords: analysis.keywords,
      study_hours_estimate: analysis.studyHoursEstimate,
      full_analysis: { ...analysis.fullAnalysis, topicGraph: analysis.topicGraph },
    })
    .select()
    .single();

  if (error) {
    console.warn("study_material_analysis insert failed:", error.message);
    return null;
  }

  await Promise.all([
    supabase
      .from("uploads")
      .update({ analysis_id: row.id, subject: analysis.subject })
      .eq("id", params.uploadId),
    upsertSubjectFromAnalysis(supabase, userId, {
      universityId,
      subjectName: analysis.subject,
      branch: params.branch,
      semester: params.semester,
      units: analysis.units,
      topicGraph: analysis.topicGraph,
    }),
  ]);

  return row;
}

export async function persistExamPattern(
  supabase: SupabaseClient,
  userId: string,
  params: {
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
  }
) {
  const { data } = await supabase
    .from("exam_patterns")
    .insert({
      user_id: userId,
      past_paper_id: params.pastPaperId,
      subject_name: params.subjectName,
      university: params.university,
      repeated_questions: params.analysis.highPriorityQuestions,
      high_weightage_topics: [
        ...params.analysis.repeatedTopics,
        ...params.analysis.importantChapters,
      ],
      predicted_topics: params.analysis.predictedTopics,
      exam_patterns: params.analysis.examPatterns,
      full_analysis: params.analysis,
    })
    .select()
    .single();

  return data;
}
