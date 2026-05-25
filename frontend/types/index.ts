export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  university?: string;
  branch?: string;
  semester?: number;
  avatar_url?: string;
  created_at: string;
}

export interface Upload {
  id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  subject?: string;
  material_type?: string;
  university?: string;
  analysis_id?: string;
  uploaded_at: string;
}

export interface Summary {
  id: string;
  title: string;
  content?: string;
  summary_type: string;
  created_at: string;
  upload_id?: string;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "theory" | "scenario" | "writing";
  question: string;
  options?: string[];
  correctAnswer?: string | null;
  correctAnswerIndex?: number;
  explanation?: string;
  topic?: string;
}

export interface Quiz {
  id: string;
  topic: string;
  questions?: QuizQuestion[];
  score?: number | null;
  max_score?: number | null;
  total_questions?: number | null;
  correct_answers?: number | null;
  wrong_answers?: number | null;
  percentage_score?: number | null;
  difficulty?: string | null;
  time_taken_seconds?: number | null;
  answers?: Record<string, string> | null;
  created_at: string;
}

export interface WeakTopic {
  id: string;
  topic_name: string;
  accuracy_percentage: number;
  attempt_count: number;
  last_updated: string;
}

export type RoadmapGoalType =
  | "exam_preparation"
  | "revision"
  | "placement_prep"
  | "assignment"
  | "presentation"
  | "interview_prep";

export type TaskCompletionStatus = "locked" | "available" | "in_progress" | "completed";

export interface VerifiedRoadmapTask {
  id: string;
  roadmap_id: string;
  task_title: string;
  task_type: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  verification_method: string;
  completion_status: TaskCompletionStatus;
  mastery_score?: number;
  due_date?: string;
  priority?: string;
  description?: string;
  sort_order?: number;
  completed_at?: string;
  metadata?: { week?: string | number; [key: string]: any } | null;
}

export interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  priority: "low" | "medium" | "high";
}

export interface RoadmapEnhancement {
  strategy?: string;
  weakTopicTips?: string[];
  motivation?: string;
}

export interface Roadmap {
  id: string;
  title: string;
  subject?: string;
  topic?: string;
  exam_date?: string;
  daily_study_hours?: number;
  difficulty?: string;
  goal_type?: RoadmapGoalType;
  status?: "pending" | "processing" | "ready" | "failed";
  daily_tasks?: RoadmapTask[];
  revision_schedule?: { week: number; topics: string[]; goals: string[] }[];
  progress_percentage: number;
  mastery_score?: number;
  exam_readiness?: number;
  streak_days?: number;
  tasks?: VerifiedRoadmapTask[];
  config?: {
    estimatedStudyHours?: number;
    weakTopics?: string[];
    enhancements?: RoadmapEnhancement;
  };
  created_at: string;
}

export interface VerificationChallenge {
  method: string;
  questions?: QuizQuestion[];
  prompt?: string;
  minMinutes?: number;
  sessionId?: string;
}

export type MasteryLevel = "none" | "beginner" | "developing" | "proficient" | "advanced";

export interface TopicPerformance {
  topic: string;
  avgScore: number;
  attempts: number;
}

export interface ExamQuestionPart {
  label: string;
  marks: number;
  text: string;
}

export interface ExamQuestion {
  number: string;
  marks: number;
  text: string;
  subparts?: ExamQuestionPart[];
  note?: string;
}

export interface ExamSection {
  title: string;
  sectionMarks: number;
  attemptRule: string;
  questions: ExamQuestion[];
}

export interface PredictedExamPaper {
  university: string;
  examTitle: string;
  subject: string;
  subjectCode?: string;
  branch?: string;
  semester?: string;
  examDate: string;
  durationMinutes: number;
  totalMarks: number;
  examType: string;
  instructions: string[];
  sections: ExamSection[];
  footerNote: string;
}

export interface DashboardAnalytics {
  stats: {
    totalQuizzes: number;
    totalUploads: number;
    avgQuizScore: number | null;
    hasQuizData: boolean;
    roadmapProgress: number;
    examReadiness: number;
    weakTopicCount: number;
    strongTopicCount: number;
    weeklyImprovement: number | null;
    avgTimeSeconds: number | null;
    studyConsistency: number;
  };
  weakTopics: WeakTopic[];
  strongTopics: WeakTopic[];
  activityByDay: Record<string, number>;
  quizPerformance: { date: string; score: number; topic: string }[];
  topicPerformance: TopicPerformance[];
  masteryLevel: MasteryLevel;
}
