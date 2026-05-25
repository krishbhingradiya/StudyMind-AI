"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUniversityCatalog = getUniversityCatalog;
exports.resolveUniversity = resolveUniversity;
exports.getAcademicContext = getAcademicContext;
exports.getAcademicDashboard = getAcademicDashboard;
exports.getMaterialAnalyses = getMaterialAnalyses;
const supabase_1 = require("../config/supabase");
const apiResponse_1 = require("../utils/apiResponse");
const academicContextService_1 = require("../services/academic/academicContextService");
const universityIntelligenceService_1 = require("../services/academic/universityIntelligenceService");
async function getUniversityCatalog(_req, res) {
    return (0, apiResponse_1.sendSuccess)(res, (0, universityIntelligenceService_1.listUniversityCatalog)());
}
async function resolveUniversity(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const { university, branch, semester } = req.body;
        if (!university)
            return (0, apiResponse_1.sendError)(res, "University name required", 400);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const profile = await (0, universityIntelligenceService_1.ensureUniversityProfile)(supabase, university, branch, semester);
        return (0, apiResponse_1.sendSuccess)(res, profile);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getAcademicContext(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const context = await (0, academicContextService_1.buildAcademicContext)(supabase, req.user.id);
        return (0, apiResponse_1.sendSuccess)(res, context);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getAcademicDashboard(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const context = await (0, academicContextService_1.buildAcademicContext)(supabase, req.user.id);
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
            const structure = s.unit_structure || [];
            return structure.map((u) => ({ subject: s.subject_name, unit: u.name, topics: u.topics }));
        });
        const totalUnits = units.length;
        const materialsCount = context.materials.length;
        const syllabusCompletion = totalUnits > 0
            ? Math.min(100, Math.round((materialsCount / Math.max(totalUnits, 1)) * 100))
            : materialsCount > 0
                ? 40
                : 0;
        const unitMastery = {};
        for (const s of subjects || []) {
            const graph = s.topic_graph?.nodes || [];
            for (const node of graph) {
                const perf = context.performance.find((p) => p.topic.toLowerCase() === node.topic.toLowerCase());
                unitMastery[node.topic] = perf ? perf.accuracy : 50;
            }
        }
        return (0, apiResponse_1.sendSuccess)(res, {
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
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function getMaterialAnalyses(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data, error } = await supabase
            .from("study_material_analysis")
            .select("id, file_type, file_name, subject, important_topics, units, created_at")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false });
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
//# sourceMappingURL=academicController.js.map