
CREATE TABLE public.fantasy_draft_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date date NOT NULL UNIQUE,
  criteria text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fantasy_draft_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fantasy draft daily"
  ON public.fantasy_draft_daily
  FOR SELECT
  TO anon, authenticated
  USING (true);
