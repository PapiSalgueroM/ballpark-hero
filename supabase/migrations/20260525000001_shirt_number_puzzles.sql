-- ============================================================
-- shirt_number_puzzles: curated puzzle list for the Shirt
-- Number game. Public read-only. No client writes.
-- Seed data: 32 puzzles migrated from src/data/shirtNumberPuzzles.ts
-- ============================================================

CREATE TABLE public.shirt_number_puzzles (
  id          UUID                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT                     NOT NULL,
  club        TEXT                     NOT NULL,
  league      TEXT                     NOT NULL,
  nationality TEXT                     NOT NULL,  -- flag emoji string, e.g. '🇦🇷'
  kit_number  SMALLINT                 NOT NULL CHECK (kit_number >= 1 AND kit_number <= 99),
  fun_fact    TEXT                     NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shirt_number_puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shirt number puzzles"
  ON public.shirt_number_puzzles FOR SELECT
  TO public USING (true);

-- ============================================================
-- Seed: 32 puzzles (original hardcoded set)
-- ============================================================

INSERT INTO public.shirt_number_puzzles (player_name, club, league, nationality, kit_number, fun_fact) VALUES
  ('Lionel Messi',           'Inter Miami',        'MLS',               '🇦🇷', 10, 'The iconic #10 — worn by Maradona, Pelé, and the GOAT himself.'),
  ('Cristiano Ronaldo',      'Al Nassr',           'Saudi Pro League',  '🇵🇹',  7, 'CR7 — the brand built around a shirt number.'),
  ('Erling Haaland',         'Manchester City',    'Premier League',    '🇳🇴',  9, 'The classic centre-forward number for a goal machine.'),
  ('Kylian Mbappé',          'Real Madrid',        'La Liga',           '🇫🇷',  9, 'Took #9 at Madrid — the number once worn by Ronaldo Nazário.'),
  ('Vinicius Jr.',           'Real Madrid',        'La Liga',           '🇧🇷',  7, 'Inherited the legendary #7 at the Bernabéu from Cristiano Ronaldo.'),
  ('Jude Bellingham',        'Real Madrid',        'La Liga',           '🏴󠁧󠁢󠁥󠁮󠁧󠁿',  5, 'Chose #5 in honour of Zinedine Zidane at Real Madrid.'),
  ('Mohamed Salah',          'Liverpool',          'Premier League',    '🇪🇬', 11, 'The Egyptian King has made #11 iconic at Anfield.'),
  ('Kevin De Bruyne',        'Manchester City',    'Premier League',    '🇧🇪', 17, 'An unusual number for a star midfielder — KDB made it his own.'),
  ('Bukayo Saka',            'Arsenal',            'Premier League',    '🏴󠁧󠁢󠁥󠁮󠁧󠁿',  7, 'Took the legendary #7 shirt at Arsenal aged just 21.'),
  ('Lamine Yamal',           'Barcelona',          'La Liga',           '🇪🇸', 19, 'The teenage wonderkid burst onto the scene wearing #19.'),
  ('Pedri',                  'Barcelona',          'La Liga',           '🇪🇸',  8, 'Wears the #8 previously held by Barça legend Andrés Iniesta.'),
  ('Gavi',                   'Barcelona',          'La Liga',           '🇪🇸',  6, '#6 — the number of Xavi Hernández, a fitting successor.'),
  ('Virgil van Dijk',        'Liverpool',          'Premier League',    '🇳🇱',  4, 'The commanding #4 — a classic centre-back number.'),
  ('Rodri',                  'Manchester City',    'Premier League',    '🇪🇸', 16, 'The 2024 Ballon d''Or winner rocks #16 in midfield.'),
  ('Phil Foden',             'Manchester City',    'Premier League',    '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 47, '#47 — kept his academy number as a tribute to his roots.'),
  ('Declan Rice',            'Arsenal',            'Premier League',    '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 41, 'Chose #41 at Arsenal — his childhood house number.'),
  ('Martin Ødegaard',        'Arsenal',            'Premier League',    '🇳🇴',  8, 'The Arsenal captain wears the classic #8 playmaker shirt.'),
  ('Robert Lewandowski',     'Barcelona',          'La Liga',           '🇵🇱',  9, 'The prolific #9 — carried this number across Bayern and Barça.'),
  ('Neymar Jr.',             'Santos',             'Brazilian Série A', '🇧🇷', 10, 'Back to where it all started, wearing the famous #10.'),
  ('Son Heung-min',          'Tottenham',          'Premier League',    '🇰🇷',  7, 'The Spurs talisman proudly wears the captain''s #7.'),
  ('Bruno Fernandes',        'Manchester United',  'Premier League',    '🇵🇹',  8, 'Switched from #18 to the iconic #8 at Old Trafford.'),
  ('Thibaut Courtois',       'Real Madrid',        'La Liga',           '🇧🇪',  1, 'The #1 goalkeeper — the ultimate number for a shot-stopper.'),
  ('Alisson Becker',         'Liverpool',          'Premier League',    '🇧🇷',  1, '#1 for the best goalkeeper in the Premier League.'),
  ('Florian Wirtz',          'Bayer Leverkusen',   'Bundesliga',        '🇩🇪', 10, 'Germany''s next great #10 — leading the charge at Leverkusen.'),
  ('Jamal Musiala',          'Bayern Munich',      'Bundesliga',        '🇩🇪', 42, 'Kept his academy #42 — the answer to everything, apparently.'),
  ('Cole Palmer',            'Chelsea',            'Premier League',    '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 20, 'Cold Palmer wears #20 at Stamford Bridge.'),
  ('Dani Olmo',              'Barcelona',          'La Liga',           '🇪🇸', 20, 'Euro 2024 Golden Ball winner wearing #20 at Camp Nou.'),
  ('William Saliba',         'Arsenal',            'Premier League',    '🇫🇷',  2, '#2 — an unusual pick for a centre-back, but Saliba owns it.'),
  ('Trent Alexander-Arnold', 'Liverpool',          'Premier League',    '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 66, '#66 — kept his academy number and made it world-famous.'),
  ('Federico Valverde',      'Real Madrid',        'La Liga',           '🇺🇾',  8, 'The engine of Madrid''s midfield in the classic #8.'),
  ('Khvicha Kvaratskhelia',  'PSG',                'Ligue 1',           '🇬🇪',  7, 'Kvara took the prestigious #7 at Paris Saint-Germain.'),
  ('Alejandro Garnacho',     'Manchester United',  'Premier League',    '🇦🇷', 17, '#17 — following in the footsteps of Nani at Old Trafford.');
