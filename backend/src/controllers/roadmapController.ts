import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../config/supabase";
import { generateRoadmap } from "../services/ai/roadmapService";
import { getWeakTopics } from "../services/ai/weakTopicService";
import { buildAcademicContext } from "../services/academic/academicContextService";
import { ensureUniversityProfile } from "../services/academic/universityIntelligenceService";
import { buildRoadmapCacheKey, getCachedRoadmap, saveRoadmapCache } from "../services/roadmap/roadmapCacheService";
import {
  buildVerificationChallenge,
  gradeMiniQuiz,
  gradeWrittenResponse,
} from "../services/roadmap/taskVerificationService";
import {
  recalculateRoadmapProgress,
  unlockFirstTasks,
  unlockNextTask,
} from "../services/roadmap/roadmapProgressService";
import { ensureUploadExtractedText } from "../services/uploadContentService";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { isMissingColumnError, parseMissingColumns, removeMissingColumns } from "../utils/supabaseSchema";
import { QuizQuestion } from "../types";

const ROADMAP_LIST_SELECT_EXTENDED =
  "id, title, subject, topic, exam_date, progress_percentage, mastery_score, exam_readiness, goal_type, status, created_at";
const ROADMAP_LIST_SELECT_LEGACY = "id, title, progress_percentage, created_at";

const generateSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().default("Full Syllabus"),
  university: z.string().optional(),
  branch: z.string().optional(),
  semester: z.coerce.number().min(1).max(12).optional(),
  examDate: z.string().optional(),
  dailyStudyHours: z.coerce.number().min(0.5).max(12),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  goalType: z.enum([
    "exam_preparation",
    "revision",
    "placement_prep",
    "assignment",
    "presentation",
    "interview_prep",
  ]).default("exam_preparation"),
  weakTopics: z.array(z.string()).optional(),
  preferredStyle: z.string().optional(),
  uploadId: z.string().uuid().optional(),
  uploadedMaterialIds: z.array(z.string().uuid()).optional(),
  syllabusPdfId: z.string().uuid().optional(),
});

const verifySubmitSchema = z.object({
  answers: z.record(z.string()).optional(),
  writtenAnswer: z.string().optional(),
  sessionId: z.string().uuid().optional(),
});

