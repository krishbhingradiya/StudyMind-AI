"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSummaryHandler = generateSummaryHandler;
exports.getSummaries = getSummaries;
exports.getSummaryById = getSummaryById;
const zod_1 = require("zod");
const supabase_1 = require("../config/supabase");
const summaryService_1 = require("../services/ai/summaryService");
const uploadContentService_1 = require("../services/uploadContentService");
const apiResponse_1 = require("../utils/apiResponse");
const generateSchema = zod_1.z.object({
    uploadId: zod_1.z.string().uuid().optional(),
    content: zod_1.z.string().optional(),
    title: zod_1.z.string().default("AI Summary"),
    summaryType: zod_1.z
        .enum(["concise", "key_points", "revision", "explanation", "simplified"])
        .default("concise"),
    targetPages: zod_1.z.coerce.number().int().min(1).max(15).optional(),
});
async function generateSummaryHandler(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const parsed = generateSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, apiResponse_1.sendError)(res, parsed.error.message, 400);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        let content = parsed.data.content || "";
        let uploadId = parsed.data.uploadId;
        if (uploadId) {
            const extracted = await (0, uploadContentService_1.ensureUploadExtractedText)(supabase, uploadId, req.user.id);
            if (!extracted) {
                return (0, apiResponse_1.sendError)(res, "Upload not found or text could not be extracted. Supported formats: PDF, DOCX, PPTX, images, TXT.", 404);
            }
            content = extracted;
        }
        if (!content.trim())
            return (0, apiResponse_1.sendError)(res, "No content to summarize", 400);
        const { data: profile } = await supabase
            .from("users")
            .select("university, branch, semester")
            .eq("id", req.user.id)
            .single();
        const summaryContent = await (0, summaryService_1.generateSummary)(content, parsed.data.summaryType, {
            university: profile?.university,
            branch: profile?.branch,
            semester: profile?.semester,
            targetPages: parsed.data.targetPages,
        });
        if (!summaryContent.trim()) {
            return (0, apiResponse_1.sendError)(res, "AI returned empty notes. Please try again or switch AI models in backend/.env.", 502);
        }
        const { data, error } = await supabase
            .from("summaries")
            .insert({
            user_id: req.user.id,
            upload_id: uploadId || null,
            title: parsed.data.title,
            content: summaryContent,
            summary_type: parsed.data.summaryType,
        })
            .select()
            .single();
        if (error) {
            if (error.message.includes("summaries") && error.message.includes("schema cache")) {
                return (0, apiResponse_1.sendError)(res, "Database setup required: run supabase/migrations/003_ensure_summaries.sql in your Supabase SQL Editor.", 503);
            }
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        }
        await supabase.from("activity_logs").insert({
            user_id: req.user.id,
            action_type: "summary_generated",
            metadata: { title: parsed.data.title },
        });
        return (0, apiResponse_1.sendSuccess)(res, data, "Summary generated", 201);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getSummaries(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data, error } = await supabase
            .from("summaries")
            .select("id, title, summary_type, created_at, upload_id")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false });
        if (error) {
            if (error.message.includes("summaries") && error.message.includes("schema cache")) {
                return (0, apiResponse_1.sendError)(res, "Database setup required: run supabase/migrations/003_ensure_summaries.sql in your Supabase SQL Editor.", 503);
            }
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        }
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getSummaryById(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data, error } = await supabase
            .from("summaries")
            .select("*")
            .eq("id", req.params.id)
            .eq("user_id", req.user.id)
            .single();
        if (error || !data)
            return (0, apiResponse_1.sendError)(res, "Summary not found", 404);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
