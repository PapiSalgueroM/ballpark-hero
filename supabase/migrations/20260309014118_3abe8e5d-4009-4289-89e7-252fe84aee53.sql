
CREATE TABLE public.guess_nation_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_name text NOT NULL UNIQUE,
  common_names text[] NOT NULL DEFAULT '{}',
  flag_emoji text NOT NULL DEFAULT '',
  continent text NOT NULL,
  difficulty text NOT NULL DEFAULT 'easy',
  season_focus text NOT NULL DEFAULT 'both',
  vibe_word text NOT NULL,
  continent_hint text NOT NULL,
  population_hint text NOT NULL,
  games_attended_hint text NOT NULL,
  total_medals_hint text NOT NULL,
  best_sport_hint text NOT NULL,
  famous_moment_hint text NOT NULL,
  winter_history_hint text NOT NULL,
  gold_medal_hint text NOT NULL,
  flag_colors_hint text NOT NULL,
  country_size_hint text NOT NULL,
  iconic_moment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guess_nation_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read nation countries"
ON public.guess_nation_countries FOR SELECT
TO anon, authenticated
USING (true);

CREATE TABLE public.guess_nation_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date date NOT NULL UNIQUE,
  country_id uuid NOT NULL REFERENCES public.guess_nation_countries(id),
  difficulty text NOT NULL DEFAULT 'easy',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guess_nation_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily nation"
ON public.guess_nation_daily FOR SELECT
TO anon, authenticated
USING (true);

CREATE TABLE public.guess_nation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date date NOT NULL,
  clues_used integer NOT NULL,
  score integer NOT NULL,
  guessed boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'daily',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guess_nation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert nation scores"
ON public.guess_nation_scores FOR INSERT
TO anon, authenticated
WITH CHECK (
  score >= 0 AND score <= 1200
  AND clues_used >= 1 AND clues_used <= 12
  AND mode IN ('daily', 'unlimited', 'continent', 'summer', 'winter')
);

CREATE POLICY "Admins can read nation scores"
ON public.guess_nation_scores FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));
