
CREATE TABLE public.soccer_grid_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_id text NOT NULL,
  cell_index integer NOT NULL,
  player_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.soccer_grid_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert soccer grid selections"
  ON public.soccer_grid_selections FOR INSERT
  WITH CHECK (
    cell_index >= 0 AND cell_index <= 8
    AND length(player_name) > 0 AND length(player_name) <= 100
    AND length(puzzle_id) > 0 AND length(puzzle_id) <= 50
  );

CREATE POLICY "Admins can read soccer grid selections"
  ON public.soccer_grid_selections FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
