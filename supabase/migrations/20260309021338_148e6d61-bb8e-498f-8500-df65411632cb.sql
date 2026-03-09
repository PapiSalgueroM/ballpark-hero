
-- Tennis players table
CREATE TABLE public.tennis_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  common_names text[] NOT NULL DEFAULT '{}',
  vibe_word text NOT NULL,
  nationality_era_hint text NOT NULL,
  tour_hint text NOT NULL,
  slam_count_hint text NOT NULL,
  slam_detail_hint text NOT NULL,
  famous_moment_hint text NOT NULL,
  difficulty text NOT NULL DEFAULT 'easy',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tennis_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tennis players" ON public.tennis_players FOR SELECT USING (true);

-- Tennis daily table
CREATE TABLE public.tennis_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date date NOT NULL UNIQUE,
  player_id uuid NOT NULL REFERENCES public.tennis_players(id),
  difficulty text NOT NULL DEFAULT 'easy',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tennis_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tennis daily" ON public.tennis_daily FOR SELECT USING (true);

-- Tennis scores table
CREATE TABLE public.tennis_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date date NOT NULL,
  clues_used integer NOT NULL,
  score integer NOT NULL,
  guessed boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'daily',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tennis_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert tennis scores" ON public.tennis_scores FOR INSERT WITH CHECK (
  score >= 0 AND score <= 1000 AND clues_used >= 1 AND clues_used <= 6 AND mode IN ('daily', 'unlimited')
);

