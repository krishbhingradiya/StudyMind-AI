import { SupabaseClient } from "@supabase/supabase-js";
export interface RoadmapTaskRow {
    id: string;
    roadmap_id: string;
    completion_status: string;
    mastery_score: number;
    sort_order: number;
}
export declare function isTaskPassed(score: number): boolean;
export declare function recalculateRoadmapProgress(supabase: SupabaseClient, roadmapId: string, userId: string): Promise<void>;
export declare function unlockNextTask(supabase: SupabaseClient, roadmapId: string, userId: string, completedSortOrder: number): Promise<void>;
export declare function unlockFirstTasks(supabase: SupabaseClient, roadmapId: string, userId: string, count?: number): Promise<void>;
//# sourceMappingURL=roadmapProgressService.d.ts.map