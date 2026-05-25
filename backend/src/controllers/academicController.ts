import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../config/supabase";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { buildAcademicContext } from "../services/academic/academicContextService";
import {
  ensureUniversityProfile,
  listUniversityCatalog,
} from "../services/academic/universityIntelligenceService";

export async function getUniversityCatalog(_req: AuthenticatedRequest, res: Response) {
  return sendSuccess(res, listUniversityCatalog());
}

export async function resolveUniversity(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const { university, branch, semester } = req.body as {
      university: string;
      branch?: string;
      semester?: number;
    };
    if (!university) return sendError(res, "University name required", 400);

    const supabase = getSupabaseAdmin();
    const profile = await ensureUniversityProfile(supabase, university, branch, semester);
    return sendSuccess(res, profile);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getAcademicContext(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const supabase = getSupabaseAdmin();
    const context = await buildAcademicContext(supabase, req.user.id);
    return sendSuccess(res, context);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getAcademicDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    const context = await buildAcademicContext(supabase, req.user.id);

    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, subject_name, unit_structure, topic_graph")
      .eq("user_id", req.user.id);

    const { data: roadmaps } = await supabase
      .from("roadmaps")
      .select("progress_percentage, mastery_score, exam_readiness, subject, topic")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const units = (subjects || []).flatMap((s) => {
      const structure = (s.unit_structure as { name: string; topics: string[] }[]) || [];
      return structure.map((u) => ({ subject: s.subject_name, unit: u.name, topics: u.topics }));
    });

    const totalUnits = units.length;
    const materialsCount = context.materials.length;
    const syllabusCompletion =
      totalUnits > 0
        ? Math.min(100, Math.round((materialsCount / Math.max(totalUnits, 1)) * 100))
        : materialsCount > 0
          ? 40
          : 0;

    const unitMastery: Record<string, number> = {};
    for (const s of subjects || []) {
      const graph = (s.topic_graph as { nodes?: { topic: string; difficulty: string }[] })?.nodes || [];
      for (const node of graph) {
        const perf = context.performance.find(
          (p) => p.topic.toLowerCase() === node.topic.toLowerCase()
        );
        unitMastery[node.topic] = perf ? perf.accuracy : 50;
      }
    }

    return sendSuccess(res, {
      university: context.profile.university,
      branch: context.profile.branch,
      semester: context.profile.semester,
      universityProfile: context.universityProfile,
      syllabusCompletion,
      unitMastery,
      importantTopicsRemaining: context.highPriorityTopics,
      examReadiness: roadmaps?.[0]?.exam_readiness ?? 0,
      roadmapProgress: roadmaps?.[0]?.progress_percentage ?? 0,
      masteryScore: roadmaps?.[0]?.mastery_score ?? 0,
      weakSubjects: context.weakTopics,
      materialsAnalyzed: materialsCount,
      examPatternsFound: context.examPatterns.length,
      predictedTopics: [
        ...new Set(context.examPatterns.flatMap((p) => p.predicted_topics)),
      ],
      subjects: subjects || [],
      units,
      revisionProgress: roadmaps?.[0]?.progress_percentage ?? 0,
    });
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getMaterialAnalyses(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("study_material_analysis")
      .select("id, file_type, file_name, subject, important_topics, units, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}
