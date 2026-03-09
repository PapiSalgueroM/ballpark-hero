
CREATE TABLE public.daily_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  streak_days integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own badges"
  ON public.daily_badges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND streak_days >= 1 AND streak_days <= 10000);

CREATE POLICY "Users can view their own badges"
  ON public.daily_badges FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own badges"
  ON public.daily_badges FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
