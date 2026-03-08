
CREATE TABLE public.football_grid_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_id text NOT NULL,
  cell_index int NOT NULL CHECK (cell_index >= 0 AND cell_index <= 8),
  player_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.football_grid_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert grid selections"
ON public.football_grid_selections
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can read grid selections"
ON public.football_grid_selections
FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX idx_grid_selections_puzzle_cell ON public.football_grid_selections (puzzle_id, cell_index);
CREATE INDEX idx_grid_selections_player ON public.football_grid_selections (puzzle_id, cell_index, player_name);
