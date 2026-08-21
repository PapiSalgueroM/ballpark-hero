-- APPLIED live on 2026-08-20 (Round 236). Safe to re-run: the create is
-- IF NOT EXISTS and the insert replaces the table's contents wholesale.
--
-- Why: the third Australian build for the measured number two country.
-- Feeds a List Quiz category and the tenth Champ or Not competition.
--
-- The data: every top grade Australian rugby league premiership from
-- 1908 through 2025. Two-source verified on 2026-08-20: Wikipedia's
-- Australian rugby league premiers roll cross-checked against Topend
-- Sports' NRL winners list, which agree on every single year. Three
-- decisions worth recording:
--
--   1. 1997 has TWO rows, because the game split that year: Newcastle
--      Knights won the ARL premiership and the Brisbane Broncos won the
--      Super League one. Both are real top grade premierships, the same
--      way the college football table carries split titles per selector.
--   2. 2007 and 2009 are ABSENT on purpose. Melbourne's premierships
--      from those seasons were stripped in 2010 for systematic salary
--      cap breaches and the titles remain vacant, awarded to nobody.
--      A table row would teach players something the record books
--      unsay; an absent year can never be asked about. Melbourne's
--      honest count is 4 (1999, 2012, 2017, 2020) and the harness pins
--      exactly that.
--   3. Names are canonical per continuous club, not per marketing era:
--      Canterbury-Bankstown Bulldogs covers 1938 through 2004 even
--      though the 1995 and 2004 rows were branded Sydney Bulldogs and
--      Bulldogs at the time, because it is one continuous club and the
--      official count (8) treats it as one. Genuine renames and mergers
--      DO split: Eastern Suburbs (11 titles to 1975) and Sydney
--      Roosters (2002 on) are separate answers, as are St George
--      (15, including the eleven straight 1956 to 1966) and the merged
--      St George Illawarra Dragons (2010). 117 rows, 20 names, and the
--      per-club counts all land on the famous numbers: South Sydney 21,
--      St George 15, Eastern Suburbs 11, Balmain 11, Manly 8,
--      Bulldogs 8, Brisbane 7 (Super League year included as its own
--      competition row), Penrith 6 with the four straight.
--
-- The competition column carries the era: NSWRFL to 1983, NSWRL to
-- 1994, ARL 1995 to 1997, Super League 1997, NRL from 1998.
--
-- scripts/simListQuizSources.mjs ratchets this table exactly;
-- scripts/simChampOrNot.mjs proves the claims built from it. When the
-- 2026 grand final is played, the new row and the ratchets move
-- together.

BEGIN;

CREATE TABLE IF NOT EXISTS nrl_premiers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year int NOT NULL,
  premier text NOT NULL,
  competition text NOT NULL
);

ALTER TABLE nrl_premiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'nrl_premiers'
  ) THEN
    CREATE POLICY "Public read access" ON nrl_premiers FOR SELECT USING (true);
  END IF;
END $$;

DELETE FROM nrl_premiers;

