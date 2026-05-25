import { SupabaseClient } from "@supabase/supabase-js";

export interface RoadmapTaskRow {
  id: string;
  roadmap_id: string;
  completion_status: string;
  mastery_score: number;
  sort_order: number;
}

const PASS_THRESHOLD = 70;

export function isTaskPassed(score: number): boolean {
  return score >= PASS_THRESHOLD;
}

export async function recalculateRoadmapProgress(
  supabase: SupabaseClient,
  roadmapId: string,
  userId: string
) {
  const { data: tasks } = await supabase
    .from("roadmap_tasks")
    .select("id, completion_status, mastery_score")
    .eq("roadmap_id", roadmapId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (!tasks?.length) return;

  const completed = tasks.filter((t) => t.completion_status === "completed");
  const progress = Math.round((completed.length / tasks.length) * 100);
  const mastery =
    completed.length > 0
      ? Math.round(
          completed.reduce((acc, t) => acc + (Number(t.mastery_score) || 0), 0) /
            completed.length
        )
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

export async function unlockNextTask(
  supabase: SupabaseClient,
  roadmapId: string,
  userId: string,
  completedSortOrder: number
) {
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

export async function unlockFirstTasks(
  supabase: SupabaseClient,
  roadmapId: string,
  userId: string,
  count = 2
) {
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
      .in(
        "id",
        tasks.map((t) => t.id)
      );
  }
}
