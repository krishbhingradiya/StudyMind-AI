import { z } from "zod";
export type GoalType = "exam_preparation" | "revision" | "placement_prep" | "assignment" | "presentation" | "interview_prep";
export interface RoadmapGenerateInput {
    subject: string;
    topic: string;
    university?: string;
    branch?: string;
    semester?: number;
    examDate?: string;
    dailyStudyHours: number;
    difficulty: "easy" | "medium" | "hard";
    goalType: GoalType;
    weakTopics?: string[];
    preferredStyle?: string;
    performanceData?: {
        topic: string;
        accuracy: number;
    }[];
    highPriorityTopics?: string[];
    syllabusUnits?: {
        name: string;
        topics: string[];
    }[];
    examTrends?: string[];
    predictedTopics?: string[];
    materialSummary?: string;
    syllabusText?: string;
    materialsText?: string;
}
declare const taskSchema: z.ZodObject<{
    taskTitle: z.ZodString;
    taskType: z.ZodEnum<["study", "revision", "quiz", "practice", "writing", "presentation", "mock_test"]>;
    subject: z.ZodString;
    topic: z.ZodString;
    difficulty: z.ZodString;
    verificationMethod: z.ZodEnum<["mini_quiz", "scenario", "writing", "timer", "practice"]>;
    description: z.ZodString;
    dueDate: z.ZodOptional<z.ZodString>;
    priority: z.ZodEnum<["low", "medium", "high"]>;
    sortOrder: z.ZodNumber;
    week: z.ZodNumber;
    phase: z.ZodString;
}, "strip", z.ZodTypeAny, {
    subject: string;
    topic: string;
    taskTitle: string;
    taskType: "writing" | "practice" | "revision" | "quiz" | "presentation" | "study" | "mock_test";
    difficulty: string;
    verificationMethod: "scenario" | "writing" | "mini_quiz" | "practice" | "timer";
    description: string;
    priority: "low" | "medium" | "high";
    sortOrder: number;
    week: number;
    phase: string;
    dueDate?: string | undefined;
}, {
    subject: string;
    topic: string;
    taskTitle: string;
    taskType: "writing" | "practice" | "revision" | "quiz" | "presentation" | "study" | "mock_test";
    difficulty: string;
    verificationMethod: "scenario" | "writing" | "mini_quiz" | "practice" | "timer";
    description: string;
    priority: "low" | "medium" | "high";
    sortOrder: number;
    week: number;
    phase: string;
    dueDate?: string | undefined;
}>;
declare const generatedRoadmapSchema: z.ZodObject<{
    title: z.ZodString;
    dailyTasks: z.ZodArray<z.ZodObject<{
        taskTitle: z.ZodString;
        taskType: z.ZodEnum<["study", "revision", "quiz", "practice", "writing", "presentation", "mock_test"]>;
        subject: z.ZodString;
        topic: z.ZodString;
        difficulty: z.ZodString;
        verificationMethod: z.ZodEnum<["mini_quiz", "scenario", "writing", "timer", "practice"]>;
        description: z.ZodString;
        dueDate: z.ZodOptional<z.ZodString>;
        priority: z.ZodEnum<["low", "medium", "high"]>;
        sortOrder: z.ZodNumber;
        week: z.ZodNumber;
        phase: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        subject: string;
        topic: string;
        taskTitle: string;
        taskType: "writing" | "practice" | "revision" | "quiz" | "presentation" | "study" | "mock_test";
        difficulty: string;
        verificationMethod: "scenario" | "writing" | "mini_quiz" | "practice" | "timer";
        description: string;
        priority: "low" | "medium" | "high";
        sortOrder: number;
        week: number;
        phase: string;
        dueDate?: string | undefined;
    }, {
        subject: string;
        topic: string;
        taskTitle: string;
        taskType: "writing" | "practice" | "revision" | "quiz" | "presentation" | "study" | "mock_test";
        difficulty: string;
        verificationMethod: "scenario" | "writing" | "mini_quiz" | "practice" | "timer";
        description: string;
        priority: "low" | "medium" | "high";
        sortOrder: number;
        week: number;
        phase: string;
        dueDate?: string | undefined;
    }>, "many">;
    revisionSchedule: z.ZodArray<z.ZodObject<{
        week: z.ZodNumber;
        topics: z.ZodArray<z.ZodString, "many">;
        goals: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        week: number;
        topics: string[];
        goals: string[];
    }, {
        week: number;
        topics: string[];
        goals: string[];
    }>, "many">;
    config: z.ZodOptional<z.ZodObject<{
        weakTopics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        preferredStyle: z.ZodOptional<z.ZodString>;
        estimatedStudyHours: z.ZodOptional<z.ZodNumber>;
        enhancements: z.ZodOptional<z.ZodObject<{
            strategy: z.ZodString;
            weakTopicTips: z.ZodArray<z.ZodString, "many">;
            motivation: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            strategy: string;
            weakTopicTips: string[];
            motivation: string;
        }, {
            strategy: string;
            weakTopicTips: string[];
            motivation: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        weakTopics?: string[] | undefined;
        preferredStyle?: string | undefined;
        estimatedStudyHours?: number | undefined;
        enhancements?: {
            strategy: string;
            weakTopicTips: string[];
            motivation: string;
        } | undefined;
    }, {
        weakTopics?: string[] | undefined;
        preferredStyle?: string | undefined;
        estimatedStudyHours?: number | undefined;
        enhancements?: {
            strategy: string;
            weakTopicTips: string[];
            motivation: string;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    dailyTasks: {
        subject: string;
        topic: string;
        taskTitle: string;
        taskType: "writing" | "practice" | "revision" | "quiz" | "presentation" | "study" | "mock_test";
        difficulty: string;
        verificationMethod: "scenario" | "writing" | "mini_quiz" | "practice" | "timer";
        description: string;
        priority: "low" | "medium" | "high";
        sortOrder: number;
        week: number;
        phase: string;
        dueDate?: string | undefined;
    }[];
    revisionSchedule: {
        week: number;
        topics: string[];
        goals: string[];
    }[];
    config?: {
        weakTopics?: string[] | undefined;
        preferredStyle?: string | undefined;
        estimatedStudyHours?: number | undefined;
        enhancements?: {
            strategy: string;
            weakTopicTips: string[];
            motivation: string;
        } | undefined;
    } | undefined;
}, {
    title: string;
    dailyTasks: {
        subject: string;
        topic: string;
        taskTitle: string;
        taskType: "writing" | "practice" | "revision" | "quiz" | "presentation" | "study" | "mock_test";
        difficulty: string;
        verificationMethod: "scenario" | "writing" | "mini_quiz" | "practice" | "timer";
        description: string;
        priority: "low" | "medium" | "high";
        sortOrder: number;
        week: number;
        phase: string;
        dueDate?: string | undefined;
    }[];
    revisionSchedule: {
        week: number;
        topics: string[];
        goals: string[];
    }[];
    config?: {
        weakTopics?: string[] | undefined;
        preferredStyle?: string | undefined;
        estimatedStudyHours?: number | undefined;
        enhancements?: {
            strategy: string;
            weakTopicTips: string[];
            motivation: string;
        } | undefined;
    } | undefined;
}>;
export type GeneratedTask = z.infer<typeof taskSchema>;
export type GeneratedRoadmap = z.infer<typeof generatedRoadmapSchema>;
export declare function generateRoadmap(input: RoadmapGenerateInput): Promise<GeneratedRoadmap>;
export {};
//# sourceMappingURL=roadmapService.d.ts.map