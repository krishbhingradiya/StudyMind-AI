import { generateAI, parseJsonFromAI } from "./aiClient";
import { z } from "zod";

export type GoalType =
  | "exam_preparation"
  | "revision"
  | "placement_prep"
  | "assignment"
  | "presentation"
  | "interview_prep";

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
  performanceData?: { topic: string; accuracy: number }[];
  highPriorityTopics?: string[];
  syllabusUnits?: { name: string; topics: string[] }[];
  examTrends?: string[];
  predictedTopics?: string[];
  materialSummary?: string;
  syllabusText?: string;
  materialsText?: string;
}

// Zod schemas for AI response validation
const taskSchema = z.object({
  taskTitle: z.string(),
  taskType: z.enum(["study", "revision", "quiz", "practice", "writing", "presentation", "mock_test"]),
  subject: z.string(),
  topic: z.string(),
  difficulty: z.string(),
  verificationMethod: z.enum(["mini_quiz", "scenario", "writing", "timer", "practice"]),
  description: z.string(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  sortOrder: z.number(),
  week: z.number().min(1).max(4),
  phase: z.string()
});

const generatedRoadmapSchema = z.object({
  title: z.string(),
  dailyTasks: z.array(taskSchema),
  revisionSchedule: z.array(z.object({
    week: z.number(),
    topics: z.array(z.string()),
    goals: z.array(z.string())
  })),
  config: z.object({
    weakTopics: z.array(z.string()).optional(),
    preferredStyle: z.string().optional(),
    estimatedStudyHours: z.number().optional(),
    enhancements: z.object({
      strategy: z.string(),
      weakTopicTips: z.array(z.string()),
      motivation: z.string()
    }).optional()
  }).optional()
});

export type GeneratedTask = z.infer<typeof taskSchema>;
export type GeneratedRoadmap = z.infer<typeof generatedRoadmapSchema>;

function daysUntilExam(examDate?: string): number {
  if (!examDate) return 28;
  const diff = new Date(examDate).getTime() - Date.now();
  const rawDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(28, rawDays));
}

function normalizeTopics(input: RoadmapGenerateInput): string[] {
  const topics = [
    input.topic,
    ...(input.highPriorityTopics || []),
    ...(input.weakTopics || []),
    ...(input.predictedTopics || []),
  ]
    .filter(Boolean)
    .map((t) => t.trim())
    .filter(Boolean);

  return [...new Set(topics)];
}

