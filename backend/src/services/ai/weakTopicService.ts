import { getSupabaseAdmin } from "../../config/supabase";
import { clampMetric } from "../../utils/quizScoring";

export async function updateWeakTopicsFromQuiz(
  userId: string,
  results: { topic: string; correct: boolean }[]
) {
  const supabase = getSupabaseAdmin();

  for (const result of results) {
    const { data: existing } = await supabase
      .from("weak_topics")
      .select("*")
      .eq("user_id", userId)
      .eq("topic_name", result.topic)
      .single();

    const attemptCount = (existing?.attempt_count || 0) + 1;
    const prevAccuracy = clampMetric(Number(existing?.accuracy_percentage) || 0);
    const questionScore = result.correct ? 100 : 0;
    const newAccuracy = clampMetric(
      (prevAccuracy * (attemptCount - 1) + questionScore) / attemptCount
    );

    await supabase.from("weak_topics").upsert(
      {
        user_id: userId,
        topic_name: result.topic,
        accuracy_percentage: newAccuracy,
        attempt_count: attemptCount,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "user_id,topic_name" }
    );
  }
}

export async function getWeakTopics(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("weak_topics")
    .select("*")
    .eq("user_id", userId)
    .order("accuracy_percentage", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}