export async function generateRoadmapHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const userId = req.user.id;

    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.message, 400);

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase
      .from("users")
      .select("university, branch, semester")
      .eq("id", req.user.id)
      .single();

    const university = parsed.data.university || profile?.university;
    if (university) {
      await ensureUniversityProfile(supabase, university, parsed.data.branch || profile?.branch, parsed.data.semester || profile?.semester);
    }

    const academic = await buildAcademicContext(supabase, req.user.id);
    const weakFromDb = await getWeakTopics(req.user.id);
    const weakTopics = [
      ...(parsed.data.weakTopics || []),
      ...academic.weakTopics,
      ...weakFromDb.filter((w) => w.accuracy_percentage < 60).map((w) => w.topic_name),
    ];

    const syllabusUnits = academic.materials.flatMap((m) =>
      (m.units as { name: string; topics: string[] }[]) || []
    );
    const examTrends =
      ((academic.universityProfile as { exam_trends?: string[] })?.exam_trends as string[]) || [];

    // Extract text from designated syllabus file
    let syllabusText = "";
    if (parsed.data.syllabusPdfId) {
      try {
        const text = await ensureUploadExtractedText(supabase, parsed.data.syllabusPdfId, userId);
        if (text) syllabusText = text;
      } catch (err) {
        console.warn("[ROADMAP_GEN] Failed to extract syllabus text:", err);
      }
    }

    // Extract text from designated study materials files
    let materialsText = "";
    if (parsed.data.uploadedMaterialIds && parsed.data.uploadedMaterialIds.length > 0) {
      try {
        const texts = await Promise.all(
          parsed.data.uploadedMaterialIds.map((id) =>
            ensureUploadExtractedText(supabase, id, userId).catch(() => null)
          )
        );
        materialsText = texts.filter(Boolean).join("\n\n");
      } catch (err) {
        console.warn("[ROADMAP_GEN] Failed to extract materials text:", err);
      }
    }

    const roadmapPayload = {
      subject: parsed.data.subject,
      topic: parsed.data.topic,
      university,
      branch: parsed.data.branch || profile?.branch,
      semester: parsed.data.semester || profile?.semester,
      examDate: parsed.data.examDate,
      dailyStudyHours: parsed.data.dailyStudyHours,
      difficulty: parsed.data.difficulty,
      goalType: parsed.data.goalType,
      weakTopics: [...new Set(weakTopics)],
      preferredStyle: parsed.data.preferredStyle,
      performanceData: weakFromDb.map((w) => ({
        topic: w.topic_name,
        accuracy: w.accuracy_percentage,
      })),
      highPriorityTopics: [...new Set([...academic.highPriorityTopics, parsed.data.topic])],
      syllabusUnits,
      examTrends,
      predictedTopics: academic.examPatterns.flatMap((p) => p.predicted_topics),
      materialSummary: `${academic.materials.length} materials, topics: ${academic.aggregatedTopics.slice(0, 15).join(", ")}`,
      syllabusText,
      materialsText,
      syllabusPdfId: parsed.data.syllabusPdfId,
      uploadedMaterialIds: parsed.data.uploadedMaterialIds,
    };

    const cacheKey = buildRoadmapCacheKey(roadmapPayload);
    const roadmapPlaceholderPayload: Record<string, unknown> = {
      user_id: userId,
      title: `Building roadmap: ${parsed.data.subject} - ${parsed.data.topic}`,
      subject: parsed.data.subject,
      topic: parsed.data.topic,
      exam_date: parsed.data.examDate || null,
      difficulty: parsed.data.difficulty,
      goal_type: parsed.data.goalType,
      progress_percentage: 0,
      mastery_score: 0,
      exam_readiness: 0,
      status: "processing",
      daily_tasks: [],
      revision_schedule: [],
    };

    let { data: placeholder, error: phError } = await supabase
      .from("roadmaps")
      .insert(roadmapPlaceholderPayload)
      .select("id")
      .single();

    if (phError && isMissingColumnError(phError)) {
      const missingColumns = parseMissingColumns(phError);
      const cleaned = removeMissingColumns(roadmapPlaceholderPayload, missingColumns);
      ({ data: placeholder, error: phError } = await supabase
        .from("roadmaps")
        .insert(cleaned)
        .select("id")
        .single());
    }

    if (phError) return sendError(res, phError.message, 500);
    if (!placeholder?.id) return sendError(res, "Failed to create roadmap placeholder", 500);

    let jobId: string | null = null;
    try {
      const { data: job } = await supabase
        .from("roadmap_jobs")
        .insert({
          user_id: userId,
          roadmap_id: placeholder.id,
          cache_key: cacheKey,
          status: "pending",
        })
        .select("id")
        .single();
      jobId = job?.id || null;
    } catch {
      // ignore missing roadmap_jobs table in older schema
    }

    const cachedRoadmap = await getCachedRoadmap(supabase, cacheKey, userId);

    (async () => {
      let fullRoadmapResult = cachedRoadmap || null;
      try {
        if (!fullRoadmapResult) {
          fullRoadmapResult = await generateRoadmap(roadmapPayload);
          await saveRoadmapCache(
            supabase,
            userId,
            cacheKey,
            parsed.data.subject,
            parsed.data.topic,
            fullRoadmapResult
          );
        }

        const updatePayload: Record<string, unknown> = {
          title: fullRoadmapResult.title || roadmapPlaceholderPayload.title,
          revision_schedule: fullRoadmapResult.revisionSchedule || [],
          progress_percentage: 0,
          mastery_score: 0,
          exam_readiness: 0,
          config: fullRoadmapResult.config || {
            weakTopics: parsed.data.weakTopics,
            preferredStyle: parsed.data.preferredStyle,
          },
          status: "ready",
          daily_tasks: fullRoadmapResult.dailyTasks || [],
        };

        const { error: updateError } = await supabase
          .from("roadmaps")
          .update(updatePayload)
          .eq("id", placeholder.id);
        if (updateError) {
          console.error("Failed to update roadmap record:", updateError.message);
        }

        if (fullRoadmapResult.dailyTasks && Array.isArray(fullRoadmapResult.dailyTasks)) {
          const taskRowsBg = fullRoadmapResult.dailyTasks.map((t: any, i: number) => ({
            roadmap_id: placeholder.id,
            user_id: userId,
            task_title: t.taskTitle,
            task_type: t.taskType,
            subject: t.subject,
            topic: t.topic,
            difficulty: t.difficulty || parsed.data.difficulty,
            verification_method: t.verificationMethod,
            completion_status: "locked",
            due_date: t.dueDate,
            priority: t.priority,
            description: t.description,
            sort_order: t.sortOrder ?? i,
            metadata: { 
              goalType: parsed.data.goalType,
              week: t.week || 1,
              phase: t.phase || ""
            },
          }));

          const { error: taskInsertError } = await supabase.from("roadmap_tasks").insert(taskRowsBg);
          if (taskInsertError) {
            console.error("Roadmap task insert failed:", taskInsertError.message);
            await supabase
              .from("roadmaps")
              .update({ daily_tasks: fullRoadmapResult.dailyTasks })
              .eq("id", placeholder.id);
          } else {
            await unlockFirstTasks(supabase, placeholder.id, userId, 2);
            await recalculateRoadmapProgress(supabase, placeholder.id, userId);
          }
        }

        if (jobId) {
          await supabase
            .from("roadmap_jobs")
            .update({ status: "completed" })
            .eq("id", jobId);
        }
      } catch (err) {
        console.error("Background roadmap generation failed:", (err as Error).message);
        await supabase
          .from("roadmaps")
          .update({ status: "failed" })
          .eq("id", placeholder.id);
        if (jobId) {
          await supabase
            .from("roadmap_jobs")
            .update({ status: "failed", error_message: (err as Error).message })
            .eq("id", jobId);
        }
      }
    })();

    return sendSuccess(
      res,
      { roadmapId: placeholder.id, jobId },
      "Roadmap generation queued; processing in background.",
      202
    );
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

