-- Verified learning roadmap system

ALTER TABLE public.roadmaps ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.roadmaps ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.roadmaps ADD COLUMN IF NOT EXISTS exam_date DATE;
ALTER TABLE public.roadmaps ADD COLUMN IF NOT EXISTS daily_study_hours NUMERIC DEFAULT 2;
ALTER TABLE public.roadmaps ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
ALTER TABLE public.roadmaps ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'exam_preparation';
ALTER TABLE public.roadmaps ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
ALTER TABLE public.roadmaps ADD COLUMN IF NOT EXISTS mastery_score NUMERIC DEFAULT 0;
ALTER TABLE public.roadmaps ADD COLUMN IF NOT EXISTS exam_readiness NUMERIC DEFAULT 0;
ALTER TABLE public.roadmaps ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.roadmap_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'study',
  subject TEXT,
  topic TEXT,
  difficulty TEXT DEFAULT 'medium',
  verification_method TEXT NOT NULL DEFAULT 'mini_quiz',
  completion_status TEXT NOT NULL DEFAULT 'locked',
  mastery_score NUMERIC DEFAULT 0,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  description TEXT,
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  roadmap_task_id UUID NOT NULL REFERENCES public.roadmap_tasks(id) ON DELETE CASCADE,
  attempt_type TEXT NOT NULL,
  score NUMERIC,
  passed BOOLEAN DEFAULT false,
  feedback TEXT,
  response JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  roadmap_task_id UUID REFERENCES public.roadmap_tasks(id) ON DELETE CASCADE,
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_roadmap ON public.roadmap_tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_user ON public.roadmap_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_task_attempts_task ON public.task_attempts(roadmap_task_id);

ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'roadmap_tasks' AND policyname = 'Users manage own roadmap_tasks') THEN
    CREATE POLICY "Users manage own roadmap_tasks" ON public.roadmap_tasks FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_attempts' AND policyname = 'Users manage own task_attempts') THEN
    CREATE POLICY "Users manage own task_attempts" ON public.task_attempts FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'study_sessions' AND policyname = 'Users manage own study_sessions') THEN
    CREATE POLICY "Users manage own study_sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
