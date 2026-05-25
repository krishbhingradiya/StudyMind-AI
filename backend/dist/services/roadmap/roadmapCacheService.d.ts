import { SupabaseClient } from "@supabase/supabase-js";
import { RoadmapGenerateInput, GeneratedRoadmap } from "../ai/roadmapService";
export declare function buildRoadmapCacheKey(input: RoadmapGenerateInput): string;
export declare function getCachedRoadmap(supabase: SupabaseClient, cacheKey: string, userId: string): Promise<GeneratedRoadmap | null>;
export declare function saveRoadmapCache(supabase: SupabaseClient, userId: string, cacheKey: string, subject: string, topic: string, structure: GeneratedRoadmap): Promise<void>;
//# sourceMappingURL=roadmapCacheService.d.ts.map