async function getRoadmapDetail(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  roadmapId: string,
  userId: string
) {
  let roadmap: any;
  try {
    const { data, error } = await supabase
      .from("roadmaps")
      .select("*")
      .eq("id", roadmapId)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    roadmap = data;
  } catch (err) {
    if (isMissingColumnError(err)) {
      const { data, error } = await supabase
        .from("roadmaps")
        .select(
          "id, title, subject, topic, progress_percentage, mastery_score, exam_readiness, goal_type, created_at, updated_at"
        )
        .eq("id", roadmapId)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      roadmap = data;
    } else {
      throw err;
    }
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("roadmap_tasks")
    .select("*")
    .eq("roadmap_id", roadmapId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  const legacyTasks = Array.isArray((roadmap as any).daily_tasks) ? (roadmap as any).daily_tasks : [];

  if (tasksError?.message?.includes("roadmap_tasks")) {
    return {
      ...roadmap,
      tasks: legacyTasks.map((task: any, index: number) => ({
        id: task.id || `legacy-${index}`,
        completion_status: task.completion_status || "locked",
        ...task,
      })),
      legacyMode: true,
    };
  }

  if ((!tasks || tasks.length === 0) && legacyTasks.length > 0) {
    return {
      ...roadmap,
      tasks: legacyTasks.map((task: any, index: number) => ({
        id: task.id || `legacy-${index}`,
        completion_status: task.completion_status || "locked",
        ...task,
      })),
      legacyMode: true,
    };
  }

  return { ...roadmap, tasks: tasks || [] };
}

export async function getRoadmaps(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    let data: any = null;
    let error: any = null;

    ({ data, error } = await supabase
      .from("roadmaps")
      .select(ROADMAP_LIST_SELECT_EXTENDED)
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false }));

    if (error && isMissingColumnError(error)) {
      ({ data, error } = await supabase
        .from("roadmaps")
        .select(ROADMAP_LIST_SELECT_LEGACY)
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false }));
    }

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getRoadmapById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    const roadmapId = String(req.params.id);
    const full = await getRoadmapDetail(supabase, roadmapId, req.user.id);
    if (!full?.id) return sendError(res, "Roadmap not found", 404);
    return sendSuccess(res, full);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function updateRoadmapProgress(req: AuthenticatedRequest, res: Response) {
  return sendError(
    res,
    "Manual checkbox completion is disabled. Complete tasks via verification (quiz, writing, or study timer).",
    403
  );
}

