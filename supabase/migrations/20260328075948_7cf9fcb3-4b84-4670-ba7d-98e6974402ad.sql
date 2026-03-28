
CREATE TABLE public.soccer_career_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  country text NOT NULL,
  tier integer NOT NULL CHECK (tier >= 1 AND tier <= 4),
  color text NOT NULL DEFAULT '#22c55e',
  league text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.soccer_career_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read clubs" ON public.soccer_career_clubs
  FOR SELECT TO public USING (true);
