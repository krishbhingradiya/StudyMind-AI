-- Quiz analytics: explicit score breakdown + persisted percentage
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS total_questions INTEGER;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS correct_answers INTEGER;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS wrong_answers INTEGER;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS percentage_score NUMERIC;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- Backfill from legacy score / max_score where possible
UPDATE public.quizzes
SET
  total_questions = COALESCE(total_questions, max_score::INTEGER),
  correct_answers = COALESCE(correct_answers, score::INTEGER),
  wrong_answers = COALESCE(
    wrong_answers,
    GREATEST(0, COALESCE(max_score::INTEGER, 0) - COALESCE(score::INTEGER, 0))
  ),
  percentage_score = COALESCE(
    percentage_score,
    CASE
      WHEN max_score IS NOT NULL AND max_score > 0 AND score IS NOT NULL
      THEN LEAST(100, GREATEST(0, ROUND((score / max_score) * 100)))
      ELSE NULL
    END
  )
WHERE score IS NOT NULL
  AND max_score IS NOT NULL
  AND max_score > 0;

-- Drop invalid rows that cannot produce a valid percentage (optional cleanup)
UPDATE public.quizzes
SET
  score = NULL,
  max_score = NULL,
  percentage_score = NULL,
  correct_answers = NULL,
  wrong_answers = NULL,
  total_questions = NULL
WHERE score IS NOT NULL
  AND (max_score IS NULL OR max_score <= 0);
