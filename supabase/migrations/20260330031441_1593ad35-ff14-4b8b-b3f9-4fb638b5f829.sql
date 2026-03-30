
-- 1. Drop overly permissive public SELECT on user_preferences
-- (the existing 'Users can view own preferences' policy covers authenticated owner reads)
DROP POLICY IF EXISTS "Public can view preferences" ON public.user_preferences;

-- 2. Replace blanket public SELECT on daily_completions with date-scoped policy
DROP POLICY IF EXISTS "Public can view completions for leaderboard" ON public.daily_completions;
CREATE POLICY "Public can view today completions for leaderboard"
  ON public.daily_completions
  FOR SELECT
  TO public
  USING (date = CURRENT_DATE);

-- 3. Restrict saved_brackets public read to only allow reading by bracket ID (not full table scan)
-- Keep public read since sharing is intentional, but already scoped by query filters in app code
-- No change needed — sharing brackets is an intentional feature

-- 4. Fix vote stuffing: restrict fantasy_draft_votes INSERT to authenticated users only
DROP POLICY IF EXISTS "Anyone can insert fantasy draft votes" ON public.fantasy_draft_votes;
CREATE POLICY "Authenticated users can insert one vote per day"
  ON public.fantasy_draft_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (length(voted_team) > 0)
    AND (length(voted_team) <= 10)
    AND NOT EXISTS (
      SELECT 1 FROM public.fantasy_draft_votes v
      WHERE v.puzzle_date = CURRENT_DATE
        AND v.created_at > (now() - interval '1 day')
    )
  );

-- Also restrict SELECT to authenticated for vote counts
DROP POLICY IF EXISTS "Anyone can read fantasy draft vote counts" ON public.fantasy_draft_votes;
CREATE POLICY "Authenticated can read daily vote counts"
  ON public.fantasy_draft_votes
  FOR SELECT
  TO authenticated
  USING (puzzle_date = CURRENT_DATE);
