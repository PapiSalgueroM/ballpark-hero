-- soccer_grid_puzzles table
-- Stores daily Soccer Grid puzzle definitions (rows/cols as JSONB).
-- rows_json and cols_json are always read whole — JSONB avoids a child table and JOIN.
-- sort_order preserves the original puzzle sequence; dateSeed % pool.length uses it
-- to pick the correct puzzle as the pool grows beyond the initial 15 in Round 4+.

CREATE TABLE public.soccer_grid_puzzles (
  id          UUID                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  puzzle_id   TEXT                     NOT NULL UNIQUE,
  rows_json   JSONB                    NOT NULL,
  cols_json   JSONB                    NOT NULL,
  sort_order  SMALLINT                 NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.soccer_grid_puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read soccer grid puzzles"
  ON public.soccer_grid_puzzles FOR SELECT
  TO public USING (true);

CREATE INDEX soccer_grid_puzzles_puzzle_id_idx  ON public.soccer_grid_puzzles (puzzle_id);
CREATE INDEX soccer_grid_puzzles_sort_order_idx ON public.soccer_grid_puzzles (sort_order);

-- Seed: 15 puzzles (sg-001 through sg-015), sort_order 0–14.
-- rows_json and cols_json: JSON arrays of {label, type} objects matching SoccerGridAttribute.
INSERT INTO public.soccer_grid_puzzles (puzzle_id, rows_json, cols_json, sort_order) VALUES
  (
    'sg-001',
    '[{"label":"Played for Barcelona","type":"club"},{"label":"Played for Real Madrid","type":"club"},{"label":"Played for Manchester United","type":"club"}]',
    '[{"label":"Forward (FWD)","type":"position"},{"label":"Champions League Winner","type":"champions_league"},{"label":"World Cup Winner","type":"world_cup"}]',
    0
  ),
  (
    'sg-002',
    '[{"label":"Played for Chelsea","type":"club"},{"label":"Played for AC Milan","type":"club"},{"label":"Played for Bayern Munich","type":"club"}]',
    '[{"label":"Midfielder (MID)","type":"position"},{"label":"Played in Premier League","type":"league"},{"label":"Golden Boot Winner","type":"award"}]',
    1
  ),
  (
    'sg-003',
    '[{"label":"Played for Liverpool","type":"club"},{"label":"Played for Juventus","type":"club"},{"label":"Played for PSG","type":"club"}]',
    '[{"label":"Defender (DEF)","type":"position"},{"label":"Played in La Liga","type":"league"},{"label":"Over 100 International Caps","type":"misc"}]',
    2
  ),
  (
    'sg-004',
    '[{"label":"Played for Arsenal","type":"club"},{"label":"Played for Inter Milan","type":"club"},{"label":"Played for Manchester City","type":"club"}]',
    '[{"label":"Forward (FWD)","type":"position"},{"label":"Played in Serie A","type":"league"},{"label":"Champions League Winner","type":"champions_league"}]',
    3
  ),
  (
    'sg-005',
    '[{"label":"Played for Atletico Madrid","type":"club"},{"label":"Played for Borussia Dortmund","type":"club"},{"label":"Played for Tottenham","type":"club"}]',
    '[{"label":"Goalkeeper (GK)","type":"position"},{"label":"World Cup Winner","type":"world_cup"},{"label":"Played in Bundesliga","type":"league"}]',
    4
  ),
  (
    'sg-006',
    '[{"label":"Brazilian","type":"nationality"},{"label":"French","type":"nationality"},{"label":"Argentine","type":"nationality"}]',
    '[{"label":"Played for Real Madrid","type":"club"},{"label":"Champions League Winner","type":"champions_league"},{"label":"Played in Ligue 1","type":"league"}]',
    5
  ),
  (
    'sg-007',
    '[{"label":"Played for Roma","type":"club"},{"label":"Played for Napoli","type":"club"},{"label":"Played for AC Milan","type":"club"}]',
    '[{"label":"Forward (FWD)","type":"position"},{"label":"Played in Serie A","type":"league"},{"label":"Over 100 International Caps","type":"misc"}]',
    6
  ),
  (
    'sg-008',
    '[{"label":"Played for Barcelona","type":"club"},{"label":"Played for Chelsea","type":"club"},{"label":"Played for Bayern Munich","type":"club"}]',
    '[{"label":"Midfielder (MID)","type":"position"},{"label":"World Cup Winner","type":"world_cup"},{"label":"Played in Premier League","type":"league"}]',
    7
  ),
  (
    'sg-009',
    '[{"label":"German","type":"nationality"},{"label":"Spanish","type":"nationality"},{"label":"Italian","type":"nationality"}]',
    '[{"label":"Defender (DEF)","type":"position"},{"label":"Champions League Winner","type":"champions_league"},{"label":"World Cup Winner","type":"world_cup"}]',
    8
  ),
  (
    'sg-010',
    '[{"label":"Played for Manchester City","type":"club"},{"label":"Played for Liverpool","type":"club"},{"label":"Played for Real Madrid","type":"club"}]',
    '[{"label":"Forward (FWD)","type":"position"},{"label":"Played in La Liga","type":"league"},{"label":"Golden Boot Winner","type":"award"}]',
    9
  ),
  (
    'sg-011',
    '[{"label":"Played for PSG","type":"club"},{"label":"Played for Juventus","type":"club"},{"label":"Played for Arsenal","type":"club"}]',
    '[{"label":"Midfielder (MID)","type":"position"},{"label":"Played in Ligue 1","type":"league"},{"label":"Over 100 International Caps","type":"misc"}]',
    10
  ),
  (
    'sg-012',
    '[{"label":"Played for Tottenham","type":"club"},{"label":"Played for Inter Milan","type":"club"},{"label":"Played for Borussia Dortmund","type":"club"}]',
    '[{"label":"Goalkeeper (GK)","type":"position"},{"label":"Champions League Winner","type":"champions_league"},{"label":"Played in Bundesliga","type":"league"}]',
    11
  ),
  (
    'sg-013',
    '[{"label":"Portuguese","type":"nationality"},{"label":"Dutch","type":"nationality"},{"label":"English","type":"nationality"}]',
    '[{"label":"Forward (FWD)","type":"position"},{"label":"Played in Premier League","type":"league"},{"label":"Champions League Winner","type":"champions_league"}]',
    12
  ),
  (
    'sg-014',
    '[{"label":"Played for Barcelona","type":"club"},{"label":"Played for Manchester United","type":"club"},{"label":"Played for AC Milan","type":"club"}]',
    '[{"label":"Defender (DEF)","type":"position"},{"label":"World Cup Winner","type":"world_cup"},{"label":"Played in Serie A","type":"league"}]',
    13
  ),
  (
    'sg-015',
    '[{"label":"Played for Real Madrid","type":"club"},{"label":"Played for Chelsea","type":"club"},{"label":"Played for Liverpool","type":"club"}]',
    '[{"label":"Played in MLS","type":"misc"},{"label":"Champions League Winner","type":"champions_league"},{"label":"Over 100 International Caps","type":"misc"}]',
    14
  );
