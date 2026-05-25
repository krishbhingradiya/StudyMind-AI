-- Ensure extracted_text is TEXT (not JSON/JSONB) to avoid Unicode escape errors
-- Run in Supabase SQL Editor if uploads still fail

ALTER TABLE public.uploads
  ALTER COLUMN extracted_text TYPE TEXT
  USING (
    CASE
      WHEN extracted_text IS NULL THEN NULL
      ELSE extracted_text::text
    END
  );