export async function prepareTaskVerification(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    const { data: task } = await supabase
      .from("roadmap_tasks")
      .select("*")
      .eq("id", req.params.taskId)
      .eq("user_id", req.user.id)
      .single();

    if (!task) return sendError(res, "Task not found", 404);
    if (task.completion_status === "completed") {
      return sendError(res, "Task already completed", 400);
    }
    if (task.completion_status === "locked") {
      return sendError(res, "Complete previous tasks first to unlock this one", 403);
    }

    await supabase
      .from("roadmap_tasks")
      .update({ completion_status: "in_progress" })
      .eq("id", task.id);

    if (task.verification_method === "timer") {
      const { data: session } = await supabase
        .from("study_sessions")
        .insert({
          user_id: req.user.id,
          roadmap_task_id: task.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      const challenge = await buildVerificationChallenge(task);
      await supabase
        .from("roadmap_tasks")
        .update({
          metadata: {
            ...(task.metadata as object),
            verificationChallenge: challenge,
          },
        })
        .eq("id", task.id);
      return sendSuccess(res, { ...challenge, sessionId: session?.id });
    }

    const challenge = await buildVerificationChallenge(task);
    await supabase
      .from("roadmap_tasks")
      .update({
        metadata: {
          ...(task.metadata as object),
          verificationChallenge: challenge,
        },
      })
      .eq("id", task.id);

    return sendSuccess(res, challenge);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function submitTaskVerification(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const parsed = verifySubmitSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.message, 400);

    const supabase = getSupabaseAdmin();
    const { data: task } = await supabase
      .from("roadmap_tasks")
      .select("*")
      .eq("id", req.params.taskId)
      .eq("user_id", req.user.id)
      .single();

    if (!task) return sendError(res, "Task not found", 404);
    if (task.completion_status === "completed") {
      return sendError(res, "Task already completed", 400);
    }

    let score = 0;
    let passed = false;
    let feedback = "";
    let responsePayload: Record<string, unknown> = {};

    const method = task.verification_method;

    if (method === "mini_quiz") {
      if (!parsed.data.answers) return sendError(res, "Answers required", 400);
      const meta = (task.metadata || {}) as { verificationChallenge?: { questions?: QuizQuestion[] } };
      const questions =
        meta.verificationChallenge?.questions ||
        (await buildVerificationChallenge(task)).questions ||
        [];
      const result = gradeMiniQuiz(questions, parsed.data.answers);
      score = result.score;
      passed = result.passed;
      feedback = result.feedback;
      responsePayload = { answers: parsed.data.answers, questions };
    } else if (method === "timer") {
      if (!parsed.data.sessionId) return sendError(res, "Session ID required", 400);
      const minMinutes = Number(task.metadata?.minMinutes) || 15;
      const { data: session } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("id", parsed.data.sessionId)
        .eq("user_id", req.user.id)
        .single();

      if (!session) return sendError(res, "Study session not found", 404);

      const ended = new Date();
      const started = new Date(session.started_at);
      const durationSeconds = Math.floor((ended.getTime() - started.getTime()) / 1000);
      const requiredSeconds = minMinutes * 60;

      await supabase
        .from("study_sessions")
        .update({ ended_at: ended.toISOString(), duration_seconds: durationSeconds })
        .eq("id", session.id);

      score = Math.min(100, Math.round((durationSeconds / requiredSeconds) * 100));
      passed = durationSeconds >= requiredSeconds;
      feedback = passed
        ? `Study session verified (${Math.floor(durationSeconds / 60)} min).`
        : `Study at least ${minMinutes} minutes. You studied ${Math.floor(durationSeconds / 60)} min.`;
      responsePayload = { durationSeconds, requiredSeconds };
    } else {
      const text = parsed.data.writtenAnswer?.trim();
      if (!text || text.length < 30) {
        return sendError(res, "Write at least 30 characters to verify understanding", 400);
      }
      const ctx = `${task.task_title} — ${task.subject}/${task.topic}`;
      const result = await gradeWrittenResponse(ctx, text);
      score = result.score;
      passed = result.passed;
      feedback = result.feedback;
      responsePayload = { writtenAnswer: text };
    }

    await supabase.from("task_attempts").insert({
      user_id: req.user.id,
      roadmap_task_id: task.id,
      attempt_type: method,
      score,
      passed,
      feedback,
      response: responsePayload,
    });

    if (passed) {
      await supabase
        .from("roadmap_tasks")
        .update({
          completion_status: "completed",
          mastery_score: score,
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      await unlockNextTask(supabase, task.roadmap_id, req.user.id, task.sort_order);
      await recalculateRoadmapProgress(supabase, task.roadmap_id, req.user.id);

      await supabase.from("activity_logs").insert({
        user_id: req.user.id,
        action_type: "roadmap_task",
        metadata: { taskId: task.id, score, topic: task.topic },
      });
    } else {
      await supabase
        .from("roadmap_tasks")
        .update({ completion_status: "available", mastery_score: score })
        .eq("id", task.id);
    }

    const full = await getRoadmapDetail(supabase, task.roadmap_id, req.user.id);
    return sendSuccess(res, {
      passed,
      score,
      feedback,
      roadmap: full,
    });
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function endStudySession(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    const { data: session } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", req.params.sessionId)
      .eq("user_id", req.user.id)
      .single();

    if (!session) return sendError(res, "Session not found", 404);

    const ended = new Date();
    const durationSeconds = Math.floor(
      (ended.getTime() - new Date(session.started_at).getTime()) / 1000
    );

    await supabase
      .from("study_sessions")
      .update({ ended_at: ended.toISOString(), duration_seconds: durationSeconds })
      .eq("id", session.id);

    return sendSuccess(res, { durationSeconds });
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}
