-- APPLIED live on 2026-08-20 (Round 239). Safe to re-run: every update
-- only fills a NULL, so a second pass matches nothing.
--
-- Why: Round 233's shape repair recovered 15 NBA Finals runners-up from
-- franchise-history strings and honestly nulled the other 64, because
-- the scrape never carried them. This closes the column properly: every
-- Finals from 1947 through 2025 now names its beaten finalist.
--
-- Verification, three ways agreeing before a single row moved:
--   1. An independent finals list (Wikipedia's list of NBA champions,
--      fetched 2026-08-20) was machine-checked against the database:
--      all 79 winners align and ALL 79 series scores agree exactly with
--      the values the Round 233 repair produced, which corroborates both
--      sides at once.
--   2. The 15 runners-up already recovered in Round 233 all match the
--      fetched list.
--   3. Every derived runner-up was checked against known history row by
--      row. The fetch carried two bad lines, both caught by the checks:
--      its 2026 row inverted the result (the Knicks beat the Spurs in
--      five, per NBA.com and ESPN the day this shipped, and that row was
--      already verified in the database, so the fetched line was
--      discarded), and its 1948 line flipped the direction of a series
--      the record books settle plainly: the Baltimore Bullets beat the
--      Philadelphia Warriors 4-2, so the Warriors are the 1948
--      runner-up.
--
-- Franchise names stay as they were at the time (Chicago Stags,
-- Washington Capitols, Fort Wayne Pistons, San Francisco Warriors,
-- Seattle SuperSonics, New Jersey Nets).
--
-- The Record Books page gains the Runner-up column for the NBA section
-- in the same round, and the fences move with it: simRecords pins the
-- column complete, simListQuizSources raises the nba named-loser floor.

BEGIN;

UPDATE nba_finals SET loser = 'Chicago Stags' WHERE year = 1947 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Philadelphia Warriors' WHERE year = 1948 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Washington Capitols' WHERE year = 1949 AND loser IS NULL;
UPDATE nba_finals SET loser = 'New York Knicks' WHERE year = 1951 AND loser IS NULL;
UPDATE nba_finals SET loser = 'New York Knicks' WHERE year = 1952 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Fort Wayne Pistons' WHERE year = 1955 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Fort Wayne Pistons' WHERE year = 1956 AND loser IS NULL;
UPDATE nba_finals SET loser = 'St. Louis Hawks' WHERE year = 1957 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Minneapolis Lakers' WHERE year = 1959 AND loser IS NULL;
UPDATE nba_finals SET loser = 'St. Louis Hawks' WHERE year = 1960 AND loser IS NULL;
UPDATE nba_finals SET loser = 'St. Louis Hawks' WHERE year = 1961 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1962 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1963 AND loser IS NULL;
UPDATE nba_finals SET loser = 'San Francisco Warriors' WHERE year = 1964 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1965 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1966 AND loser IS NULL;
UPDATE nba_finals SET loser = 'San Francisco Warriors' WHERE year = 1967 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1968 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1969 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1970 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Baltimore Bullets' WHERE year = 1971 AND loser IS NULL;
UPDATE nba_finals SET loser = 'New York Knicks' WHERE year = 1972 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1973 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Milwaukee Bucks' WHERE year = 1974 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Washington Bullets' WHERE year = 1975 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Phoenix Suns' WHERE year = 1976 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Philadelphia 76ers' WHERE year = 1977 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Seattle SuperSonics' WHERE year = 1978 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Philadelphia 76ers' WHERE year = 1980 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Houston Rockets' WHERE year = 1981 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Philadelphia 76ers' WHERE year = 1982 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1983 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1984 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Houston Rockets' WHERE year = 1986 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Boston Celtics' WHERE year = 1987 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1989 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Portland Trail Blazers' WHERE year = 1990 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 1991 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Portland Trail Blazers' WHERE year = 1992 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Phoenix Suns' WHERE year = 1993 AND loser IS NULL;
UPDATE nba_finals SET loser = 'New York Knicks' WHERE year = 1994 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Seattle SuperSonics' WHERE year = 1996 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Utah Jazz' WHERE year = 1997 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Utah Jazz' WHERE year = 1998 AND loser IS NULL;
UPDATE nba_finals SET loser = 'New York Knicks' WHERE year = 1999 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Indiana Pacers' WHERE year = 2000 AND loser IS NULL;
UPDATE nba_finals SET loser = 'New Jersey Nets' WHERE year = 2003 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 2004 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Detroit Pistons' WHERE year = 2005 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Dallas Mavericks' WHERE year = 2006 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Cleveland Cavaliers' WHERE year = 2007 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Los Angeles Lakers' WHERE year = 2008 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Miami Heat' WHERE year = 2011 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Oklahoma City Thunder' WHERE year = 2012 AND loser IS NULL;
UPDATE nba_finals SET loser = 'San Antonio Spurs' WHERE year = 2013 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Cleveland Cavaliers' WHERE year = 2015 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Golden State Warriors' WHERE year = 2016 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Golden State Warriors' WHERE year = 2019 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Miami Heat' WHERE year = 2020 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Phoenix Suns' WHERE year = 2021 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Boston Celtics' WHERE year = 2022 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Miami Heat' WHERE year = 2023 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Dallas Mavericks' WHERE year = 2024 AND loser IS NULL;
UPDATE nba_finals SET loser = 'Indiana Pacers' WHERE year = 2025 AND loser IS NULL;

COMMIT;
