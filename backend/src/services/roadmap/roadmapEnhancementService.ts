import { generateAI, parseJsonFromAI } from "../ai/aiClient";
import { RoadmapGenerateInput, GeneratedRoadmap } from "../ai/roadmapService";

export interface RoadmapEnhancement {
  strategy: string;
  weakTopicTips: string[];
  motivation: string;
}

const enhancementPrompt = (input: RoadmapGenerateInput): string => {
  const weakTopics = input.weakTopics?.length
    ? input.weakTopics.join(", ")
    : "none";
  return `You are a concise academic coach. Provide a short study strategy for ${input.subject} - ${input.topic} with a focus on weak topics: ${weakTopics}.
Return ONLY valid JSON with keys: strategy, weakTopicTips, motivation.
Example:
{
  "strategy": "...",
  "weakTopicTips": ["..."],
  "motivation": "..."
}`;
};

export async function enhanceRoadmap(
  input: RoadmapGenerateInput,
  roadmap: GeneratedRoadmap
): Promise<RoadmapEnhancement | null> {
  try {
    const response = await generateAI(
      [
        {
          role: "system",
          content: "You are a concise academic coach. Provide actionable study guidance for the user.",
        },
        {
          role: "user",
          content: enhancementPrompt(input),
        },
      ],
      { maxTokens: 300, temperature: 0.4, preferFast: true }
    );

    const parsed = parseJsonFromAI<RoadmapEnhancement>(response);
    return {
      strategy: parsed.strategy?.trim() || "Focus on your weakest topics first, then reinforce with practice.",
      weakTopicTips:
        Array.isArray(parsed.weakTopicTips) && parsed.weakTopicTips.length
          ? parsed.weakTopicTips.map((t) => t.trim())
          : [
              "Review weak topics with short daily practice",
              "Turn complex concepts into 3 bullet points",
            ],
      motivation: parsed.motivation?.trim() || "Stay consistent and reward small wins every day.",
    };
  } catch (err) {
    console.warn("Roadmap enhancement AI failed:", (err as Error).message);
    return null;
  }
}
