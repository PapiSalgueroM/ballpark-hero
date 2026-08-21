-- APPLIED live on 2026-08-20 (Round 241). Safe to re-run: every update
-- only fills a NULL, so a second pass matches nothing.
--
-- Why: Round 233's shape repair kept the 27 runners-up the scrape had
-- clean (including the Round 233 insert for 2026) and honestly nulled
-- the 83 it stored as scores. This closes the column: every Stanley Cup
-- Final from 1915 through 2026 now names its beaten side, PCHA and WCHL
-- challengers included (Portland Rosebuds, Edmonton Eskimos, Calgary
-- Tigers).
--
-- Verification, the Round 239 method: an independent finals list
-- (Topend Sports' Stanley Cup winners roll, fetched 2026-08-20) was
-- machine-checked against the database. All 110 winners align (two
-- period-name variants ruled on: the database's Toronto Hockey Club and
-- Toronto St. Patricks stand for 1918 and 1922, the source's Arenas and
-- St. Pats are the same clubs), the 27 existing losers all match, and
-- the series scores agree on 108 of 110 with both deltas resolved IN
-- THE DATABASE'S FAVOR and recorded: the source prints 2-1 for 2024 and
-- 5-1 for 2025, which are the goal scores of the clinching games, not
-- series results; the real series were 4-3 (the Panthers' game seven
-- over Edmonton) and 4-2, both already verified here. Every derived
-- runner-up was also read against known history row by row (the 1942
-- comeback over Detroit, the Blues swept in their first three finals,
-- the 1994 Canucks, Hull's skate in the 1999 crease, the 2003 Mighty
-- Ducks under their era name).
--
-- The Record Books page gains the Runner-up column for the Stanley Cup
-- section in the same round; simRecords pins the column complete and
-- simListQuizSources raises the named-loser floor.

BEGIN;

UPDATE stanley_cup_finals_v2 SET loser = 'Ottawa Senators' WHERE year = 1915 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Portland Rosebuds' WHERE year = 1916 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Montreal Canadiens' WHERE year = 1917 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Vancouver Millionaires' WHERE year = 1918 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Seattle Metropolitans' WHERE year = 1920 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Vancouver Millionaires' WHERE year = 1922 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Edmonton Eskimos' WHERE year = 1923 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Calgary Tigers' WHERE year = 1924 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Montreal Canadiens' WHERE year = 1925 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Victoria Cougars' WHERE year = 1926 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Boston Bruins' WHERE year = 1927 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Montreal Maroons' WHERE year = 1928 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'New York Rangers' WHERE year = 1929 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Boston Bruins' WHERE year = 1930 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'New York Rangers' WHERE year = 1932 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Toronto Maple Leafs' WHERE year = 1933 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Detroit Red Wings' WHERE year = 1934 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Toronto Maple Leafs' WHERE year = 1936 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Toronto Maple Leafs' WHERE year = 1938 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Toronto Maple Leafs' WHERE year = 1939 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Toronto Maple Leafs' WHERE year = 1940 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Detroit Red Wings' WHERE year = 1941 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Detroit Red Wings' WHERE year = 1942 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Boston Bruins' WHERE year = 1943 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Chicago Black Hawks' WHERE year = 1944 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Detroit Red Wings' WHERE year = 1945 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Boston Bruins' WHERE year = 1946 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Montreal Canadiens' WHERE year = 1947 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'New York Rangers' WHERE year = 1950 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Montreal Canadiens' WHERE year = 1951 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Montreal Canadiens' WHERE year = 1952 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Boston Bruins' WHERE year = 1953 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Montreal Canadiens' WHERE year = 1954 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Montreal Canadiens' WHERE year = 1955 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Detroit Red Wings' WHERE year = 1956 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Detroit Red Wings' WHERE year = 1961 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Chicago Black Hawks' WHERE year = 1962 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Chicago Black Hawks' WHERE year = 1965 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Montreal Canadiens' WHERE year = 1967 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'St. Louis Blues' WHERE year = 1968 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'St. Louis Blues' WHERE year = 1969 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'St. Louis Blues' WHERE year = 1970 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Chicago Black Hawks' WHERE year = 1971 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'New York Rangers' WHERE year = 1972 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Chicago Black Hawks' WHERE year = 1973 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Boston Bruins' WHERE year = 1974 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Philadelphia Flyers' WHERE year = 1976 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Philadelphia Flyers' WHERE year = 1980 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'New York Islanders' WHERE year = 1984 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Calgary Flames' WHERE year = 1986 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Philadelphia Flyers' WHERE year = 1987 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Montreal Canadiens' WHERE year = 1989 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Boston Bruins' WHERE year = 1990 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Minnesota North Stars' WHERE year = 1991 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Chicago Blackhawks' WHERE year = 1992 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Los Angeles Kings' WHERE year = 1993 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Vancouver Canucks' WHERE year = 1994 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Detroit Red Wings' WHERE year = 1995 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Florida Panthers' WHERE year = 1996 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Philadelphia Flyers' WHERE year = 1997 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Buffalo Sabres' WHERE year = 1999 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Dallas Stars' WHERE year = 2000 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'New Jersey Devils' WHERE year = 2001 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Carolina Hurricanes' WHERE year = 2002 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Mighty Ducks of Anaheim' WHERE year = 2003 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Calgary Flames' WHERE year = 2004 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Edmonton Oilers' WHERE year = 2006 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Ottawa Senators' WHERE year = 2007 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Pittsburgh Penguins' WHERE year = 2008 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Detroit Red Wings' WHERE year = 2009 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Philadelphia Flyers' WHERE year = 2010 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Vancouver Canucks' WHERE year = 2011 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'New Jersey Devils' WHERE year = 2012 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Boston Bruins' WHERE year = 2013 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'New York Rangers' WHERE year = 2014 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Tampa Bay Lightning' WHERE year = 2015 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'San Jose Sharks' WHERE year = 2016 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Vegas Golden Knights' WHERE year = 2018 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Boston Bruins' WHERE year = 2019 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Dallas Stars' WHERE year = 2020 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Tampa Bay Lightning' WHERE year = 2022 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Florida Panthers' WHERE year = 2023 AND loser IS NULL;
UPDATE stanley_cup_finals_v2 SET loser = 'Edmonton Oilers' WHERE year = 2024 AND loser IS NULL;

COMMIT;
