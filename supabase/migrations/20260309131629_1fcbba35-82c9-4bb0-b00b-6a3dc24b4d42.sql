
CREATE TABLE public.user_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  games_played_today integer NOT NULL DEFAULT 0,
  last_played_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

-- Users can view their own scores
CREATE POLICY "Users can view their own scores"
ON public.user_scores FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Public can view all scores for leaderboard
CREATE POLICY "Public can view scores for leaderboard"
ON public.user_scores FOR SELECT
TO public
USING (true);

-- Users can insert their own scores
CREATE POLICY "Users can insert their own scores"
ON public.user_scores FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scores
CREATE POLICY "Users can update their own scores"
ON public.user_scores FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for user_scores
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_scores;
