-- Fix past_papers table for older Supabase projects (missing columns in schema cache)
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

ALTER TABLE public.past_papers ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.past_papers ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE public.past_papers ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.past_papers ADD COLUMN IF NOT EXISTS extracted_questions JSONB;
ALTER TABLE public.past_papers ADD COLUMN IF NOT EXISTS analysis JSONB;
ALTER TABLE public.past_papers ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();

NOTIFY pgrst, 'reload schema';
