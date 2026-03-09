-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_played_date DATE,
  total_games_played INTEGER NOT NULL DEFAULT 0,
  total_correct_answers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_game_scores table for tracking all game scores
CREATE TABLE public.user_game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  puzzle_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Create user_best_scores table for tracking personal bests per game
CREATE TABLE public.user_best_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  best_score INTEGER NOT NULL DEFAULT 0,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_type)
);

-- Create indexes for performance
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_current_streak ON public.profiles(current_streak DESC);
CREATE INDEX idx_user_game_scores_user_id ON public.user_game_scores(user_id);
CREATE INDEX idx_user_game_scores_played_at ON public.user_game_scores(played_at DESC);
CREATE INDEX idx_user_game_scores_game_type ON public.user_game_scores(game_type);
CREATE INDEX idx_user_game_scores_puzzle_date ON public.user_game_scores(puzzle_date);
CREATE INDEX idx_user_best_scores_user_id ON public.user_best_scores(user_id);
CREATE INDEX idx_user_best_scores_game_type_score ON public.user_best_scores(game_type, best_score DESC);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_best_scores ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public profiles are viewable by username"
ON public.profiles FOR SELECT
USING (username IS NOT NULL);

CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- User game scores policies
CREATE POLICY "Users can view their own scores"
ON public.user_game_scores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores"
ON public.user_game_scores FOR INSERT
WITH CHECK (auth.uid() = user_id AND score >= 0 AND score <= 100000 AND length(game_type) > 0 AND length(game_type) <= 50);

CREATE POLICY "Public can view scores for leaderboard"
ON public.user_game_scores FOR SELECT
USING (true);

CREATE POLICY "Admins can read all scores"
ON public.user_game_scores FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- User best scores policies
CREATE POLICY "Users can view their own best scores"
ON public.user_best_scores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own best scores"
ON public.user_best_scores FOR INSERT
WITH CHECK (auth.uid() = user_id AND best_score >= 0 AND length(game_type) > 0 AND length(game_type) <= 50);

CREATE POLICY "Users can update their own best scores"
ON public.user_best_scores FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Public can view best scores for leaderboard"
ON public.user_best_scores FOR SELECT
USING (true);

CREATE POLICY "Admins can read all best scores"
ON public.user_best_scores FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update profile timestamps
CREATE OR REPLACE FUNCTION public.update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profile timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_updated_at();