CREATE POLICY "Admins can read tennis scores" ON public.tennis_scores FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Seed 40 tennis players
INSERT INTO public.tennis_players (player_name, common_names, vibe_word, nationality_era_hint, tour_hint, slam_count_hint, slam_detail_hint, famous_moment_hint) VALUES
('Roger Federer', ARRAY['Federer', 'Fed', 'RF'], 'Elegant', 'Swiss player who dominated from the early 2000s to the 2020s', 'Competed on the ATP Tour', 'Won 20 Grand Slams', 'Won Wimbledon 8 times, the Australian Open 6 times, the US Open 5 times, and the French Open once', 'Known for an iconic rivalry with two other greats that defined modern tennis'),
('Rafael Nadal', ARRAY['Nadal', 'Rafa'], 'Relentless', 'Spanish player who dominated from the mid-2000s onwards', 'Competed on the ATP Tour', 'Won 22 Grand Slams', 'Won the French Open a record 14 times, the US Open 4 times, the Australian Open 2 times, and Wimbledon 2 times', 'Considered the greatest clay court player of all time'),
('Novak Djokovic', ARRAY['Djokovic', 'Nole', 'Djoker'], 'Dominant', 'Serbian player who peaked from the 2010s onward', 'Competed on the ATP Tour', 'Won 24 Grand Slams', 'Won the Australian Open 10 times, Wimbledon 7 times, the US Open 4 times, and the French Open 3 times', 'Holds the record for most weeks at world No. 1'),
('Serena Williams', ARRAY['Serena', 'S. Williams'], 'Fierce', 'American player who dominated from the late 1990s to the 2020s', 'Competed on the WTA Tour', 'Won 23 Grand Slams', 'Won the Australian Open 7 times, Wimbledon 7 times, the US Open 6 times, and the French Open 3 times', 'Widely regarded as the greatest female tennis player ever'),
('Venus Williams', ARRAY['Venus', 'V. Williams'], 'Pioneer', 'American player who rose to prominence in the late 1990s', 'Competed on the WTA Tour', 'Won 7 Grand Slams', 'Won Wimbledon 5 times and the US Open 2 times', 'Known for paving the way alongside her sister and changing the sport'),
('Pete Sampras', ARRAY['Sampras'], 'Clinical', 'American player who dominated the 1990s', 'Competed on the ATP Tour', 'Won 14 Grand Slams', 'Won Wimbledon 7 times, the US Open 5 times, and the Australian Open 2 times', 'Held the Grand Slam record for nearly a decade before it was broken'),
('Andre Agassi', ARRAY['Agassi'], 'Showman', 'American player who peaked in the 1990s and early 2000s', 'Competed on the ATP Tour', 'Won 8 Grand Slams', 'Won the Australian Open 4 times, the US Open 2 times, the French Open once, and Wimbledon once', 'One of only two male players to achieve a Career Golden Slam'),
('Steffi Graf', ARRAY['Graf'], 'Supreme', 'German player who dominated the late 1980s and 1990s', 'Competed on the WTA Tour', 'Won 22 Grand Slams', 'Won the French Open 6 times, Wimbledon 7 times, the US Open 5 times, and the Australian Open 4 times', 'The only player to achieve the Calendar Year Golden Slam'),
('Bjorn Borg', ARRAY['Borg'], 'Cool', 'Swedish player who dominated the late 1970s and early 1980s', 'Competed on the ATP Tour', 'Won 11 Grand Slams', 'Won the French Open 6 times and Wimbledon 5 times', 'Famous for retiring at just 26 years old at the peak of his career'),
('John McEnroe', ARRAY['McEnroe', 'Mac'], 'Volatile', 'American player who peaked in the late 1970s and 1980s', 'Competed on the ATP Tour', 'Won 7 Grand Slams', 'Won the US Open 4 times and Wimbledon 3 times', 'Known for fiery on-court outbursts and the famous phrase directed at umpires'),
('Martina Navratilova', ARRAY['Navratilova'], 'Tenacious', 'Czech-American player who dominated from the late 1970s to the 1990s', 'Competed on the WTA Tour', 'Won 18 Grand Slams', 'Won Wimbledon 9 times, the US Open 4 times, the Australian Open 3 times, and the French Open 2 times', 'Holds the record for most Wimbledon singles titles'),
('Chris Evert', ARRAY['Evert', 'Chrissie'], 'Poised', 'American player who dominated the 1970s and 1980s', 'Competed on the WTA Tour', 'Won 18 Grand Slams', 'Won the French Open 7 times, the US Open 6 times, the Australian Open 2 times, and Wimbledon 3 times', 'Had a legendary rivalry with another all-time great that elevated the sport'),
('Jimmy Connors', ARRAY['Connors', 'Jimbo'], 'Gritty', 'American player who peaked in the 1970s and 1980s', 'Competed on the ATP Tour', 'Won 8 Grand Slams', 'Won the US Open 5 times, Wimbledon 2 times, and the Australian Open once', 'Known for a legendary run at the US Open at age 39'),
('Boris Becker', ARRAY['Becker'], 'Fearless', 'German player who peaked in the mid-1980s to 1990s', 'Competed on the ATP Tour', 'Won 6 Grand Slams', 'Won Wimbledon 3 times, the US Open once, and the Australian Open 2 times', 'Became the youngest ever Wimbledon champion at age 17'),
('Monica Seles', ARRAY['Seles'], 'Explosive', 'Yugoslav-American player who peaked in the early 1990s', 'Competed on the WTA Tour', 'Won 9 Grand Slams', 'Won the Australian Open 4 times, the French Open 3 times, and the US Open 2 times', 'Career was tragically interrupted by an on-court stabbing incident'),
('Andy Murray', ARRAY['Murray'], 'Resilient', 'British player who peaked in the 2010s', 'Competed on the ATP Tour', 'Won 3 Grand Slams', 'Won Wimbledon 2 times and the US Open once', 'Became the first British man to win Wimbledon in 77 years'),
('Billie Jean King', ARRAY['BJK', 'King'], 'Revolutionary', 'American player who peaked in the late 1960s and 1970s', 'Competed on the WTA Tour', 'Won 12 Grand Slams', 'Won Wimbledon 6 times, the US Open 4 times, the Australian Open once, and the French Open once', 'Famous for winning the Battle of the Sexes exhibition match'),
('Arthur Ashe', ARRAY['Ashe'], 'Dignified', 'American player who peaked in the 1970s', 'Competed on the ATP Tour', 'Won 3 Grand Slams', 'Won the Australian Open once, Wimbledon once, and the US Open once', 'The first Black man to win a Grand Slam singles title and a civil rights icon'),
('Maria Sharapova', ARRAY['Sharapova'], 'Fierce', 'Russian player who peaked in the 2000s and 2010s', 'Competed on the WTA Tour', 'Won 5 Grand Slams', 'Won the French Open 2 times, the Australian Open once, Wimbledon once, and the US Open once', 'One of a select few to achieve the Career Grand Slam in women''s tennis'),
('Naomi Osaka', ARRAY['Osaka'], 'Fearless', 'Japanese player who rose to prominence in the late 2010s', 'Competed on the WTA Tour', 'Won 4 Grand Slams', 'Won the US Open 2 times and the Australian Open 2 times', 'Became an icon for mental health advocacy in professional sports'),
('Carlos Alcaraz', ARRAY['Alcaraz', 'Carlitos'], 'Electric', 'Spanish player who burst onto the scene in the early 2020s', 'Competed on the ATP Tour', 'Won 4 Grand Slams', 'Won Wimbledon 2 times, the French Open once, and the US Open once', 'Became the youngest world No. 1 in ATP history'),
('Jannik Sinner', ARRAY['Sinner'], 'Relentless', 'Italian player who rose to the top in the mid-2020s', 'Competed on the ATP Tour', 'Won 3 Grand Slams', 'Won the Australian Open 2 times and the US Open once', 'Became the first Italian man to reach world No. 1'),
('Iga Swiatek', ARRAY['Swiatek'], 'Dominant', 'Polish player who dominated from the early 2020s', 'Competed on the WTA Tour', 'Won 5 Grand Slams', 'Won the French Open 4 times and the US Open once', 'Known for an extraordinary winning streak on clay courts'),
('Stan Wawrinka', ARRAY['Wawrinka', 'Stan the Man'], 'Clutch', 'Swiss player who peaked in the mid-2010s', 'Competed on the ATP Tour', 'Won 3 Grand Slams', 'Won the Australian Open once, the French Open once, and the US Open once', 'Known for producing his best tennis in Grand Slam finals against top rivals'),
('Mats Wilander', ARRAY['Wilander'], 'Versatile', 'Swedish player who peaked in the 1980s', 'Competed on the ATP Tour', 'Won 7 Grand Slams', 'Won the Australian Open 3 times, the French Open 3 times, and the US Open once', 'Won three Grand Slams in a single calendar year'),
('Ivan Lendl', ARRAY['Lendl'], 'Methodical', 'Czech-American player who dominated the mid-1980s', 'Competed on the ATP Tour', 'Won 8 Grand Slams', 'Won the French Open 3 times, the Australian Open 2 times, and the US Open 3 times', 'Appeared in 8 consecutive US Open finals'),
('Justine Henin', ARRAY['Henin'], 'Warrior', 'Belgian player who peaked in the 2000s', 'Competed on the WTA Tour', 'Won 7 Grand Slams', 'Won the French Open 4 times, the US Open 2 times, and the Australian Open once', 'Known for a brilliant one-handed backhand rare in women''s tennis'),
('Kim Clijsters', ARRAY['Clijsters'], 'Joyful', 'Belgian player who peaked in the 2000s and 2010s', 'Competed on the WTA Tour', 'Won 4 Grand Slams', 'Won the US Open 3 times and the Australian Open once', 'Made a remarkable comeback from retirement to win more Grand Slams'),
('Lleyton Hewitt', ARRAY['Hewitt'], 'Fighter', 'Australian player who peaked in the early 2000s', 'Competed on the ATP Tour', 'Won 2 Grand Slams', 'Won the US Open once and Wimbledon once', 'Became the youngest year-end No. 1 in ATP history at age 20'),
('Gustavo Kuerten', ARRAY['Kuerten', 'Guga'], 'Charismatic', 'Brazilian player who peaked in the late 1990s and early 2000s', 'Competed on the ATP Tour', 'Won 3 Grand Slams', 'Won the French Open 3 times', 'Famous for drawing a heart on the clay after winning a title'),
('Jim Courier', ARRAY['Courier'], 'Powerful', 'American player who peaked in the early 1990s', 'Competed on the ATP Tour', 'Won 4 Grand Slams', 'Won the French Open 2 times and the Australian Open 2 times', 'Reached No. 1 through sheer power and aggressive baseline play'),
('Lindsay Davenport', ARRAY['Davenport'], 'Powerful', 'American player who peaked in the late 1990s and 2000s', 'Competed on the WTA Tour', 'Won 3 Grand Slams', 'Won the US Open once, Wimbledon once, and the Australian Open once', 'Known for overpowering opponents with her size and groundstrokes'),
('Jennifer Capriati', ARRAY['Capriati'], 'Redemption', 'American player who peaked in the early 2000s', 'Competed on the WTA Tour', 'Won 3 Grand Slams', 'Won the Australian Open 2 times and the French Open once', 'A former teen prodigy who overcame personal struggles to reach the top'),
('Amelie Mauresmo', ARRAY['Mauresmo'], 'Graceful', 'French player who peaked in the mid-2000s', 'Competed on the WTA Tour', 'Won 2 Grand Slams', 'Won the Australian Open once and Wimbledon once', 'Known for a serve-and-volley style rare in the modern women''s game'),
('Andy Roddick', ARRAY['Roddick', 'A-Rod Tennis'], 'Thunderous', 'American player who peaked in the 2000s', 'Competed on the ATP Tour', 'Won 1 Grand Slam', 'Won the US Open once', 'Known for one of the fastest serves ever and multiple heartbreaking Wimbledon finals'),
('Juan Martin del Potro', ARRAY['Del Potro', 'Delpo'], 'Giant', 'Argentine player who peaked in the late 2000s and 2010s', 'Competed on the ATP Tour', 'Won 1 Grand Slam', 'Won the US Open once', 'Famous for a thunderous forehand and overcoming multiple wrist injuries'),
('Coco Gauff', ARRAY['Gauff', 'Coco'], 'Rising Star', 'American player who rose to prominence in the early 2020s', 'Competed on the WTA Tour', 'Won 1 Grand Slam', 'Won the US Open once', 'Burst onto the scene as a teenager at Wimbledon before winning her first major'),
('Ash Barty', ARRAY['Barty'], 'Calm', 'Australian player who peaked in the early 2020s', 'Competed on the WTA Tour', 'Won 3 Grand Slams', 'Won the French Open once, Wimbledon once, and the Australian Open once', 'Retired at world No. 1 at just 25 years old after winning her home Grand Slam'),
('Angelique Kerber', ARRAY['Kerber'], 'Steady', 'German player who peaked in the mid-2010s', 'Competed on the WTA Tour', 'Won 3 Grand Slams', 'Won the Australian Open once, the US Open once, and Wimbledon once', 'Defeated the world No. 1 in two Grand Slam finals in a single year'),
('Daniil Medvedev', ARRAY['Medvedev'], 'Unorthodox', 'Russian player who peaked in the early 2020s', 'Competed on the ATP Tour', 'Won 1 Grand Slam', 'Won the US Open once', 'Known for a unique playing style and epic five-set battles in Grand Slam finals');