INSERT INTO nrl_premiers (year, premier, competition) VALUES
(1908, 'South Sydney Rabbitohs', 'NSWRFL'),
(1909, 'South Sydney Rabbitohs', 'NSWRFL'),
(1910, 'Newtown', 'NSWRFL'),
(1911, 'Eastern Suburbs', 'NSWRFL'),
(1912, 'Eastern Suburbs', 'NSWRFL'),
(1913, 'Eastern Suburbs', 'NSWRFL'),
(1914, 'South Sydney Rabbitohs', 'NSWRFL'),
(1915, 'Balmain', 'NSWRFL'),
(1916, 'Balmain', 'NSWRFL'),
(1917, 'Balmain', 'NSWRFL'),
(1918, 'South Sydney Rabbitohs', 'NSWRFL'),
(1919, 'Balmain', 'NSWRFL'),
(1920, 'Balmain', 'NSWRFL'),
(1921, 'North Sydney', 'NSWRFL'),
(1922, 'North Sydney', 'NSWRFL'),
(1923, 'Eastern Suburbs', 'NSWRFL'),
(1924, 'Balmain', 'NSWRFL'),
(1925, 'South Sydney Rabbitohs', 'NSWRFL'),
(1926, 'South Sydney Rabbitohs', 'NSWRFL'),
(1927, 'South Sydney Rabbitohs', 'NSWRFL'),
(1928, 'South Sydney Rabbitohs', 'NSWRFL'),
(1929, 'South Sydney Rabbitohs', 'NSWRFL'),
(1930, 'Western Suburbs', 'NSWRFL'),
(1931, 'South Sydney Rabbitohs', 'NSWRFL'),
(1932, 'South Sydney Rabbitohs', 'NSWRFL'),
(1933, 'Newtown', 'NSWRFL'),
(1934, 'Western Suburbs', 'NSWRFL'),
(1935, 'Eastern Suburbs', 'NSWRFL'),
(1936, 'Eastern Suburbs', 'NSWRFL'),
(1937, 'Eastern Suburbs', 'NSWRFL'),
(1938, 'Canterbury-Bankstown Bulldogs', 'NSWRFL'),
(1939, 'Balmain', 'NSWRFL'),
(1940, 'Eastern Suburbs', 'NSWRFL'),
(1941, 'St George', 'NSWRFL'),
(1942, 'Canterbury-Bankstown Bulldogs', 'NSWRFL'),
(1943, 'Newtown', 'NSWRFL'),
(1944, 'Balmain', 'NSWRFL'),
(1945, 'Eastern Suburbs', 'NSWRFL'),
(1946, 'Balmain', 'NSWRFL'),
(1947, 'Balmain', 'NSWRFL'),
(1948, 'Western Suburbs', 'NSWRFL'),
(1949, 'St George', 'NSWRFL'),
(1950, 'South Sydney Rabbitohs', 'NSWRFL'),
(1951, 'South Sydney Rabbitohs', 'NSWRFL'),
(1952, 'Western Suburbs', 'NSWRFL'),
(1953, 'South Sydney Rabbitohs', 'NSWRFL'),
(1954, 'South Sydney Rabbitohs', 'NSWRFL'),
(1955, 'South Sydney Rabbitohs', 'NSWRFL'),
(1956, 'St George', 'NSWRFL'),
(1957, 'St George', 'NSWRFL'),
(1958, 'St George', 'NSWRFL'),
(1959, 'St George', 'NSWRFL'),
(1960, 'St George', 'NSWRFL'),
(1961, 'St George', 'NSWRFL'),
(1962, 'St George', 'NSWRFL'),
(1963, 'St George', 'NSWRFL'),
(1964, 'St George', 'NSWRFL'),
(1965, 'St George', 'NSWRFL'),
(1966, 'St George', 'NSWRFL'),
(1967, 'South Sydney Rabbitohs', 'NSWRFL'),
(1968, 'South Sydney Rabbitohs', 'NSWRFL'),
(1969, 'Balmain', 'NSWRFL'),
(1970, 'South Sydney Rabbitohs', 'NSWRFL'),
(1971, 'South Sydney Rabbitohs', 'NSWRFL'),
(1972, 'Manly-Warringah Sea Eagles', 'NSWRFL'),
(1973, 'Manly-Warringah Sea Eagles', 'NSWRFL'),
(1974, 'Eastern Suburbs', 'NSWRFL'),
(1975, 'Eastern Suburbs', 'NSWRFL'),
(1976, 'Manly-Warringah Sea Eagles', 'NSWRFL'),
(1977, 'St George', 'NSWRFL'),
(1978, 'Manly-Warringah Sea Eagles', 'NSWRFL'),
(1979, 'St George', 'NSWRFL'),
(1980, 'Canterbury-Bankstown Bulldogs', 'NSWRFL'),
(1981, 'Parramatta Eels', 'NSWRFL'),
(1982, 'Parramatta Eels', 'NSWRFL'),
(1983, 'Parramatta Eels', 'NSWRFL'),
(1984, 'Canterbury-Bankstown Bulldogs', 'NSWRL'),
(1985, 'Canterbury-Bankstown Bulldogs', 'NSWRL'),
(1986, 'Parramatta Eels', 'NSWRL'),
(1987, 'Manly-Warringah Sea Eagles', 'NSWRL'),
(1988, 'Canterbury-Bankstown Bulldogs', 'NSWRL'),
(1989, 'Canberra Raiders', 'NSWRL'),
(1990, 'Canberra Raiders', 'NSWRL'),
(1991, 'Penrith Panthers', 'NSWRL'),
(1992, 'Brisbane Broncos', 'NSWRL'),
(1993, 'Brisbane Broncos', 'NSWRL'),
(1994, 'Canberra Raiders', 'NSWRL'),
(1995, 'Canterbury-Bankstown Bulldogs', 'ARL'),
(1996, 'Manly-Warringah Sea Eagles', 'ARL'),
(1997, 'Newcastle Knights', 'ARL'),
(1997, 'Brisbane Broncos', 'Super League'),
(1998, 'Brisbane Broncos', 'NRL'),
(1999, 'Melbourne Storm', 'NRL'),
(2000, 'Brisbane Broncos', 'NRL'),
(2001, 'Newcastle Knights', 'NRL'),
(2002, 'Sydney Roosters', 'NRL'),
(2003, 'Penrith Panthers', 'NRL'),
(2004, 'Canterbury-Bankstown Bulldogs', 'NRL'),
(2005, 'Wests Tigers', 'NRL'),
(2006, 'Brisbane Broncos', 'NRL'),
(2008, 'Manly-Warringah Sea Eagles', 'NRL'),
(2010, 'St George Illawarra Dragons', 'NRL'),
(2011, 'Manly-Warringah Sea Eagles', 'NRL'),
(2012, 'Melbourne Storm', 'NRL'),
(2013, 'Sydney Roosters', 'NRL'),
(2014, 'South Sydney Rabbitohs', 'NRL'),
(2015, 'North Queensland Cowboys', 'NRL'),
(2016, 'Cronulla-Sutherland Sharks', 'NRL'),
(2017, 'Melbourne Storm', 'NRL'),
(2018, 'Sydney Roosters', 'NRL'),
(2019, 'Sydney Roosters', 'NRL'),
(2020, 'Melbourne Storm', 'NRL'),
(2021, 'Penrith Panthers', 'NRL'),
(2022, 'Penrith Panthers', 'NRL'),
(2023, 'Penrith Panthers', 'NRL'),
(2024, 'Penrith Panthers', 'NRL'),
(2025, 'Brisbane Broncos', 'NRL');

COMMIT;
