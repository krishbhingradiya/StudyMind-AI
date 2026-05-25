import { RoadmapGenerateInput, GeneratedRoadmap } from "../ai/roadmapService";
export interface RoadmapEnhancement {
    strategy: string;
    weakTopicTips: string[];
    motivation: string;
}
export declare function enhanceRoadmap(input: RoadmapGenerateInput, roadmap: GeneratedRoadmap): Promise<RoadmapEnhancement | null>;
//# sourceMappingURL=roadmapEnhancementService.d.ts.map