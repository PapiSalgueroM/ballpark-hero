CREATE TABLE public.tennis_chain_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_length integer NOT NULL,
  score integer NOT NULL,
  puzzle_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nickname text NOT NULL,
  mode text NOT NULL DEFAULT 'daily'
);

ALTER TABLE public.tennis_chain_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert tennis chain scores"
  ON public.tennis_chain_scores FOR INSERT
  WITH CHECK (
    score >= 0 AND score <= 50000
    AND chain_length >= 0 AND chain_length <= 100
    AND length(nickname) > 0 AND length(nickname) <= 30
    AND mode IN ('daily', 'unlimited')
  );

CREATE POLICY "Admins can read tennis chain scores"
  ON public.tennis_chain_scores FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view daily tennis chain leaderboard"
  ON public.tennis_chain_scores FOR SELECT
  USING (puzzle_date = CURRENT_DATE);