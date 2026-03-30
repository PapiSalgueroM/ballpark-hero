
CREATE TABLE public.nfl_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  common_nicknames text[] NOT NULL DEFAULT '{}',
  position text NOT NULL,
  college text,
  draft_year integer,
  draft_round integer,
  teams jsonb NOT NULL DEFAULT '[]',
  career_stats_summary text,
  awards text[] NOT NULL DEFAULT '{}',
  hall_of_fame boolean NOT NULL DEFAULT false,
  hof_year integer,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nfl_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read nfl players" ON public.nfl_players
  FOR SELECT TO public USING (true);

CREATE INDEX idx_nfl_players_position ON public.nfl_players(position);
CREATE INDEX idx_nfl_players_hof ON public.nfl_players(hall_of_fame) WHERE hall_of_fame = true;
CREATE INDEX idx_nfl_players_active ON public.nfl_players(is_active) WHERE is_active = true;
