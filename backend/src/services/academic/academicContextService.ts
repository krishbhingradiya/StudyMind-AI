import { SupabaseClient } from "@supabase/supabase-js";
import { getWeakTopics } from "../ai/weakTopicService";

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
  performance: { topic: string; accuracy: number }[];
  aggregatedTopics: string[];
  highPriorityTopics: string[];
  totalStudyHoursFromMaterials: number;
}

export async function buildAcademicContext(
  supabase: SupabaseClient,
  userId: string
): Promise<AcademicContext> {
  const { data: profile } = await supabase
    .from("users")
    .select("university, branch, semester")
    .eq("id", userId)
    .single();

  const [weakTopics, materialsRes, patternsRes, uniRes] = await Promise.all([
    getWeakTopics(userId),
    supabase
      .from("study_material_analysis")
      .select("id, file_type, subject, important_topics, units, full_analysis, study_hours_estimate")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("exam_patterns")
      .select("subject_name, high_weightage_topics, predicted_topics, repeated_questions")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    profile?.university
      ? supabase
          .from("universities")
          .select("*")
          .ilike("university_name", `%${profile.university}%`)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const materials = (materialsRes.data || []).map((m) => ({
    id: m.id,
    file_type: m.file_type,
    subject: m.subject,
    important_topics: (m.important_topics as string[]) || [],
    units: (m.units as unknown[]) || [],
    topic_graph: ((m.full_analysis as { topicGraph?: unknown[] })?.topicGraph) || [],
  }));

  const examPatterns = (patternsRes.data || []).map((p) => ({
    subject_name: p.subject_name,
    high_weightage_topics: (p.high_weightage_topics as string[]) || [],
    predicted_topics: (p.predicted_topics as string[]) || [],
    repeated_questions: (p.repeated_questions as string[]) || [],
  }));

  const aggregatedTopics = [
    ...new Set([
      ...materials.flatMap((m) => m.important_topics),
      ...examPatterns.flatMap((p) => p.high_weightage_topics),
      ...examPatterns.flatMap((p) => p.predicted_topics),
    ]),
  ];

  const highPriorityTopics = [
    ...new Set([
      ...examPatterns.flatMap((p) => p.high_weightage_topics),
      ...weakTopics.filter((w) => w.accuracy_percentage < 60).map((w) => w.topic_name),
    ]),
  ];

  let totalStudyHoursFromMaterials = 0;
  for (const m of materialsRes.data || []) {
    const hours = (m as { study_hours_estimate?: number }).study_hours_estimate;
    if (hours) totalStudyHoursFromMaterials += Number(hours);
  }

  return {
    profile: {
      university: profile?.university,
      branch: profile?.branch,
      semester: profile?.semester,
    },
    universityProfile: uniRes?.data || null,
    materials,
    examPatterns,
    weakTopics: weakTopics.filter((w) => w.accuracy_percentage < 60).map((w) => w.topic_name),
    performance: weakTopics.map((w) => ({
      topic: w.topic_name,
      accuracy: w.accuracy_percentage,
    })),
    aggregatedTopics,
    highPriorityTopics,
    totalStudyHoursFromMaterials,
  };
}
