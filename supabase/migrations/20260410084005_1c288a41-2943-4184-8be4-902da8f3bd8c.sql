
CREATE TABLE public.hof_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  vote TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hof_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert hof votes"
ON public.hof_votes
FOR INSERT
TO public
WITH CHECK (
  length(player_id) > 0 AND length(player_id) <= 100
  AND vote IN ('hof', 'bust')
);

CREATE POLICY "Anyone can read hof votes"
ON public.hof_votes
FOR SELECT
TO public
USING (true);
