"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuizHandler = generateQuizHandler;
exports.submitQuiz = submitQuiz;
exports.getQuizzes = getQuizzes;
exports.retakeQuiz = retakeQuiz;
exports.getQuizById = getQuizById;
const zod_1 = require("zod");
const supabase_1 = require("../config/supabase");
const quizService_1 = require("../services/ai/quizService");
const weakTopicService_1 = require("../services/ai/weakTopicService");
const uploadContentService_1 = require("../services/uploadContentService");
const apiResponse_1 = require("../utils/apiResponse");
const quizScoring_1 = require("../utils/quizScoring");
const supabaseSchema_1 = require("../utils/supabaseSchema");
const quizValidation_1 = require("../utils/quizValidation");
const QUIZ_LIST_SELECT_EXTENDED = "id, topic, score, max_score, total_questions, correct_answers, wrong_answers, percentage_score, time_taken_seconds, created_at";
const QUIZ_LIST_SELECT_LEGACY = "id, topic, score, max_score, time_taken_seconds, created_at";
const generateSchema = zod_1.z.object({
    uploadId: zod_1.z.string().uuid().optional(),
    content: zod_1.z.string().optional(),
    topic: zod_1.z.string().default("General"),
    count: zod_1.z.number().min(5).max(20).default(10),
});
const submitSchema = zod_1.z.object({
    quizId: zod_1.z.string().uuid(),
    answers: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.number()])),
    timeTakenSeconds: zod_1.z.number().optional(),
});
async function generateQuizHandler(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const parsed = generateSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, apiResponse_1.sendError)(res, parsed.error.message, 400);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        let content = parsed.data.content || "";
        if (parsed.data.uploadId) {
            const extracted = await (0, uploadContentService_1.ensureUploadExtractedText)(supabase, parsed.data.uploadId, req.user.id);
            if (!extracted && !content.trim()) {
                return (0, apiResponse_1.sendError)(res, "Upload not found or text could not be extracted. Supported formats: PDF, DOCX, PPTX, images, TXT.", 404);
            }
            content = extracted || content;
        }
        if (!content.trim()) {
            return (0, apiResponse_1.sendError)(res, "No content for quiz generation. Select an uploaded file or paste study material.", 400);
        }
        const { data: profile } = await supabase
            .from("users")
            .select("university, branch, semester")
            .eq("id", req.user.id)
            .single();
        const { data: weakTopics } = await supabase
            .from("weak_topics")
            .select("topic_name")
            .eq("user_id", req.user.id)
            .lt("accuracy_percentage", 60);
        const questions = await (0, quizService_1.generateQuiz)({
            content,
            topic: parsed.data.topic,
            count: parsed.data.count,
            weakTopics: weakTopics?.map((w) => w.topic_name) || [],
            university: profile?.university,
            branch: profile?.branch,
            semester: profile?.semester,
        });
        const { data, error } = await supabase
            .from("quizzes")
            .insert({
            user_id: req.user.id,
            topic: parsed.data.topic,
            questions,
        })
            .select()
            .single();
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, data, "Quiz generated", 201);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function submitQuiz(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const parsed = submitSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, apiResponse_1.sendError)(res, parsed.error.message, 400);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data: quiz } = await supabase
            .from("quizzes")
            .select("*")
            .eq("id", parsed.data.quizId)
            .eq("user_id", req.user.id)
            .single();
        if (!quiz)
            return (0, apiResponse_1.sendError)(res, "Quiz not found", 404);
        const questions = quiz.questions;
        let score = 0;
        const results = [];
        const detailedResults = [];
        // Validate question structure first
        for (const q of questions) {
            const structureError = (0, quizValidation_1.validateQuizQuestionStructure)(q);
            if (structureError) {
                console.error(`[QUIZ_SUBMIT] Invalid question structure for quiz ${parsed.data.quizId}:`, structureError);
                return (0, apiResponse_1.sendError)(res, `Quiz has invalid structure: ${structureError}. Contact support.`, 500);
            }
        }
        // Score each question using index-based validation ONLY
        for (const q of questions) {
            const userAnswer = parsed.data.answers[q.id];
            const correct = (0, quizValidation_1.validateQuizAnswer)(userAnswer, q);
            if (correct)
                score++;
            results.push({
                topic: q.topic || quiz.topic,
                correct,
            });
            detailedResults.push({
                questionId: q.id,
                topic: q.topic || quiz.topic,
                userAnswer,
                expectedIndex: q.correctAnswerIndex ?? -1,
                correct,
            });
        }
        // Log any validation issues for debugging
        const incorrectAnswers = detailedResults.filter((r) => !r.correct);
        if (incorrectAnswers.length > 0) {
            console.debug(`[QUIZ_SUBMIT] Quiz ${parsed.data.quizId} - ${incorrectAnswers.length}/${questions.length} incorrect`, incorrectAnswers.slice(0, 3) // Log first 3 for debugging
            );
        }
        await (0, weakTopicService_1.updateWeakTopicsFromQuiz)(req.user.id, results);
        const breakdown = (0, quizScoring_1.buildQuizScoreBreakdown)(score, questions.length);
        if (!breakdown) {
            return (0, apiResponse_1.sendError)(res, "Invalid quiz score: no questions to grade", 400);
        }
        const legacyUpdate = {
            score,
            max_score: questions.length,
            answers: parsed.data.answers,
            time_taken_seconds: parsed.data.timeTakenSeconds,
        };
        const extendedUpdate = {
            ...legacyUpdate,
            total_questions: breakdown.totalQuestions,
            correct_answers: breakdown.correctAnswers,
            wrong_answers: breakdown.wrongAnswers,
            percentage_score: breakdown.percentageScore,
        };
        let { data, error } = await supabase
            .from("quizzes")
            .update(extendedUpdate)
            .eq("id", parsed.data.quizId)
            .select()
            .single();
        if (error && (0, supabaseSchema_1.isMissingColumnError)(error)) {
            ({ data, error } = await supabase
                .from("quizzes")
                .update(legacyUpdate)
                .eq("id", parsed.data.quizId)
                .select()
                .single());
        }
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        await supabase.from("activity_logs").insert({
            user_id: req.user.id,
            action_type: "quiz",
            metadata: {
                topic: quiz.topic,
                correct_answers: breakdown.correctAnswers,
                total_questions: breakdown.totalQuestions,
                percentage_score: breakdown.percentageScore,
            },
        });
        return (0, apiResponse_1.sendSuccess)(res, {
            ...data,
            total_questions: breakdown.totalQuestions,
            correct_answers: breakdown.correctAnswers,
            wrong_answers: breakdown.wrongAnswers,
            percentage_score: breakdown.percentageScore,
            percentage: breakdown.percentageScore,
        });
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getQuizzes(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        let { data, error } = await supabase
            .from("quizzes")
            .select(QUIZ_LIST_SELECT_EXTENDED)
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false });
        if (error && (0, supabaseSchema_1.isMissingColumnError)(error)) {
            const legacyResponse = await supabase
                .from("quizzes")
                .select(QUIZ_LIST_SELECT_LEGACY)
                .eq("user_id", req.user.id)
                .order("created_at", { ascending: false });
            data = legacyResponse.data;
            error = legacyResponse.error;
        }
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function retakeQuiz(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data: existing } = await supabase
            .from("quizzes")
            .select("id, questions")
            .eq("id", req.params.id)
            .eq("user_id", req.user.id)
            .single();
        if (!existing)
            return (0, apiResponse_1.sendError)(res, "Quiz not found", 404);
        const questions = existing.questions;
        if (!questions?.length)
            return (0, apiResponse_1.sendError)(res, "This quiz has no questions", 400);
        const legacyReset = {
            score: null,
            max_score: null,
            answers: null,
            time_taken_seconds: null,
        };
        const extendedReset = {
            ...legacyReset,
            total_questions: null,
            correct_answers: null,
            wrong_answers: null,
            percentage_score: null,
        };
        let { data, error } = await supabase
            .from("quizzes")
            .update(extendedReset)
            .eq("id", req.params.id)
            .eq("user_id", req.user.id)
            .select()
            .single();
        if (error && (0, supabaseSchema_1.isMissingColumnError)(error)) {
            ({ data, error } = await supabase
                .from("quizzes")
                .update(legacyReset)
                .eq("id", req.params.id)
                .eq("user_id", req.user.id)
                .select()
                .single());
        }
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, data, "Quiz reset — good luck on your re-quiz!");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getQuizById(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data, error } = await supabase
            .from("quizzes")
            .select("*")
            .eq("id", req.params.id)
            .eq("user_id", req.user.id)
            .single();
        if (error || !data)
            return (0, apiResponse_1.sendError)(res, "Quiz not found", 404);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
