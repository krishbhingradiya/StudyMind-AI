import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { RoadmapGenerateInput, GeneratedRoadmap } from "../ai/roadmapService";

export function buildRoadmapCacheKey(input: RoadmapGenerateInput): string {
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
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export async function getCachedRoadmap(
  supabase: SupabaseClient,
  cacheKey: string,
  userId: string
): Promise<GeneratedRoadmap | null> {
  try {
    const { data, error } = await supabase
      .from("roadmap_cache")
      .select("structure")
      .eq("cache_key", cacheKey)
      .eq("user_id", userId)
      .single();

    if (error || !data?.structure) return null;
    return data.structure as GeneratedRoadmap;
  } catch (err) {
    console.warn("Roadmap cache lookup failed:", (err as Error).message);
    return null;
  }
}

export async function saveRoadmapCache(
  supabase: SupabaseClient,
  userId: string,
  cacheKey: string,
  subject: string,
  topic: string,
  structure: GeneratedRoadmap
): Promise<void> {
  try {
    await supabase.from("roadmap_cache").upsert(
      {
        user_id: userId,
        cache_key: cacheKey,
        subject,
        topic,
        structure,
      },
      { onConflict: ["cache_key", "user_id"] }
    );
  } catch (err) {
    console.warn("Saving roadmap cache failed:", (err as Error).message);
  }
}
