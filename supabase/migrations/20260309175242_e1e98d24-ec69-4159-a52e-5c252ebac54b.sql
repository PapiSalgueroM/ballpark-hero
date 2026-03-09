ALTER TABLE public.user_scores ADD COLUMN current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_scores ADD COLUMN longest_streak integer NOT NULL DEFAULT 0;