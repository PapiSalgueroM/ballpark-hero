-- Reconstructed: daily_completions
-- Its original CREATE migration was missing from the repo and the live DB returned NULL
-- for to_regclass('public.daily_completions'). Schema derived from
-- src/integrations/supabase/types.ts (Row/Insert) and how the app uses the table:
--   - useGameCompletion inserts { user_id, game_slug, date } and relies on a unique
--     constraint to dedupe one completion per game per day.
--   - DailyChecklist, useDailyLegend, useGameNavbarStats, Profile, Index all query by
--     user_id + date (and game_slug), comparing date to today / CURRENT_DATE.
--   - The today-scoped public SELECT policy mirrors migration 20260330031441.
-- Idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS) so it is safe to run regardless of
-- what else is applied. NOTE: this SUPERSEDES the daily_completions statements in
-- 20260330031441 — skip those if you replay that migration.

CREATE TABLE IF NOT EXISTS public.daily_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_slug text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_slug, date)
);

ALTER TABLE public.daily_completions ENABLE ROW LEVEL SECURITY;

-- Logged-in users record their own completions (the app only inserts when authenticated)
DROP POLICY IF EXISTS "Users can insert own completions" ON public.daily_completions;
CREATE POLICY "Users can insert own completions"
  ON public.daily_completions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Logged-in users read their own completions (DailyChecklist / navbar stats / daily legend / profile)
DROP POLICY IF EXISTS "Users can view own completions" ON public.daily_completions;
CREATE POLICY "Users can view own completions"
  ON public.daily_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Public, today-scoped read for the home-page "X playing today" count (from 20260330031441)
DROP POLICY IF EXISTS "Public can view completions for leaderboard" ON public.daily_completions;
DROP POLICY IF EXISTS "Public can view today completions for leaderboard" ON public.daily_completions;
CREATE POLICY "Public can view today completions for leaderboard"
  ON public.daily_completions FOR SELECT TO public
  USING (date = CURRENT_DATE);
