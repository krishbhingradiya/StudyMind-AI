-- StudyMind AI - PostgreSQL Schema
-- Run in Supabase SQL Editor

-- Users profile (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  university TEXT,
  branch TEXT,
  semester INTEGER,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  extracted_text TEXT,
  subject TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary_type TEXT DEFAULT 'concise',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  score NUMERIC,
  max_score NUMERIC,
  total_questions INTEGER,
  correct_answers INTEGER,
  wrong_answers INTEGER,
  percentage_score NUMERIC,
  difficulty TEXT,
  time_taken_seconds INTEGER,
  answers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weak_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  accuracy_percentage NUMERIC DEFAULT 0,
  attempt_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_name)
);

CREATE TABLE IF NOT EXISTS public.roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  topic TEXT,
  exam_date DATE,
  daily_study_hours NUMERIC DEFAULT 2,
  difficulty TEXT DEFAULT 'medium',
  goal_type TEXT DEFAULT 'exam_preparation',
  config JSONB DEFAULT '{}',
  progress_percentage NUMERIC DEFAULT 0,
  mastery_score NUMERIC DEFAULT 0,
  exam_readiness NUMERIC DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  daily_tasks JSONB NOT NULL DEFAULT '[]',
  revision_schedule JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.past_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  university TEXT,
  year INTEGER,
  storage_path TEXT,
  extracted_questions JSONB,
  analysis JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weak_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_roadmap ON public.roadmap_tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_user ON public.roadmap_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_task_attempts_task ON public.task_attempts(roadmap_task_id);

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage own uploads" ON public.uploads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own summaries" ON public.summaries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own weak_topics" ON public.weak_topics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own roadmaps" ON public.roadmaps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own roadmap_tasks" ON public.roadmap_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own task_attempts" ON public.task_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own study_sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own past_papers" ON public.past_papers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own activity_logs" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);

-- Storage bucket (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', false);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER roadmaps_updated_at BEFORE UPDATE ON public.roadmaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
