"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUniversityProfile = ensureUniversityProfile;
exports.listUniversityCatalog = listUniversityCatalog;
exports.upsertSubjectFromAnalysis = upsertSubjectFromAnalysis;
const universityCatalog_1 = require("../../data/universityCatalog");
async function ensureUniversityProfile(supabase, universityName, branch, semester) {
    const seed = (0, universityCatalog_1.findUniversitySeed)(universityName);
    const { data: existing } = await supabase
        .from("universities")
        .select("*")
        .ilike("university_name", universityName.trim())
        .maybeSingle();
    if (existing)
        return existing;
    const profile = {
        university_name: (seed?.university_name ?? universityName).trim(),
        branch: branch || null,
        semester: semester || null,
        syllabus_data: seed ? { common_subjects: seed.common_subjects } : {},
        marking_scheme: seed?.marking_scheme ?? { theory: 70, practical: 30, internal: 30 },
        exam_trends: seed?.exam_trends ?? ["unit-wise exams", "theory + practical mix"],
        subject_catalog: seed ? Object.values(seed.common_subjects).flat() : [],
    };
    const { data } = await supabase.from("universities").insert(profile).select().single();
    return data;
}
function listUniversityCatalog() {
    return universityCatalog_1.UNIVERSITY_CATALOG.map((u) => ({
        name: u.university_name,
        branches: u.branches,
        semesters: u.semesters,
        exam_trends: u.exam_trends,
    }));
}
async function upsertSubjectFromAnalysis(supabase, userId, params) {
    const { data: existing } = await supabase
        .from("subjects")
        .select("id")
        .eq("user_id", userId)
        .eq("subject_name", params.subjectName)
        .maybeSingle();
    const payload = {
        university_id: params.universityId || null,
        user_id: userId,
        subject_name: params.subjectName,
        branch: params.branch,
        semester: params.semester,
        unit_structure: params.units,
        topic_graph: { nodes: params.topicGraph },
    };
    if (existing) {
        const { data } = await supabase
            .from("subjects")
            .update(payload)
            .eq("id", existing.id)
            .select()
            .single();
        return data;
    }
    const { data } = await supabase.from("subjects").insert(payload).select().single();
    return data;
}
//# sourceMappingURL=universityIntelligenceService.js.map