function buildDeterministicFallback(input: RoadmapGenerateInput): GeneratedRoadmap {
  const days = daysUntilExam(input.examDate);
  const totalWeeks = 4;
  const tasksTarget = 12; // 3 tasks per week
  const topics = normalizeTopics(input);
  const startDate = new Date();

  const phases = ["Foundation", "Advanced", "Mastery", "Peak"];
  const verificationMethods: Array<GeneratedTask["verificationMethod"]> = ["timer", "practice", "mini_quiz", "writing"];

  const dailyTasks: GeneratedTask[] = Array.from({ length: tasksTarget }, (_, index) => {
    const week = Math.min(4, Math.floor((index / tasksTarget) * 4) + 1);
    const phase = phases[week - 1];
    const topic = topics[index % topics.length] || input.topic || "Core concepts";
    
    let dueDay = 0;
    if (days >= 28) {
      dueDay = (week - 1) * 7 + (index % 3);
    } else {
      const maxOffset = Math.max(0, days - 1);
      dueDay = tasksTarget > 1 
        ? Math.floor((index / (tasksTarget - 1)) * maxOffset)
        : 0;
    }

    const dueDate = new Date(startDate.getTime() + dueDay * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const taskType: GeneratedTask["taskType"] = index % 3 === 0 ? "study" : index % 3 === 1 ? "practice" : "quiz";

    return {
      taskTitle: `Phase ${week} ${phase}: Master ${topic}`,
      taskType,
      subject: input.subject,
      topic,
      difficulty: input.difficulty,
      verificationMethod: verificationMethods[index % verificationMethods.length],
      description: `Review study guides and notes on ${topic} concepts.`,
      dueDate,
      priority: index % 2 === 0 ? "high" : "medium",
      sortOrder: index,
      week,
      phase,
    };
  });

  const revisionSchedule = Array.from({ length: totalWeeks }, (_, index) => ({
    week: index + 1,
    topics: [topics[index % topics.length] || topics[0] || "General review"],
    goals: [`Master the ${phases[index]} phase topics and verify your progress via active recall.`],
  }));

  const isShortTerm = days < 7;
  const title = isShortTerm
    ? `${input.subject} ${days}-Day Intensive Cram Plan`
    : `${input.subject} ${days}-Day Study Roadmap`;

  return {
    title,
    dailyTasks,
    revisionSchedule,
    config: {
      weakTopics: input.weakTopics,
      preferredStyle: input.preferredStyle,
      estimatedStudyHours: days * input.dailyStudyHours * 0.8,
      enhancements: {
        strategy: isShortTerm 
          ? "Focused high-yield learning with immediate active verification."
          : "Start strong with Phase 1 foundations, then verify through interactive tasks.",
        weakTopicTips: ["Schedule daily revision blocks", "Write summaries using the Feynman Technique"],
        motivation: "Consistency builds compound knowledge.",
      },
    },
  };
}

export async function generateRoadmap(input: RoadmapGenerateInput): Promise<GeneratedRoadmap> {
  const startTime = Date.now();
  console.log(`[ROADMAP_GEN_SERVICE] Initiating study plan AI compiler for subject: "${input.subject}"`);

  // Intelligently limit extracted texts to 3000 chars for extreme speed and low latency
  const syllabusSnippet = input.syllabusText ? input.syllabusText.slice(0, 3000) : "No syllabus text provided.";
  const materialsSnippet = input.materialsText ? input.materialsText.slice(0, 3000) : "No material text provided.";
  
  const daysLeft = daysUntilExam(input.examDate);
  const estimatedHours = daysLeft * input.dailyStudyHours * 0.8;

  let timeConstraintMessage = "";
  if (daysLeft < 7) {
    timeConstraintMessage = `CRITICAL TIME CONSTRAINT: The user's exam is in exactly ${daysLeft} days! This is an intensive daily cram/revision plan. 
Map the tasks to Weeks 1-4 for system layout compatibility, but write the task descriptions and phases as a progressive daily program:
- Week 1 tasks = Phase 1 (Foundation): High-yield core axioms (due today, Day 0)
- Week 2 tasks = Phase 2 (Advanced): Intensive practice and key topic study (due Tomorrow, Day 1)
- Week 3 tasks = Phase 3 (Mastery): Targeted weak area revision (due Day 2)
- Week 4 tasks = Phase 4 (Peak): Final cram, simulated mock quizzes, active recall (due Day 2/Day before exam)
Each week should contain exactly 2-3 tasks, totaling 8-12 tasks overall. Ensure dueDate matches the progressive Day 0 to Day 2 timeline.`;
  } else if (daysLeft < 28) {
    timeConstraintMessage = `TIME CONSTRAINT: The user's exam is in ${daysLeft} days. This is a compressed study plan spanning ${daysLeft} days.
Map the tasks to Weeks 1-4 for system layout compatibility, representing four progressive phases:
- Week 1: Foundation (due early)
- Week 2: Advanced study
- Week 3: Weak topics review
- Week 4: Final peak revision (due before the exam)
Ensure all tasks have dueDates strictly before the exam date (within the next ${daysLeft} days).`;
  } else {
    timeConstraintMessage = `STANDARD PLAN: The user has 4 weeks or more until the exam. Create a personalized, hyper-specific 4-week study roadmap with balanced weekly progression.`;
  }

  const messages = [
    {
      role: "system" as const,
      content: `You are an expert university academic advisor. Create a personalized, hyper-specific study roadmap based on the syllabus and materials content.
${timeConstraintMessage}

Return ONLY a valid JSON object matching the GeneratedRoadmap structure. DO NOT wrap in markdown block. Just the raw JSON.

Structure requirements:
{
  "title": "${input.subject} Verified Plan (${daysLeft} Days)",
  "dailyTasks": [
    {
      "taskTitle": "Week 1 Foundation: ...",
      "taskType": "study" | "revision" | "quiz" | "practice" | "writing" | "presentation" | "mock_test",
      "subject": "...",
      "topic": "...",
      "difficulty": "easy" | "medium" | "hard",
      "verificationMethod": "mini_quiz" | "scenario" | "writing" | "timer" | "practice",
      "description": "Short concise task description, max 15 words...",
      "dueDate": "YYYY-MM-DD",
      "priority": "low" | "medium" | "high",
      "sortOrder": 0,
      "week": 1,
      "phase": "Foundation"
    }
  ],
  "revisionSchedule": [
    {
      "week": 1,
      "topics": ["Matrix Axioms"],
      "goals": ["Build foundational knowledge"]
    }
  ],
  "config": {
    "weakTopics": ["Linear Algebra"],
    "preferredStyle": "...",
    "estimatedStudyHours": 40,
    "enhancements": {
      "strategy": "...",
      "weakTopicTips": ["...", "..."],
      "motivation": "..."
    }
  }
}

Generate exactly 8 to 12 tasks spread evenly across weeks 1-4. Ensure dueDate starts from today and moves forward. Keep descriptions under 15 words.`,
    },
    {
      role: "user" as const,
      content: `Subject: ${input.subject}
Focus Area: ${input.topic}
University: ${input.university || "GTU"}
Semester: ${input.semester || "N/A"}
Daily Study Hours: ${input.dailyStudyHours}h
Difficulty: ${input.difficulty}
Exam Date: ${input.examDate || "N/A"}
Weak Topics: ${input.weakTopics?.join(", ") || "None"}

Syllabus Content:
${syllabusSnippet}

Materials Content:
${materialsSnippet}`,
    },
  ];

  try {
    const response = await generateAI(messages, {
      maxTokens: 2500,
      temperature: 0.4,
      preferFast: true, // Crucial: use fast model (gemini-1.5-flash) for extreme speed (< 5s!)
    });

    const rawParsed = parseJsonFromAI<GeneratedRoadmap>(response);
    
    // Zod Response Validation
    const parsed = generatedRoadmapSchema.parse(rawParsed);

    if (parsed && Array.isArray(parsed.dailyTasks) && parsed.dailyTasks.length > 0) {
      // Post-process to ensure IDs, order, and dates are pristine
      const startDate = new Date();
      const totalTasks = parsed.dailyTasks.length;

      parsed.dailyTasks = parsed.dailyTasks.map((t, idx) => {
        const weekNum = t.week || Math.min(4, Math.floor((idx / totalTasks) * 4) + 1);
        
        let dayOffset = 0;
        if (daysLeft >= 28) {
          dayOffset = (weekNum - 1) * 7 + (idx % 3);
        } else {
          const maxOffset = Math.max(0, daysLeft - 1);
          dayOffset = totalTasks > 1 
            ? Math.floor((idx / (totalTasks - 1)) * maxOffset)
            : 0;
        }

        const calcDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        return {
          ...t,
          subject: t.subject || input.subject,
          difficulty: t.difficulty || input.difficulty,
          dueDate: t.dueDate || calcDate.toISOString().slice(0, 10),
          sortOrder: idx,
          week: weekNum,
          phase: t.phase || ["Foundation", "Advanced", "Mastery", "Peak"][weekNum - 1],
        };
      });

      // Recalculate config values
      parsed.config = {
        ...parsed.config,
        weakTopics: parsed.config?.weakTopics || input.weakTopics || [],
        preferredStyle: parsed.config?.preferredStyle || input.preferredStyle || "Balanced study modules",
        estimatedStudyHours: parsed.config?.estimatedStudyHours || estimatedHours,
        enhancements: parsed.config?.enhancements || {
          strategy: daysLeft < 7 
            ? "Execute daily cram blocks and focus on high-yield recall tests."
            : "Focus on Week 1 foundations and leverage active recall before simulated exams.",
          weakTopicTips: ["Formulate conceptual summaries", "Complete mock quizzes in weekly sessions"],
          motivation: "Success is built on daily study routines.",
        },
      };

      const duration = Date.now() - startTime;
      console.log(`[AI_PERFORMANCE] Roadmap generation completed in ${duration}ms (Zod validated)`);
      return parsed;
    }

    throw new Error("Invalid roadmap JSON returned by AI");
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[ROADMAP_GEN_SERVICE] AI roadmap generation failed after ${duration}ms. Using fallback.`, err);
    return buildDeterministicFallback(input);
  }
}
