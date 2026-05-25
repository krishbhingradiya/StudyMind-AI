-- Missing tables for AI Notes (safe to run multiple times)
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ozaqavrhznfcmeqtujlj/sql/new

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

NOTIFY pgrst, 'reload schema';
