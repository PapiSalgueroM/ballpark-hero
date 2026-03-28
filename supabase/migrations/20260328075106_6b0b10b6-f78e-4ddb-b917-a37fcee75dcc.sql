
CREATE TABLE public.soccer_careers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  player_name text NOT NULL,
  nationality text NOT NULL,
  position text NOT NULL,
  starting_era text NOT NULL,
  age integer NOT NULL DEFAULT 16,
  current_club text DEFAULT 'Youth Academy',
  pace integer NOT NULL DEFAULT 50,
  shooting integer NOT NULL DEFAULT 50,
  passing integer NOT NULL DEFAULT 50,
  dribbling integer NOT NULL DEFAULT 50,
  defending integer NOT NULL DEFAULT 50,
  physical integer NOT NULL DEFAULT 50,
  reflexes integer NOT NULL DEFAULT 50,
  overall_rating integer NOT NULL DEFAULT 50,
  season_year integer NOT NULL,
  career_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.soccer_careers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own careers" ON public.soccer_careers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own careers" ON public.soccer_careers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own careers" ON public.soccer_careers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own careers" ON public.soccer_careers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
