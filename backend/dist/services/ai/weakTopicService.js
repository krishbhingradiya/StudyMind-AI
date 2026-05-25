"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWeakTopicsFromQuiz = updateWeakTopicsFromQuiz;
exports.getWeakTopics = getWeakTopics;
const supabase_1 = require("../../config/supabase");
const quizScoring_1 = require("../../utils/quizScoring");
async function updateWeakTopicsFromQuiz(userId, results) {
    const supabase = (0, supabase_1.getSupabaseAdmin)();
    for (const result of results) {
        const { data: existing } = await supabase
            .from("weak_topics")
            .select("*")
            .eq("user_id", userId)
            .eq("topic_name", result.topic)
            .single();
        const attemptCount = (existing?.attempt_count || 0) + 1;
        const prevAccuracy = (0, quizScoring_1.clampMetric)(Number(existing?.accuracy_percentage) || 0);
        const questionScore = result.correct ? 100 : 0;
        const newAccuracy = (0, quizScoring_1.clampMetric)((prevAccuracy * (attemptCount - 1) + questionScore) / attemptCount);
        await supabase.from("weak_topics").upsert({
            user_id: userId,
            topic_name: result.topic,
            accuracy_percentage: newAccuracy,
            attempt_count: attemptCount,
            last_updated: new Date().toISOString(),
        }, { onConflict: "user_id,topic_name" });
    }
}
async function getWeakTopics(userId) {
    const supabase = (0, supabase_1.getSupabaseAdmin)();
    const { data, error } = await supabase
        .from("weak_topics")
        .select("*")
        .eq("user_id", userId)
        .order("accuracy_percentage", { ascending: true });
    if (error)
        throw new Error(error.message);
    return data || [];
}
