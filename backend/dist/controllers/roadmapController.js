"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoadmapHandler = generateRoadmapHandler;
exports.getRoadmaps = getRoadmaps;
exports.getRoadmapById = getRoadmapById;
exports.updateRoadmapProgress = updateRoadmapProgress;
exports.prepareTaskVerification = prepareTaskVerification;
exports.submitTaskVerification = submitTaskVerification;
exports.endStudySession = endStudySession;
const zod_1 = require("zod");
const supabase_1 = require("../config/supabase");
const roadmapService_1 = require("../services/ai/roadmapService");
const weakTopicService_1 = require("../services/ai/weakTopicService");
const academicContextService_1 = require("../services/academic/academicContextService");
const universityIntelligenceService_1 = require("../services/academic/universityIntelligenceService");
const roadmapCacheService_1 = require("../services/roadmap/roadmapCacheService");
const taskVerificationService_1 = require("../services/roadmap/taskVerificationService");
const roadmapProgressService_1 = require("../services/roadmap/roadmapProgressService");
const uploadContentService_1 = require("../services/uploadContentService");
const apiResponse_1 = require("../utils/apiResponse");
const supabaseSchema_1 = require("../utils/supabaseSchema");
const ROADMAP_LIST_SELECT_EXTENDED = "id, title, subject, topic, exam_date, progress_percentage, mastery_score, exam_readiness, goal_type, status, created_at";
const ROADMAP_LIST_SELECT_LEGACY = "id, title, progress_percentage, created_at";
const generateSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1),
    topic: zod_1.z.string().default("Full Syllabus"),
    university: zod_1.z.string().optional(),
    branch: zod_1.z.string().optional(),
    semester: zod_1.z.coerce.number().min(1).max(12).optional(),
    examDate: zod_1.z.string().optional(),
    dailyStudyHours: zod_1.z.coerce.number().min(0.5).max(12),
    difficulty: zod_1.z.enum(["easy", "medium", "hard"]).default("medium"),
    goalType: zod_1.z.enum([
        "exam_preparation",
        "revision",
        "placement_prep",
        "assignment",
        "presentation",
        "interview_prep",
    ]).default("exam_preparation"),
    weakTopics: zod_1.z.array(zod_1.z.string()).optional(),
    preferredStyle: zod_1.z.string().optional(),
    uploadId: zod_1.z.string().uuid().optional(),
    uploadedMaterialIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    syllabusPdfId: zod_1.z.string().uuid().optional(),
});
const verifySubmitSchema = zod_1.z.object({
    answers: zod_1.z.record(zod_1.z.string()).optional(),
    writtenAnswer: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().uuid().optional(),
});
async function generateRoadmapHandler(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const userId = req.user.id;
        const parsed = generateSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, apiResponse_1.sendError)(res, parsed.error.message, 400);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data: profile } = await supabase
            .from("users")
            .select("university, branch, semester")
            .eq("id", req.user.id)
            .single();
        const university = parsed.data.university || profile?.university;
        if (university) {
            await (0, universityIntelligenceService_1.ensureUniversityProfile)(supabase, university, parsed.data.branch || profile?.branch, parsed.data.semester || profile?.semester);
        }
        const academic = await (0, academicContextService_1.buildAcademicContext)(supabase, req.user.id);
        const weakFromDb = await (0, weakTopicService_1.getWeakTopics)(req.user.id);
        const weakTopics = [
            ...(parsed.data.weakTopics || []),
            ...academic.weakTopics,
            ...weakFromDb.filter((w) => w.accuracy_percentage < 60).map((w) => w.topic_name),
        ];
        const syllabusUnits = academic.materials.flatMap((m) => m.units || []);
        const examTrends = academic.universityProfile?.exam_trends || [];
        // Extract text from designated syllabus file
        let syllabusText = "";
        if (parsed.data.syllabusPdfId) {
            try {
                const text = await (0, uploadContentService_1.ensureUploadExtractedText)(supabase, parsed.data.syllabusPdfId, userId);
                if (text)
                    syllabusText = text;
            }
            catch (err) {
                console.warn("[ROADMAP_GEN] Failed to extract syllabus text:", err);
            }
        }
        // Extract text from designated study materials files
        let materialsText = "";
        if (parsed.data.uploadedMaterialIds && parsed.data.uploadedMaterialIds.length > 0) {
            try {
                const texts = await Promise.all(parsed.data.uploadedMaterialIds.map((id) => (0, uploadContentService_1.ensureUploadExtractedText)(supabase, id, userId).catch(() => null)));
                materialsText = texts.filter(Boolean).join("\n\n");
            }
            catch (err) {
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
        const cacheKey = (0, roadmapCacheService_1.buildRoadmapCacheKey)(roadmapPayload);
        const roadmapPlaceholderPayload = {
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
        if (phError && (0, supabaseSchema_1.isMissingColumnError)(phError)) {
            const missingColumns = (0, supabaseSchema_1.parseMissingColumns)(phError);
            const cleaned = (0, supabaseSchema_1.removeMissingColumns)(roadmapPlaceholderPayload, missingColumns);
            ({ data: placeholder, error: phError } = await supabase
                .from("roadmaps")
                .insert(cleaned)
                .select("id")
                .single());
        }
        if (phError)
            return (0, apiResponse_1.sendError)(res, phError.message, 500);
        if (!placeholder?.id)
            return (0, apiResponse_1.sendError)(res, "Failed to create roadmap placeholder", 500);
        let jobId = null;
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
        }
        catch {
            // ignore missing roadmap_jobs table in older schema
        }
        const cachedRoadmap = await (0, roadmapCacheService_1.getCachedRoadmap)(supabase, cacheKey, userId);
        (async () => {
            let fullRoadmapResult = cachedRoadmap || null;
            try {
                if (!fullRoadmapResult) {
                    fullRoadmapResult = await (0, roadmapService_1.generateRoadmap)(roadmapPayload);
                    await (0, roadmapCacheService_1.saveRoadmapCache)(supabase, userId, cacheKey, parsed.data.subject, parsed.data.topic, fullRoadmapResult);
                }
                const updatePayload = {
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
                    const taskRowsBg = fullRoadmapResult.dailyTasks.map((t, i) => ({
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
                    }
                    else {
                        await (0, roadmapProgressService_1.unlockFirstTasks)(supabase, placeholder.id, userId, 2);
                        await (0, roadmapProgressService_1.recalculateRoadmapProgress)(supabase, placeholder.id, userId);
                    }
                }
                if (jobId) {
                    await supabase
                        .from("roadmap_jobs")
                        .update({ status: "completed" })
                        .eq("id", jobId);
                }
            }
            catch (err) {
                console.error("Background roadmap generation failed:", err.message);
                await supabase
                    .from("roadmaps")
                    .update({ status: "failed" })
                    .eq("id", placeholder.id);
                if (jobId) {
                    await supabase
                        .from("roadmap_jobs")
                        .update({ status: "failed", error_message: err.message })
                        .eq("id", jobId);
                }
            }
        })();
        return (0, apiResponse_1.sendSuccess)(res, { roadmapId: placeholder.id, jobId }, "Roadmap generation queued; processing in background.", 202);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getRoadmapDetail(supabase, roadmapId, userId) {
    let roadmap;
    try {
        const { data, error } = await supabase
            .from("roadmaps")
            .select("*")
            .eq("id", roadmapId)
            .eq("user_id", userId)
            .single();
        if (error)
            throw error;
        roadmap = data;
    }
    catch (err) {
        if ((0, supabaseSchema_1.isMissingColumnError)(err)) {
            const { data, error } = await supabase
                .from("roadmaps")
                .select("id, title, subject, topic, progress_percentage, mastery_score, exam_readiness, goal_type, created_at, updated_at")
                .eq("id", roadmapId)
                .eq("user_id", userId)
                .single();
            if (error)
                throw error;
            roadmap = data;
        }
        else {
            throw err;
        }
    }
    const { data: tasks, error: tasksError } = await supabase
        .from("roadmap_tasks")
        .select("*")
        .eq("roadmap_id", roadmapId)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
    const legacyTasks = Array.isArray(roadmap.daily_tasks) ? roadmap.daily_tasks : [];
    if (tasksError?.message?.includes("roadmap_tasks")) {
        return {
            ...roadmap,
            tasks: legacyTasks.map((task, index) => ({
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
            tasks: legacyTasks.map((task, index) => ({
                id: task.id || `legacy-${index}`,
                completion_status: task.completion_status || "locked",
                ...task,
            })),
            legacyMode: true,
        };
    }
    return { ...roadmap, tasks: tasks || [] };
}
async function getRoadmaps(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        let data = null;
        let error = null;
        ({ data, error } = await supabase
            .from("roadmaps")
            .select(ROADMAP_LIST_SELECT_EXTENDED)
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false }));
        if (error && (0, supabaseSchema_1.isMissingColumnError)(error)) {
            ({ data, error } = await supabase
                .from("roadmaps")
                .select(ROADMAP_LIST_SELECT_LEGACY)
                .eq("user_id", req.user.id)
                .order("created_at", { ascending: false }));
        }
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getRoadmapById(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const roadmapId = String(req.params.id);
        const full = await getRoadmapDetail(supabase, roadmapId, req.user.id);
        if (!full?.id)
            return (0, apiResponse_1.sendError)(res, "Roadmap not found", 404);
        return (0, apiResponse_1.sendSuccess)(res, full);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function updateRoadmapProgress(req, res) {
    return (0, apiResponse_1.sendError)(res, "Manual checkbox completion is disabled. Complete tasks via verification (quiz, writing, or study timer).", 403);
}
async function prepareTaskVerification(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data: task } = await supabase
            .from("roadmap_tasks")
            .select("*")
            .eq("id", req.params.taskId)
            .eq("user_id", req.user.id)
            .single();
        if (!task)
            return (0, apiResponse_1.sendError)(res, "Task not found", 404);
        if (task.completion_status === "completed") {
            return (0, apiResponse_1.sendError)(res, "Task already completed", 400);
        }
        if (task.completion_status === "locked") {
            return (0, apiResponse_1.sendError)(res, "Complete previous tasks first to unlock this one", 403);
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
            const challenge = await (0, taskVerificationService_1.buildVerificationChallenge)(task);
            await supabase
                .from("roadmap_tasks")
                .update({
                metadata: {
                    ...task.metadata,
                    verificationChallenge: challenge,
                },
            })
                .eq("id", task.id);
            return (0, apiResponse_1.sendSuccess)(res, { ...challenge, sessionId: session?.id });
        }
        const challenge = await (0, taskVerificationService_1.buildVerificationChallenge)(task);
        await supabase
            .from("roadmap_tasks")
            .update({
            metadata: {
                ...task.metadata,
                verificationChallenge: challenge,
            },
        })
            .eq("id", task.id);
        return (0, apiResponse_1.sendSuccess)(res, challenge);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function submitTaskVerification(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const parsed = verifySubmitSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, apiResponse_1.sendError)(res, parsed.error.message, 400);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data: task } = await supabase
            .from("roadmap_tasks")
            .select("*")
            .eq("id", req.params.taskId)
            .eq("user_id", req.user.id)
            .single();
        if (!task)
            return (0, apiResponse_1.sendError)(res, "Task not found", 404);
        if (task.completion_status === "completed") {
            return (0, apiResponse_1.sendError)(res, "Task already completed", 400);
        }
        let score = 0;
        let passed = false;
        let feedback = "";
        let responsePayload = {};
        const method = task.verification_method;
        if (method === "mini_quiz") {
            if (!parsed.data.answers)
                return (0, apiResponse_1.sendError)(res, "Answers required", 400);
            const meta = (task.metadata || {});
            const questions = meta.verificationChallenge?.questions ||
                (await (0, taskVerificationService_1.buildVerificationChallenge)(task)).questions ||
                [];
            const result = (0, taskVerificationService_1.gradeMiniQuiz)(questions, parsed.data.answers);
            score = result.score;
            passed = result.passed;
            feedback = result.feedback;
            responsePayload = { answers: parsed.data.answers, questions };
        }
        else if (method === "timer") {
            if (!parsed.data.sessionId)
                return (0, apiResponse_1.sendError)(res, "Session ID required", 400);
            const minMinutes = Number(task.metadata?.minMinutes) || 15;
            const { data: session } = await supabase
                .from("study_sessions")
                .select("*")
                .eq("id", parsed.data.sessionId)
                .eq("user_id", req.user.id)
                .single();
            if (!session)
                return (0, apiResponse_1.sendError)(res, "Study session not found", 404);
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
        }
        else {
            const text = parsed.data.writtenAnswer?.trim();
            if (!text || text.length < 30) {
                return (0, apiResponse_1.sendError)(res, "Write at least 30 characters to verify understanding", 400);
            }
            const ctx = `${task.task_title} — ${task.subject}/${task.topic}`;
            const result = await (0, taskVerificationService_1.gradeWrittenResponse)(ctx, text);
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
            await (0, roadmapProgressService_1.unlockNextTask)(supabase, task.roadmap_id, req.user.id, task.sort_order);
            await (0, roadmapProgressService_1.recalculateRoadmapProgress)(supabase, task.roadmap_id, req.user.id);
            await supabase.from("activity_logs").insert({
                user_id: req.user.id,
                action_type: "roadmap_task",
                metadata: { taskId: task.id, score, topic: task.topic },
            });
        }
        else {
            await supabase
                .from("roadmap_tasks")
                .update({ completion_status: "available", mastery_score: score })
                .eq("id", task.id);
        }
        const full = await getRoadmapDetail(supabase, task.roadmap_id, req.user.id);
        return (0, apiResponse_1.sendSuccess)(res, {
            passed,
            score,
            feedback,
            roadmap: full,
        });
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function endStudySession(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data: session } = await supabase
            .from("study_sessions")
            .select("*")
            .eq("id", req.params.sessionId)
            .eq("user_id", req.user.id)
            .single();
        if (!session)
            return (0, apiResponse_1.sendError)(res, "Session not found", 404);
        const ended = new Date();
        const durationSeconds = Math.floor((ended.getTime() - new Date(session.started_at).getTime()) / 1000);
        await supabase
            .from("study_sessions")
            .update({ ended_at: ended.toISOString(), duration_seconds: durationSeconds })
            .eq("id", session.id);
        return (0, apiResponse_1.sendSuccess)(res, { durationSeconds });
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
