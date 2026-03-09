
CREATE TABLE public.fantasy_draft_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text NOT NULL CHECK (position IN ('GK','DEF','MID','FWD')),
  nationality text NOT NULL,
  market_value_millions integer NOT NULL DEFAULT 0,
  dominant_foot text NOT NULL CHECK (dominant_foot IN ('Left','Right','Both')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fantasy_draft_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fantasy draft players"
  ON public.fantasy_draft_players
  FOR SELECT
  TO anon, authenticated
  USING (true);
