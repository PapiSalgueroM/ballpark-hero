-- Fix RLS policies for college_guess_scores
-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can read college guess scores" ON public.college_guess_scores;

-- Create admin-only SELECT policy
CREATE POLICY "Admins can read college guess scores"
ON public.college_guess_scores
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Fix RLS policies for medal_games_scores
DROP POLICY IF EXISTS "Anyone can read medal game scores" ON public.medal_games_scores;

CREATE POLICY "Admins can read medal game scores"
ON public.medal_games_scores
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Fix RLS policies for football_grid_selections
DROP POLICY IF EXISTS "Anyone can read grid selections" ON public.football_grid_selections;

CREATE POLICY "Admins can read grid selections"
ON public.football_grid_selections
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Fix RLS policies for college_grid_selections
DROP POLICY IF EXISTS "Anyone can read college grid selections" ON public.college_grid_selections;

CREATE POLICY "Admins can read college grid selections"
ON public.college_grid_selections
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));