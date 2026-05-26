-- Migration: career_players + career_seasons tables
-- Apply this file FIRST, then 20260525000003_career_seed.sql

-- ============================================================
-- career_players
-- ============================================================
CREATE TABLE public.career_players (
  id          UUID                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT                     NOT NULL UNIQUE,
  nationality TEXT                     NOT NULL,
  position    TEXT                     NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read career players"
  ON public.career_players FOR SELECT
  TO public USING (true);

CREATE INDEX career_players_name_idx ON public.career_players (player_name);

-- ============================================================
-- career_seasons
-- sort_order = 0-indexed position in original career[] array.
-- Required because some players have two rows for the same
-- season string (e.g. January transfer mid-season), so
-- ORDER BY season alone cannot break the tie correctly.
-- ============================================================
CREATE TABLE public.career_seasons (
  id           UUID     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id    UUID     NOT NULL REFERENCES public.career_players(id) ON DELETE CASCADE,
  season       TEXT     NOT NULL,
  club         TEXT     NOT NULL,
  goals        INTEGER  NOT NULL DEFAULT 0,
  assists      INTEGER  NOT NULL DEFAULT 0,
  appearances  INTEGER  NOT NULL DEFAULT 0,
  market_value INTEGER  NOT NULL DEFAULT 0,
  sort_order   SMALLINT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read career seasons"
  ON public.career_seasons FOR SELECT
  TO public USING (true);

CREATE INDEX career_seasons_player_id_idx   ON public.career_seasons (player_id);
CREATE INDEX career_seasons_sort_order_idx  ON public.career_seasons (player_id, sort_order);
