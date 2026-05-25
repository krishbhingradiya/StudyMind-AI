"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.getUploads = getUploads;
exports.deleteUpload = deleteUpload;
const uuid_1 = require("uuid");
const supabase_1 = require("../config/supabase");
const fileProcessingService_1 = require("../services/fileProcessingService");
const apiResponse_1 = require("../utils/apiResponse");
const supabaseSchema_1 = require("../utils/supabaseSchema");
const UPLOAD_LIST_SELECT_EXTENDED = "id, file_name, file_type, file_size, subject, material_type, university, uploaded_at, analysis_id";
const UPLOAD_LIST_SELECT_LEGACY = "id, file_name, file_type, file_size, subject, uploaded_at";
const textCleaner_1 = require("../utils/textCleaner");
const backgroundAnalysis_1 = require("../services/academic/backgroundAnalysis");
const BUCKET = "study-materials";
async function uploadFile(req, res) {
    try {
        if (!req.user || !req.file) {
            return (0, apiResponse_1.sendError)(res, "No file provided", 400);
        }
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const fileId = (0, uuid_1.v4)();
        const ext = req.file.originalname.split(".").pop() || "bin";
        const storagePath = `${req.user.id}/${fileId}.${ext}`;
        const [storageResult, extractedTextRaw] = await Promise.all([
            supabase.storage.from(BUCKET).upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false,
            }),
            (0, fileProcessingService_1.extractTextFromFile)(req.file.buffer, req.file.mimetype, req.file.originalname).catch((extractErr) => {
                console.warn("Text extraction failed:", extractErr);
                return "";
            }),
        ]);
        if (storageResult.error) {
            return (0, apiResponse_1.sendError)(res, `Storage upload failed: ${storageResult.error.message}`, 500);
        }
        const extractedText = extractedTextRaw
            ? (0, textCleaner_1.truncateText)(extractedTextRaw, 20000)
            : "";
        const body = req.body;
        const fileName = (0, textCleaner_1.sanitizeMetadataValue)(req.file.originalname);
        const subject = body.subject ? (0, textCleaner_1.sanitizeMetadataValue)(body.subject) : null;
        const materialType = (body.materialType || "notes");
        const insertPayload = {
            user_id: req.user.id,
            file_name: fileName || req.file.originalname,
            file_type: req.file.mimetype,
            storage_path: storagePath,
            file_size: req.file.size,
            extracted_text: extractedText || null,
            subject,
            material_type: materialType,
            university: body.university ? (0, textCleaner_1.sanitizeMetadataValue)(body.university) : null,
            branch: body.branch ? (0, textCleaner_1.sanitizeMetadataValue)(body.branch) : null,
            semester: body.semester ? parseInt(body.semester, 10) : null,
        };
        const legacyPayload = {
            user_id: insertPayload.user_id,
            file_name: insertPayload.file_name,
            file_type: insertPayload.file_type,
            storage_path: insertPayload.storage_path,
            file_size: insertPayload.file_size,
            extracted_text: insertPayload.extracted_text,
            subject: insertPayload.subject,
        };
        let payload = insertPayload;
        let { data, error } = await supabase.from("uploads").insert(payload).select().single();
        if (error && (0, supabaseSchema_1.isMissingColumnError)(error)) {
            payload = legacyPayload;
            ({ data, error } = await supabase.from("uploads").insert(payload).select().single());
        }
        // Fallback: save file without extracted text if JSON/escape errors persist
        if (error &&
            (error.message.includes("Unicode escape") ||
                error.message.includes("escape sequence"))) {
            ({ data, error } = await supabase
                .from("uploads")
                .insert({ ...payload, extracted_text: null })
                .select()
                .single());
        }
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        await supabase.from("activity_logs").insert({
            user_id: req.user.id,
            action_type: "upload",
            metadata: { file_name: fileName || req.file.originalname, material_type: materialType },
        });
        const hasText = Boolean(extractedText?.trim());
        if (hasText) {
            (0, backgroundAnalysis_1.scheduleUploadAnalysis)(supabase, req.user.id, {
                uploadId: data.id,
                extractedText,
                fileName: fileName || req.file.originalname,
                materialType,
                university: body.university,
                branch: body.branch,
                semester: body.semester ? parseInt(body.semester, 10) : undefined,
                subject: subject || undefined,
            });
        }
        return (0, apiResponse_1.sendSuccess)(res, { ...data, analysis: null, analysisPending: hasText }, hasText
            ? "File uploaded — AI analysis running in the background"
            : "File uploaded successfully", 201);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getUploads(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        let { data, error } = await supabase
            .from("uploads")
            .select(UPLOAD_LIST_SELECT_EXTENDED)
            .eq("user_id", req.user.id)
            .order("uploaded_at", { ascending: false });
        if (error && (0, supabaseSchema_1.isMissingColumnError)(error)) {
            ({ data, error } = await supabase
                .from("uploads")
                .select(UPLOAD_LIST_SELECT_LEGACY)
                .eq("user_id", req.user.id)
                .order("uploaded_at", { ascending: false }));
        }
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function deleteUpload(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const { id } = req.params;
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data: upload } = await supabase
            .from("uploads")
            .select("storage_path")
            .eq("id", id)
            .eq("user_id", req.user.id)
            .single();
        if (!upload)
            return (0, apiResponse_1.sendError)(res, "Upload not found", 404);
        await supabase.storage.from(BUCKET).remove([upload.storage_path]);
        await supabase.from("uploads").delete().eq("id", id);
        return (0, apiResponse_1.sendSuccess)(res, null, "Upload deleted");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
//# sourceMappingURL=uploadController.js.map