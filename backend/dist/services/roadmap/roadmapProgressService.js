"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTaskPassed = isTaskPassed;
exports.recalculateRoadmapProgress = recalculateRoadmapProgress;
exports.unlockNextTask = unlockNextTask;
exports.unlockFirstTasks = unlockFirstTasks;
const PASS_THRESHOLD = 70;
function isTaskPassed(score) {
    return score >= PASS_THRESHOLD;
}
async function recalculateRoadmapProgress(supabase, roadmapId, userId) {
    const { data: tasks } = await supabase
        .from("roadmap_tasks")
        .select("id, completion_status, mastery_score")
        .eq("roadmap_id", roadmapId)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
    if (!tasks?.length)
        return;
    const completed = tasks.filter((t) => t.completion_status === "completed");
    const progress = Math.round((completed.length / tasks.length) * 100);
    const mastery = completed.length > 0
        ? Math.round(completed.reduce((acc, t) => acc + (Number(t.mastery_score) || 0), 0) /
            completed.length)
        : 0;
    const examReadiness = Math.round(progress * 0.5 + mastery * 0.5);
    await supabase
        .from("roadmaps")
        .update({
        progress_percentage: progress,
        mastery_score: mastery,
        exam_readiness: examReadiness,
    })
        .eq("id", roadmapId)
        .eq("user_id", userId);
}
async function unlockNextTask(supabase, roadmapId, userId, completedSortOrder) {
    const { data: next } = await supabase
        .from("roadmap_tasks")
        .select("id")
        .eq("roadmap_id", roadmapId)
        .eq("user_id", userId)
        .eq("completion_status", "locked")
        .gt("sort_order", completedSortOrder)
        .order("sort_order", { ascending: true })
        .limit(1)
        .single();
    if (next) {
        await supabase
            .from("roadmap_tasks")
            .update({ completion_status: "available" })
            .eq("id", next.id);
    }
}
async function unlockFirstTasks(supabase, roadmapId, userId, count = 2) {
    const { data: tasks } = await supabase
        .from("roadmap_tasks")
        .select("id")
        .eq("roadmap_id", roadmapId)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .limit(count);
    if (tasks?.length) {
        await supabase
            .from("roadmap_tasks")
            .update({ completion_status: "available" })
            .in("id", tasks.map((t) => t.id));
    }
}
//# sourceMappingURL=roadmapProgressService.js.map