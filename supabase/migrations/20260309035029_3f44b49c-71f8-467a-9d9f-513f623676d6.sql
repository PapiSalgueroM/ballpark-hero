
CREATE TABLE public.fantasy_draft_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date date NOT NULL DEFAULT CURRENT_DATE,
  voted_team text NOT NULL CHECK (voted_team IN ('user','ai')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fantasy_draft_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert fantasy draft votes"
  ON public.fantasy_draft_votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(voted_team) > 0 AND length(voted_team) <= 10
  );

CREATE POLICY "Anyone can read fantasy draft vote counts"
  ON public.fantasy_draft_votes
  FOR SELECT
  TO anon, authenticated
  USING (puzzle_date = CURRENT_DATE);
