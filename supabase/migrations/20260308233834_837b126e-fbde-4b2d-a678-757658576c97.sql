CREATE TABLE public.college_guess_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date date NOT NULL,
  clues_used integer NOT NULL,
  score integer NOT NULL,
  guessed boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'daily',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.college_guess_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert college guess scores" ON public.college_guess_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read college guess scores" ON public.college_guess_scores FOR SELECT USING (true);