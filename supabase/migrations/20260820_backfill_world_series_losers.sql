-- APPLIED live on 2026-08-20 (Round 240). Safe to re-run: every update
-- only fills a NULL, so a second pass matches nothing.
--
-- Why: Round 233's shape repair kept the 20 runners-up the scrape had
-- clean and honestly nulled the 101 it stored as scores. This closes the
-- column: every World Series from 1903 through 2025 now names its beaten
-- pennant winner.
--
-- Verification, the Round 239 method: an independent list (Topend
-- Sports' World Series winners roll, fetched 2026-08-20, after
-- Wikipedia's table failed to come through the fetcher) was
-- machine-checked against the database. All 121 winners align (two clubs
-- carry period-name variants, recorded below), the 20 existing losers
-- all match, and the series scores agree on 118 of 121, with all three
-- deltas resolved and recorded:
--   - 1907, 1912, 1922: the source drops the tie games; the database's
--     4-0-1, 4-3-1 and 4-0-1 are the fuller truth and stand.
--   - 1995: the source says 4-1; the series went six games (Glavine's
--     one-hitter in game six), the database's 4-2 stands, and both
--     sides agree Cleveland were the beaten side.
--   - 2025: the source prints 5-4, impossible for best of seven; the
--     database's verified 4-3 stands and its loser was already set.
-- Name conventions: the winner column already says Boston Americans
-- (1903) and Washington Senators (1924), so the 1925 and 1933 losers are
-- recorded as Washington Senators for internal consistency, and every
-- other era name lands as the source and the record agree (Brooklyn
-- Robins, St. Louis Browns, Milwaukee Braves, Anaheim Angels).
-- Every derived runner-up was also read against known history row by
-- row before the update was written.
--
-- The Record Books page gains the Runner-up column for the World Series
-- section in the same round; simRecords pins the column complete and
-- simListQuizSources raises the named-loser floor.

BEGIN;

UPDATE world_series_v2 SET loser = 'Pittsburgh Pirates' WHERE year = 1903 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Philadelphia Athletics' WHERE year = 1905 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Chicago Cubs' WHERE year = 1906 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Detroit Tigers' WHERE year = 1907 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Detroit Tigers' WHERE year = 1909 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Chicago Cubs' WHERE year = 1910 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Giants' WHERE year = 1912 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Giants' WHERE year = 1913 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Philadelphia Athletics' WHERE year = 1914 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Philadelphia Phillies' WHERE year = 1915 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Giants' WHERE year = 1917 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Chicago Cubs' WHERE year = 1918 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Chicago White Sox' WHERE year = 1919 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Brooklyn Robins' WHERE year = 1920 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 1921 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Giants' WHERE year = 1923 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Giants' WHERE year = 1924 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Washington Senators' WHERE year = 1925 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 1926 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Pittsburgh Pirates' WHERE year = 1927 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Chicago Cubs' WHERE year = 1929 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Philadelphia Athletics' WHERE year = 1931 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Chicago Cubs' WHERE year = 1932 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Washington Senators' WHERE year = 1933 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Detroit Tigers' WHERE year = 1934 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Chicago Cubs' WHERE year = 1935 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Giants' WHERE year = 1936 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Detroit Tigers' WHERE year = 1940 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Brooklyn Dodgers' WHERE year = 1941 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 1942 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'St. Louis Cardinals' WHERE year = 1943 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'St. Louis Browns' WHERE year = 1944 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Chicago Cubs' WHERE year = 1945 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Boston Red Sox' WHERE year = 1946 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Brooklyn Dodgers' WHERE year = 1947 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Boston Braves' WHERE year = 1948 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Brooklyn Dodgers' WHERE year = 1949 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Cleveland Indians' WHERE year = 1954 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 1955 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Brooklyn Dodgers' WHERE year = 1956 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 1957 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Milwaukee Braves' WHERE year = 1958 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Chicago White Sox' WHERE year = 1959 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 1960 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Cincinnati Reds' WHERE year = 1961 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 1963 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 1964 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Minnesota Twins' WHERE year = 1965 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Los Angeles Dodgers' WHERE year = 1966 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Boston Red Sox' WHERE year = 1967 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'St. Louis Cardinals' WHERE year = 1968 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Baltimore Orioles' WHERE year = 1969 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Cincinnati Reds' WHERE year = 1970 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Baltimore Orioles' WHERE year = 1971 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Cincinnati Reds' WHERE year = 1972 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Los Angeles Dodgers' WHERE year = 1974 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Boston Red Sox' WHERE year = 1975 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Los Angeles Dodgers' WHERE year = 1977 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Los Angeles Dodgers' WHERE year = 1978 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Baltimore Orioles' WHERE year = 1979 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Kansas City Royals' WHERE year = 1980 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 1981 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Milwaukee Brewers' WHERE year = 1982 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Philadelphia Phillies' WHERE year = 1983 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'San Diego Padres' WHERE year = 1984 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'St. Louis Cardinals' WHERE year = 1985 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Boston Red Sox' WHERE year = 1986 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'St. Louis Cardinals' WHERE year = 1987 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Oakland Athletics' WHERE year = 1988 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'San Francisco Giants' WHERE year = 1989 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Oakland Athletics' WHERE year = 1990 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Atlanta Braves' WHERE year = 1991 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Atlanta Braves' WHERE year = 1992 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Cleveland Indians' WHERE year = 1995 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Atlanta Braves' WHERE year = 1996 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Cleveland Indians' WHERE year = 1997 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'San Diego Padres' WHERE year = 1998 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 2001 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'San Francisco Giants' WHERE year = 2002 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 2003 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'St. Louis Cardinals' WHERE year = 2004 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Houston Astros' WHERE year = 2005 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Detroit Tigers' WHERE year = 2006 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Colorado Rockies' WHERE year = 2007 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Tampa Bay Rays' WHERE year = 2008 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Philadelphia Phillies' WHERE year = 2009 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Texas Rangers' WHERE year = 2010 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Texas Rangers' WHERE year = 2011 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Detroit Tigers' WHERE year = 2012 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'St. Louis Cardinals' WHERE year = 2013 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Kansas City Royals' WHERE year = 2014 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Mets' WHERE year = 2015 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Cleveland Indians' WHERE year = 2016 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Los Angeles Dodgers' WHERE year = 2017 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Los Angeles Dodgers' WHERE year = 2018 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Houston Astros' WHERE year = 2019 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Tampa Bay Rays' WHERE year = 2020 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Houston Astros' WHERE year = 2021 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Philadelphia Phillies' WHERE year = 2022 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'Arizona Diamondbacks' WHERE year = 2023 AND loser IS NULL;
UPDATE world_series_v2 SET loser = 'New York Yankees' WHERE year = 2024 AND loser IS NULL;

COMMIT;
