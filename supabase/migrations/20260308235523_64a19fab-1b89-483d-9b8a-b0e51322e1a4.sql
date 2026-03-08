-- Update INSERT policies with data validation instead of just (true)

-- college_guess_scores: validate score 0-1200, clues_used 1-12
DROP POLICY IF EXISTS "Anyone can insert college guess scores" ON public.college_guess_scores;
CREATE POLICY "Anyone can insert college guess scores"
ON public.college_guess_scores
FOR INSERT
WITH CHECK (
  score >= 0 AND score <= 1200 AND
  clues_used >= 1 AND clues_used <= 12 AND
  mode IN ('daily', 'unlimited', 'conference')
);

-- medal_games_scores: validate score 0-1200, clues_used 1-12
DROP POLICY IF EXISTS "Anyone can insert medal game scores" ON public.medal_games_scores;
CREATE POLICY "Anyone can insert medal game scores"
ON public.medal_games_scores
FOR INSERT
WITH CHECK (
  score >= 0 AND score <= 1200 AND
  clues_used >= 1 AND clues_used <= 12
);

-- football_grid_selections: validate cell_index 0-8
DROP POLICY IF EXISTS "Anyone can insert grid selections" ON public.football_grid_selections;
CREATE POLICY "Anyone can insert grid selections"
ON public.football_grid_selections
FOR INSERT
WITH CHECK (
  cell_index >= 0 AND cell_index <= 8 AND
  length(player_name) > 0 AND length(player_name) <= 100 AND
  length(puzzle_id) > 0 AND length(puzzle_id) <= 50
);

-- college_grid_selections: validate cell_index 0-8
DROP POLICY IF EXISTS "Anyone can insert college grid selections" ON public.college_grid_selections;
CREATE POLICY "Anyone can insert college grid selections"
ON public.college_grid_selections
FOR INSERT
WITH CHECK (
  cell_index >= 0 AND cell_index <= 8 AND
  length(player_name) > 0 AND length(player_name) <= 100 AND
  length(puzzle_id) > 0 AND length(puzzle_id) <= 50
);

-- question_reports: add validation
DROP POLICY IF EXISTS "Anyone can insert reports" ON public.question_reports;
CREATE POLICY "Anyone can insert reports"
ON public.question_reports
FOR INSERT
WITH CHECK (
  length(description) > 0 AND length(description) <= 2000 AND
  length(game_type) > 0 AND length(game_type) <= 50
);