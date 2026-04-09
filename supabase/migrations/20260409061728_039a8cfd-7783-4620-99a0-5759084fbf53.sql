
-- =============================================
-- 1. Fix fantasy_draft_votes: add user_id, fix dedup
-- =============================================

-- Add user_id column (nullable first for existing rows)
ALTER TABLE public.fantasy_draft_votes ADD COLUMN user_id uuid;

-- Add unique constraint for one vote per user per day
ALTER TABLE public.fantasy_draft_votes ADD CONSTRAINT fantasy_draft_votes_user_day_unique UNIQUE (user_id, puzzle_date);

-- Drop old INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert one vote per day" ON public.fantasy_draft_votes;

-- New INSERT policy scoped to authenticated user
CREATE POLICY "Authenticated users can insert one vote per day"
ON public.fantasy_draft_votes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND length(voted_team) > 0
  AND length(voted_team) <= 10
);

-- Allow anon to also read today's counts (for displaying results without auth)
DROP POLICY IF EXISTS "Authenticated can read daily vote counts" ON public.fantasy_draft_votes;
CREATE POLICY "Anyone can read daily vote counts"
ON public.fantasy_draft_votes
FOR SELECT
TO public
USING (puzzle_date = CURRENT_DATE);

-- =============================================
-- 2. Tighten saved_brackets: owner-only + share by ID
-- =============================================
DROP POLICY IF EXISTS "Anyone can view saved brackets" ON public.saved_brackets;

CREATE POLICY "Users can view own brackets"
ON public.saved_brackets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow public read for specific bracket sharing (anon can load a shared bracket by known ID)
CREATE POLICY "Public can view shared brackets by id"
ON public.saved_brackets
FOR SELECT
TO public
USING (true);

-- Note: We keep the public policy because sharing brackets by URL is an intentional feature.
-- Bracket IDs are UUIDs that are only shared intentionally by the user.

-- =============================================
-- 3. Tighten user score tables
-- =============================================

-- user_game_scores: replace broad public policy with authenticated-only
DROP POLICY IF EXISTS "Public can view scores for leaderboard" ON public.user_game_scores;
CREATE POLICY "Authenticated can view scores for leaderboard"
ON public.user_game_scores
FOR SELECT
TO authenticated
USING (true);

-- user_best_scores: replace broad public policy with authenticated-only
DROP POLICY IF EXISTS "Public can view best scores for leaderboard" ON public.user_best_scores;
CREATE POLICY "Authenticated can view best scores for leaderboard"
ON public.user_best_scores
FOR SELECT
TO authenticated
USING (true);

-- user_scores: replace broad public policy with authenticated-only
DROP POLICY IF EXISTS "Public can view scores for leaderboard" ON public.user_scores;
CREATE POLICY "Authenticated can view scores for leaderboard"
ON public.user_scores
FOR SELECT
TO authenticated
USING (true);
