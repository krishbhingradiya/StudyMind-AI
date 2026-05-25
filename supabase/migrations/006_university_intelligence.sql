-- University-aware academic intelligence

CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_name TEXT NOT NULL,
  branch TEXT,
  semester INTEGER,
  syllabus_data JSONB DEFAULT '{}',
  marking_scheme JSONB DEFAULT '{}',
  exam_trends JSONB DEFAULT '{}',
  subject_catalog JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(university_name, branch, semester)
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  branch TEXT,
  semester INTEGER,
  unit_structure JSONB DEFAULT '[]',
  topic_graph JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_material_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE SET NULL,
  file_type TEXT NOT NULL,
  file_name TEXT,
  university TEXT,
  branch TEXT,
  semester INTEGER,
  subject TEXT,
  extracted_topics JSONB DEFAULT '[]',
  units JSONB DEFAULT '[]',
  chapters JSONB DEFAULT '[]',
  difficulty_analysis JSONB DEFAULT '{}',
  important_topics JSONB DEFAULT '[]',
  keywords JSONB DEFAULT '[]',
  study_hours_estimate NUMERIC,
  full_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  past_paper_id UUID REFERENCES public.past_papers(id) ON DELETE SET NULL,
  subject_name TEXT NOT NULL,
  university TEXT,
  repeated_questions JSONB DEFAULT '[]',
  high_weightage_topics JSONB DEFAULT '[]',
  predicted_topics JSONB DEFAULT '[]',
  exam_patterns JSONB DEFAULT '[]',
  difficulty_breakdown JSONB DEFAULT '{}',
  full_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS material_type TEXT DEFAULT 'notes';
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS semester INTEGER;
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS analysis_id UUID;

CREATE INDEX IF NOT EXISTS idx_material_analysis_user ON public.study_material_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_patterns_user ON public.exam_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON public.subjects(user_id);

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_material_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_patterns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'universities' AND policyname = 'Anyone read universities') THEN
    CREATE POLICY "Anyone read universities" ON public.universities FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Users manage own subjects') THEN
    CREATE POLICY "Users manage own subjects" ON public.subjects FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'study_material_analysis' AND policyname = 'Users manage own material analysis') THEN
    CREATE POLICY "Users manage own material analysis" ON public.study_material_analysis FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exam_patterns' AND policyname = 'Users manage own exam_patterns') THEN
    CREATE POLICY "Users manage own exam_patterns" ON public.exam_patterns FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
