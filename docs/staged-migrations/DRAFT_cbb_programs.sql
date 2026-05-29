-- DRAFT — NOT FACT-VERIFIED — DO NOT APPLY UNTIL SIGNED OFF
-- Target table: public.cbb_programs
-- Schema (from migration 20260309020228): school_name text, common_names text[],
--   vibe_word text, region_hint text, conference_hint text, tournament_hint text,
--   championships_hint text, mascot_hint text, difficulty text
-- Unblocks P0-4 (CBB game is code-fixed but has zero rows). EVERY value below is a
-- fact Claude generated from memory — see docs/audits/cbb_programs_audit.md and
-- verify before applying. Championship counts (esp. vacated titles) and 2024-25
-- conference realignment are the highest-risk fields.

INSERT INTO public.cbb_programs (school_name, common_names, vibe_word, region_hint, conference_hint, tournament_hint, championships_hint, mascot_hint, difficulty) VALUES
('Duke', ARRAY['Duke','Blue Devils'], 'Blue-blood', 'Durham, North Carolina (Southeast)', 'ACC', 'Perennial Final Four team; Coach K era 1980-2022, now Jon Scheyer', '5 national titles (1991, 1992, 2001, 2010, 2015)', 'Blue Devils; home is Cameron Indoor Stadium', 'easy'),
('North Carolina', ARRAY['North Carolina','UNC','Tar Heels','Carolina'], 'Storied', 'Chapel Hill, North Carolina (Southeast)', 'ACC', 'Most Final Four appearances; Dean Smith / Roy Williams era', '6 national titles (1957, 1982, 1993, 2005, 2009, 2017)', 'Tar Heels; home is the Dean Smith Center', 'easy'),
('Kentucky', ARRAY['Kentucky','UK','Wildcats','Big Blue'], 'Tradition-rich', 'Lexington, Kentucky (Southeast)', 'SEC', 'Most all-time wins; Calipari one-and-done era through 2024', '8 national titles (1948, 1949, 1951, 1958, 1978, 1996, 1998, 2012)', 'Wildcats; home is Rupp Arena', 'easy'),
('Kansas', ARRAY['Kansas','KU','Jayhawks'], 'Historic', 'Lawrence, Kansas (Midwest)', 'Big 12', 'Birthplace of the coach (Naismith); Bill Self era', '4 national titles (1952, 1988, 2008, 2022)', 'Jayhawks; home is Allen Fieldhouse', 'easy'),
('UCLA', ARRAY['UCLA','Bruins'], 'Dynasty', 'Los Angeles, California (West)', 'Big Ten (since 2024)', 'John Wooden dynasty of the 1960s-70s', '11 national titles, most all-time (10 under Wooden)', 'Bruins; home is Pauley Pavilion', 'easy'),
('Indiana', ARRAY['Indiana','IU','Hoosiers'], 'Old-school', 'Bloomington, Indiana (Midwest)', 'Big Ten', 'Bob Knight era; 1976 team went undefeated', '5 national titles (1940, 1953, 1976, 1981, 1987)', 'Hoosiers; home is Assembly Hall', 'medium'),
('Connecticut', ARRAY['UConn','Connecticut','Huskies'], 'Modern dynasty', 'Storrs, Connecticut (Northeast)', 'Big East', 'Back-to-back champions 2023 and 2024', '6 national titles (1999, 2004, 2011, 2014, 2023, 2024)', 'Huskies', 'medium'),
('Villanova', ARRAY['Villanova','Nova','Wildcats'], 'Clutch', 'Villanova, Pennsylvania (Northeast)', 'Big East', 'Jay Wright era; 1985 upset of Georgetown', '3 national titles (1985, 2016, 2018)', 'Wildcats', 'medium'),
('Louisville', ARRAY['Louisville','Cardinals','Cards'], 'Controversial', 'Louisville, Kentucky (Southeast)', 'ACC', 'Denny Crum era; 2013 title later VACATED by the NCAA', '2 recognized national titles (1980, 1986); 2013 vacated', 'Cardinals', 'medium'),
('Florida', ARRAY['Florida','Gators','UF'], 'Resurgent', 'Gainesville, Florida (Southeast)', 'SEC', 'Billy Donovan back-to-back 2006-07; won again in 2025', '3 national titles (2006, 2007, 2025)', 'Gators', 'medium'),
('Michigan State', ARRAY['Michigan State','Sparty','Spartans','MSU'], 'Consistent', 'East Lansing, Michigan (Midwest)', 'Big Ten', 'Tom Izzo era; frequent Final Fours', '2 national titles (1979, 2000)', 'Spartans', 'medium'),
('Michigan', ARRAY['Michigan','Wolverines'], 'Fab Five', 'Ann Arbor, Michigan (Midwest)', 'Big Ten', 'Fab Five of the early 1990s', '1 national title (1989)', 'Wolverines', 'medium'),
('Arizona', ARRAY['Arizona','Wildcats','Zona'], 'West-coast power', 'Tucson, Arizona (Southwest)', 'Big 12 (since 2024)', 'Lute Olson era; 1997 title run', '1 national title (1997)', 'Wildcats', 'medium'),
('Syracuse', ARRAY['Syracuse','Cuse','Orange'], '2-3 zone', 'Syracuse, New York (Northeast)', 'ACC', 'Jim Boeheim era and signature 2-3 zone', '1 national title (2003)', 'Orange; home is the JMA Wireless Dome', 'medium'),
('Georgetown', ARRAY['Georgetown','Hoyas'], 'Big East classic', 'Washington, D.C. (Northeast)', 'Big East', 'John Thompson / Ewing 1980s era', '1 national title (1984)', 'Hoyas', 'medium'),
('Gonzaga', ARRAY['Gonzaga','Zags','Bulldogs'], 'Mid-major risen', 'Spokane, Washington (Northwest)', 'WCC', 'Perennial tournament team; lost finals 2017 and 2021', '0 national titles (2 runner-up finishes)', 'Bulldogs', 'hard'),
('Houston', ARRAY['Houston','Cougars','Coogs'], 'Phi Slama Jama', 'Houston, Texas (South)', 'Big 12 (since 2023)', 'Phi Slama Jama 1980s; recent Final Fours under Sampson', '0 national titles (multiple Final Fours / runner-up)', 'Cougars', 'hard'),
('Baylor', ARRAY['Baylor','Bears'], 'Recent champ', 'Waco, Texas (South)', 'Big 12', 'Scott Drew era; won 2021', '1 national title (2021)', 'Bears', 'hard'),
('Arkansas', ARRAY['Arkansas','Razorbacks','Hogs'], '40 minutes of hell', 'Fayetteville, Arkansas (South)', 'SEC', 'Nolan Richardson era; won 1994', '1 national title (1994)', 'Razorbacks', 'hard'),
('Cincinnati', ARRAY['Cincinnati','Bearcats','UC'], 'Old guard', 'Cincinnati, Ohio (Midwest)', 'Big 12 (since 2023)', 'Oscar Robertson era titles', '2 national titles (1961, 1962)', 'Bearcats', 'hard'),
('Ohio State', ARRAY['Ohio State','Buckeyes','OSU'], 'Football school', 'Columbus, Ohio (Midwest)', 'Big Ten', 'Jerry Lucas era title; frequent tournament team', '1 national title (1960)', 'Buckeyes', 'hard'),
('Maryland', ARRAY['Maryland','Terps','Terrapins'], 'ACC-to-Big-Ten', 'College Park, Maryland (Northeast)', 'Big Ten (since 2014)', 'Gary Williams era; won 2002', '1 national title (2002)', 'Terrapins', 'hard'),
('Virginia', ARRAY['Virginia','UVA','Cavaliers','Hoos'], 'Defense-first', 'Charlottesville, Virginia (Southeast)', 'ACC', 'Tony Bennett pack-line defense; won 2019 after a historic upset the year before', '1 national title (2019)', 'Cavaliers', 'hard'),
('North Carolina State', ARRAY['NC State','NC State Wolfpack','Wolfpack'], 'Cardiac', 'Raleigh, North Carolina (Southeast)', 'ACC', 'Jim Valvano 1983 title run; 2024 Final Four', '2 national titles (1974, 1983)', 'Wolfpack', 'hard');
