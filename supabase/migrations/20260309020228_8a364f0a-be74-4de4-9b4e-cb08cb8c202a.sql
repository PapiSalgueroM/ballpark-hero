
-- CBB programs table
CREATE TABLE public.cbb_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  common_names text[] NOT NULL DEFAULT '{}',
  vibe_word text NOT NULL,
  region_hint text NOT NULL,
  conference_hint text NOT NULL,
  tournament_hint text NOT NULL,
  championships_hint text NOT NULL,
  mascot_hint text NOT NULL,
  difficulty text NOT NULL DEFAULT 'easy',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cbb_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cbb programs"
  ON public.cbb_programs FOR SELECT
  USING (true);

-- Daily puzzle table
CREATE TABLE public.cbb_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date date NOT NULL UNIQUE,
  program_id uuid NOT NULL REFERENCES public.cbb_programs(id),
  difficulty text NOT NULL DEFAULT 'easy',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cbb_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cbb daily"
  ON public.cbb_daily FOR SELECT
  USING (true);

-- Scores table
CREATE TABLE public.cbb_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date date NOT NULL,
  clues_used integer NOT NULL,
  score integer NOT NULL,
  guessed boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'daily',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cbb_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert cbb scores"
  ON public.cbb_scores FOR INSERT
  WITH CHECK (
    score >= 0 AND score <= 1000
    AND clues_used >= 1 AND clues_used <= 6
    AND mode IN ('daily', 'unlimited')
  );

CREATE POLICY "Admins can read cbb scores"
  ON public.cbb_scores FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
