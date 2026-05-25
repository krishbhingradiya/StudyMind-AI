"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRoadmapCacheKey = buildRoadmapCacheKey;
exports.getCachedRoadmap = getCachedRoadmap;
exports.saveRoadmapCache = saveRoadmapCache;
const crypto_1 = __importDefault(require("crypto"));
function buildRoadmapCacheKey(input) {
    const normalized = {
        subject: input.subject.trim().toLowerCase(),
        topic: input.topic.trim().toLowerCase(),
        university: input.university?.trim().toLowerCase() || "",
        branch: input.branch?.trim().toLowerCase() || "",
        semester: input.semester ?? 0,
        examDate: input.examDate || "",
        dailyStudyHours: Number(input.dailyStudyHours),
        difficulty: input.difficulty,
        goalType: input.goalType,
        weakTopics: [...(input.weakTopics || [])].map((t) => t.trim().toLowerCase()).sort(),
        preferredStyle: input.preferredStyle?.trim().toLowerCase() || "",
        performanceData: [...(input.performanceData || [])]
            .map((item) => ({ topic: item.topic.trim().toLowerCase(), accuracy: Number(item.accuracy) }))
            .sort((a, b) => a.topic.localeCompare(b.topic)),
        highPriorityTopics: [...(input.highPriorityTopics || [])]
            .map((t) => t.trim().toLowerCase())
            .sort(),
        syllabusUnits: [...(input.syllabusUnits || [])]
            .map((unit) => ({
            name: unit.name.trim().toLowerCase(),
            topics: [...(unit.topics || [])].map((t) => t.trim().toLowerCase()).sort(),
        }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        examTrends: [...(input.examTrends || [])].map((t) => t.trim().toLowerCase()).sort(),
        predictedTopics: [...(input.predictedTopics || [])].map((t) => t.trim().toLowerCase()).sort(),
    };
    return crypto_1.default.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
async function getCachedRoadmap(supabase, cacheKey, userId) {
    try {
        const { data, error } = await supabase
            .from("roadmap_cache")
            .select("structure")
            .eq("cache_key", cacheKey)
            .eq("user_id", userId)
            .single();
        if (error || !data?.structure)
            return null;
        return data.structure;
    }
    catch (err) {
        console.warn("Roadmap cache lookup failed:", err.message);
        return null;
    }
}
async function saveRoadmapCache(supabase, userId, cacheKey, subject, topic, structure) {
    try {
        await supabase.from("roadmap_cache").upsert({
            user_id: userId,
            cache_key: cacheKey,
            subject,
            topic,
            structure,
        }, { onConflict: ["cache_key", "user_id"] });
    }
    catch (err) {
        console.warn("Saving roadmap cache failed:", err.message);
    }
}
//# sourceMappingURL=roadmapCacheService.js.map