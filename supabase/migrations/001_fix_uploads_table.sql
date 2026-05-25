-- Run this in Supabase SQL Editor if uploads fail with "storage_path" column missing
-- Safe to run multiple times (idempotent)

-- uploads: add columns required by the backend
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS subject TEXT;

-- Backfill storage_path for any existing rows (if you had old data)
UPDATE public.uploads
SET storage_path = COALESCE(storage_path, user_id::text || '/legacy/' || id::text)
WHERE storage_path IS NULL;

-- Optional: enforce NOT NULL after backfill (skip if you have rows without paths)
-- ALTER TABLE public.uploads ALTER COLUMN storage_path SET NOT NULL;

-- activity_logs (used after upload) — create if missing
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Users manage own activity_logs'
  ) THEN
    CREATE POLICY "Users manage own activity_logs" ON public.activity_logs
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- summaries table (if you only ran the minimal schema)
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary_type TEXT DEFAULT 'concise',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'summaries' AND policyname = 'Users manage own summaries'
  ) THEN
    CREATE POLICY "Users manage own summaries" ON public.summaries
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Refresh PostgREST schema cache (Supabase picks this up automatically; NOTIFY helps on some setups)
NOTIFY pgrst, 'reload schema';
