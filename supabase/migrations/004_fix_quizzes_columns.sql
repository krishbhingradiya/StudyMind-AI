-- Fix quizzes table: add columns missing from older Supabase projects
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS score NUMERIC;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS max_score NUMERIC;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS answers JSONB;

-- Notify PostgREST to reload schema cache (fixes "column not in schema cache")
NOTIFY pgrst, 'reload schema';
