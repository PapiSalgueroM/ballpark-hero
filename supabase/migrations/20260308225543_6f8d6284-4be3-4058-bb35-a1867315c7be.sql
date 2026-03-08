CREATE TABLE public.medal_games_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date date NOT NULL,
  clues_used integer NOT NULL,
  score integer NOT NULL,
  guessed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.medal_games_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert medal game scores"
ON public.medal_games_scores
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read medal game scores"
ON public.medal_games_scores
FOR SELECT
USING (true);