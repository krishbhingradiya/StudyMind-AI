"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPastPaper = uploadPastPaper;
exports.getPastPapers = getPastPapers;
exports.generatePredictedPaperHandler = generatePredictedPaperHandler;
exports.generateSubjectPredictionHandler = generateSubjectPredictionHandler;
exports.getPredictedPapersHistory = getPredictedPapersHistory;
exports.deletePredictedPaper = deletePredictedPaper;
exports.createCombinedCollectionHandler = createCombinedCollectionHandler;
exports.generatePredictionFromCollectionHandler = generatePredictionFromCollectionHandler;
exports.getCollectionsHistoryHandler = getCollectionsHistoryHandler;
exports.deleteCollectionHandler = deleteCollectionHandler;
const uuid_1 = require("uuid");
const supabase_1 = require("../config/supabase");
const fileProcessingService_1 = require("../services/fileProcessingService");
const paperAnalysisService_1 = require("../services/ai/paperAnalysisService");
const backgroundPaperAnalysis_1 = require("../services/academic/backgroundPaperAnalysis");
const apiResponse_1 = require("../utils/apiResponse");
const supabaseSchema_1 = require("../utils/supabaseSchema");
const textCleaner_1 = require("../utils/textCleaner");
const paperIntelligenceService_1 = require("../services/ai/paperIntelligenceService");
const PAPER_LIST_SELECT_EXTENDED = "id, subject, university, year, analysis, uploaded_at";
const PAPER_LIST_SELECT_LEGACY = "id, subject, analysis, created_at";
const BUCKET = "study-materials";
async function uploadPastPaper(req, res) {
    try {
        if (!req.user || !req.file)
            return (0, apiResponse_1.sendError)(res, "No file provided", 400);
        const { subject, university, year } = req.body;
        if (!subject)
            return (0, apiResponse_1.sendError)(res, "Subject is required", 400);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const fileId = (0, uuid_1.v4)();
        const ext = req.file.originalname.split(".").pop() || "pdf";
        const storagePath = `${req.user.id}/papers/${fileId}.${ext}`;
        const [storageResult, extractedTextRaw] = await Promise.all([
            supabase.storage.from(BUCKET).upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
            }),
            (0, fileProcessingService_1.extractTextFromFile)(req.file.buffer, req.file.mimetype, req.file.originalname).catch(() => ""),
        ]);
        if (storageResult.error) {
            return (0, apiResponse_1.sendError)(res, `Storage upload failed: ${storageResult.error.message}`, 500);
        }
        const safeText = extractedTextRaw ? (0, textCleaner_1.truncateText)(extractedTextRaw, 5000) : "";
        const safeSubject = (0, textCleaner_1.sanitizeMetadataValue)(subject);
        const fullInsert = {
            user_id: req.user.id,
            subject: safeSubject,
            university: university ? (0, textCleaner_1.sanitizeMetadataValue)(university) : null,
            year: year ? parseInt(year, 10) : null,
            storage_path: storagePath,
            extracted_questions: { rawText: safeText || null, storagePath },
            analysis: null,
        };
        const legacyInsert = {
            user_id: req.user.id,
            subject: safeSubject,
            extracted_questions: {
                rawText: safeText || null,
                storagePath,
                university: university ? (0, textCleaner_1.sanitizeMetadataValue)(university) : null,
                year: year ? parseInt(year, 10) : null,
            },
            analysis: null,
        };
        let { data, error } = await supabase
            .from("past_papers")
            .insert(fullInsert)
            .select()
            .single();
        if (error && (0, supabaseSchema_1.isMissingColumnError)(error)) {
            ({ data, error } = await supabase
                .from("past_papers")
                .insert(legacyInsert)
                .select()
                .single());
        }
        if (error && (0, supabaseSchema_1.isMissingColumnError)(error)) {
            ({ data, error } = await supabase
                .from("past_papers")
                .insert({ user_id: req.user.id, subject: safeSubject })
                .select()
                .single());
        }
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        if (safeText) {
            (0, backgroundPaperAnalysis_1.schedulePastPaperAnalysis)(supabase, req.user.id, {
                paperId: data.id,
                extractedText: safeText,
                subject: safeSubject,
                university,
            });
        }
        return (0, apiResponse_1.sendSuccess)(res, { ...data, analysisPending: Boolean(safeText) }, safeText
            ? "Past paper uploaded — AI analysis running in the background"
            : "Past paper uploaded", 201);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getPastPapers(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        let { data, error } = await supabase
            .from("past_papers")
            .select(PAPER_LIST_SELECT_EXTENDED)
            .eq("user_id", req.user.id)
            .order("uploaded_at", { ascending: false });
        if (error && (0, supabaseSchema_1.isMissingColumnError)(error)) {
            const legacyRes = await supabase
                .from("past_papers")
                .select(PAPER_LIST_SELECT_LEGACY)
                .eq("user_id", req.user.id)
                .order("created_at", { ascending: false });
            data = legacyRes.data;
            error = legacyRes.error;
        }
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        const normalized = (data || []).map((row) => {
            const r = row;
            const questions = r.extracted_questions;
            return {
                ...r,
                university: r.university ?? questions?.university ?? null,
                year: r.year ?? questions?.year ?? null,
                uploaded_at: r.uploaded_at ?? r.created_at,
            };
        });
        return (0, apiResponse_1.sendSuccess)(res, normalized);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function generatePredictedPaperHandler(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data: paper } = await supabase
            .from("past_papers")
            .select("*")
            .eq("id", req.params.id)
            .eq("user_id", req.user.id)
            .single();
        if (!paper?.analysis)
            return (0, apiResponse_1.sendError)(res, "Paper analysis not found", 404);
        const body = req.body;
        const questions = paper.extracted_questions;
        const predicted = await (0, paperAnalysisService_1.generatePredictedPaper)(paper.analysis, {
            subject: paper.subject,
            university: paper.university ?? questions?.university,
            branch: questions?.branch,
            semester: paper.year ?? questions?.year,
            year: paper.year ?? undefined,
            questionCount: body.count || 10,
            totalMarks: body.totalMarks,
        });
        // Auto-save predicted paper to history
        await supabase.from("predicted_papers").insert({
            user_id: req.user.id,
            past_paper_id: paper.id,
            subject: paper.subject,
            university: predicted.university || paper.university || null,
            semester: String(predicted.semester || paper.year || ""),
            exam_title: predicted.examTitle || "End Semester Examination",
            duration_minutes: predicted.durationMinutes || 180,
            total_marks: predicted.totalMarks || 70,
            paper_data: predicted,
        });
        return (0, apiResponse_1.sendSuccess)(res, { paper: predicted });
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function generateSubjectPredictionHandler(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const { subject, count, totalMarks } = req.body;
        if (!subject)
            return (0, apiResponse_1.sendError)(res, "Subject is required", 400);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        // Fetch all papers for this user matching this subject
        const { data: papers, error } = await supabase
            .from("past_papers")
            .select("*")
            .eq("user_id", req.user.id)
            .ilike("subject", subject);
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        if (!papers || papers.length === 0) {
            return (0, apiResponse_1.sendError)(res, `No past papers uploaded for subject '${subject}'`, 404);
        }
        // Filter to only those papers that have completed analysis
        const analyzedPapers = papers.filter((p) => p.analysis);
        if (analyzedPapers.length === 0) {
            return (0, apiResponse_1.sendError)(res, "None of the uploaded papers for this subject have been analyzed by AI yet. Please wait 30-90 seconds.", 400);
        }
        // Normalize and call the multi-paper analysis service
        const paperInputs = analyzedPapers.map((p) => {
            const q = p.extracted_questions;
            return {
                year: p.year ?? q?.year,
                university: p.university ?? q?.university,
                analysis: p.analysis,
            };
        });
        const firstPaper = analyzedPapers[0];
        const firstQuestions = firstPaper.extracted_questions;
        const predicted = await (0, paperAnalysisService_1.generateMultiPaperPrediction)(paperInputs, {
            subject,
            university: firstPaper.university ?? firstQuestions?.university,
            branch: firstQuestions?.branch,
            semester: firstPaper.year ?? firstQuestions?.year,
            questionCount: count || 12,
            totalMarks,
        });
        // Auto-save predicted paper to history
        await supabase.from("predicted_papers").insert({
            user_id: req.user.id,
            past_paper_id: null,
            subject: subject,
            university: predicted.university || firstPaper.university || null,
            semester: String(predicted.semester || firstPaper.year || ""),
            exam_title: predicted.examTitle || "End Semester Examination",
            duration_minutes: predicted.durationMinutes || 180,
            total_marks: predicted.totalMarks || 70,
            paper_data: predicted,
        });
        return (0, apiResponse_1.sendSuccess)(res, { paper: predicted });
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getPredictedPapersHistory(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const { subject, university, semester, search } = req.query;
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        let query = supabase
            .from("predicted_papers")
            .select("id, subject, university, semester, exam_title, duration_minutes, total_marks, paper_data, created_at")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false });
        if (subject) {
            query = query.ilike("subject", `%${subject}%`);
        }
        if (university) {
            query = query.ilike("university", `%${university}%`);
        }
        if (semester) {
            query = query.eq("semester", semester);
        }
        if (search) {
            query = query.or(`subject.ilike.%${search}%,university.ilike.%${search}%`);
        }
        const { data, error } = await query;
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, data || []);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function deletePredictedPaper(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const { id } = req.params;
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { error } = await supabase
            .from("predicted_papers")
            .delete()
            .eq("id", id)
            .eq("user_id", req.user.id);
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, null, "Predicted paper deleted successfully");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function createCombinedCollectionHandler(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const files = req.files;
        if (!files || files.length === 0) {
            return (0, apiResponse_1.sendError)(res, "No files uploaded", 400);
        }
        const { subject, university, semester, branch, years } = req.body;
        if (!subject)
            return (0, apiResponse_1.sendError)(res, "Subject is required", 400);
        const parsedYears = years ? years.split(",").map(y => parseInt(y.trim(), 10)) : [];
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const processedFiles = await Promise.all(files.map(async (file, idx) => {
            const fileId = (0, uuid_1.v4)();
            const ext = file.originalname.split(".").pop() || "pdf";
            const storagePath = `${req.user.id}/papers/${fileId}.${ext}`;
            const [uploadResult, extractedTextRaw] = await Promise.all([
                supabase.storage.from(BUCKET).upload(storagePath, file.buffer, {
                    contentType: file.mimetype,
                }),
                (0, fileProcessingService_1.extractTextFromFile)(file.buffer, file.mimetype, file.originalname).catch(() => "")
            ]);
            if (uploadResult.error) {
                throw new Error(`Storage upload failed for ${file.originalname}: ${uploadResult.error.message}`);
            }
            const safeText = extractedTextRaw ? (0, textCleaner_1.truncateText)(extractedTextRaw, 5000) : "";
            const safeSubject = (0, textCleaner_1.sanitizeMetadataValue)(subject);
            const { data: uploadData, error: uploadErr } = await supabase
                .from("uploads")
                .insert({
                user_id: req.user.id,
                file_name: file.originalname,
                file_type: file.mimetype,
                storage_path: storagePath,
                file_size: file.size,
                extracted_text: safeText || null,
                subject: safeSubject
            })
                .select()
                .single();
            if (uploadErr) {
                throw new Error(`Upload record insertion failed for ${file.originalname}: ${uploadErr.message}`);
            }
            return {
                uploadId: uploadData.id,
                text: safeText,
                fileName: file.originalname,
                year: parsedYears[idx] || null
            };
        }));
        const combinedAnalysis = await (0, paperIntelligenceService_1.analyzeCombinedPapers)(processedFiles.map(f => ({ text: f.text, fileName: f.fileName, year: f.year || undefined })), {
            subject,
            university,
            branch,
            semester
        });
        const { data: collection, error: collErr } = await supabase
            .from("paper_collections")
            .insert({
            user_id: req.user.id,
            subject: (0, textCleaner_1.sanitizeMetadataValue)(subject),
            university: university ? (0, textCleaner_1.sanitizeMetadataValue)(university) : null,
            semester: semester || null,
            branch: branch || null,
            total_papers: processedFiles.length,
            combined_analysis: combinedAnalysis,
            confidence_score: combinedAnalysis.confidenceScore
        })
            .select()
            .single();
        if (collErr)
            return (0, apiResponse_1.sendError)(res, collErr.message, 500);
        await Promise.all([
            ...processedFiles.map(f => supabase.from("paper_collection_files").insert({
                collection_id: collection.id,
                upload_id: f.uploadId,
                year: f.year,
                extracted_topics: combinedAnalysis.repeatedTopics.slice(0, 3)
            })),
            supabase.from("prediction_analytics").insert({
                collection_id: collection.id,
                recurring_topics: combinedAnalysis.repeatedTopics,
                unit_weightage: combinedAnalysis.chapterWeightage,
                predicted_patterns: combinedAnalysis.predictedPatterns
            })
        ]);
        return (0, apiResponse_1.sendSuccess)(res, { collection, combinedAnalysis }, "Combined multi-paper intelligence analysis generated successfully", 201);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function generatePredictionFromCollectionHandler(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const { collectionId } = req.params;
        const { totalMarks } = req.body;
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data: collection } = await supabase
            .from("paper_collections")
            .select("*")
            .eq("id", collectionId)
            .eq("user_id", req.user.id)
            .single();
        if (!collection)
            return (0, apiResponse_1.sendError)(res, "Paper collection not found", 404);
        const combinedAnalysis = collection.combined_analysis;
        if (!combinedAnalysis)
            return (0, apiResponse_1.sendError)(res, "Combined analysis not found for this collection", 400);
        const repeated = combinedAnalysis.repeatedTopics || [];
        const chapters = combinedAnalysis.chapterWeightage || [];
        const questions = combinedAnalysis.importantQuestionBank || [];
        const patternSummary = combinedAnalysis.examPatternSummary || "Analytical focus";
        const mappedAnalysis = {
            repeatedTopics: repeated.map((t) => String(t.topic)),
            examPatterns: [patternSummary],
            importantChapters: chapters.map((c) => String(c.chapter)),
            highPriorityQuestions: questions.map((q) => String(q.questionText)),
            predictedTopics: repeated.map((t) => String(t.topic)),
            confidenceScore: collection.confidence_score,
            chapterWeightage: chapters.map((c) => ({
                chapter: String(c.chapter),
                weightage: 50,
                importanceScore: c.expectedMarks * 4
            })),
            trendAnalysis: [patternSummary]
        };
        const predicted = await (0, paperAnalysisService_1.generatePredictedPaper)(mappedAnalysis, {
            subject: collection.subject,
            university: collection.university || undefined,
            branch: collection.branch || undefined,
            semester: collection.semester || undefined,
            questionCount: 18,
            totalMarks,
        });
        await supabase.from("predicted_papers").insert({
            user_id: req.user.id,
            past_paper_id: null,
            subject: collection.subject,
            university: predicted.university || collection.university || null,
            semester: String(predicted.semester || collection.semester || ""),
            exam_title: predicted.examTitle || "End Semester Examination",
            duration_minutes: predicted.durationMinutes || 180,
            total_marks: predicted.totalMarks || 70,
            paper_data: predicted,
        });
        return (0, apiResponse_1.sendSuccess)(res, { paper: predicted });
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getCollectionsHistoryHandler(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data, error } = await supabase
            .from("paper_collections")
            .select("id, subject, university, semester, branch, total_papers, confidence_score, combined_analysis, created_at")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false });
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, data || []);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function deleteCollectionHandler(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const { id } = req.params;
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { error } = await supabase
            .from("paper_collections")
            .delete()
            .eq("id", id)
            .eq("user_id", req.user.id);
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, null, "Collection deleted successfully");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
//# sourceMappingURL=paperController.js.map