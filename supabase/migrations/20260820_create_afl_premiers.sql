-- APPLIED live on 2026-08-20 (Round 234). Safe to re-run: the create is
-- IF NOT EXISTS and the insert replaces the table's contents wholesale.
--
-- Why: the second piece of Australian content for the measured number two
-- country (3,551 visits a month, 21% of traffic, per the 2026-08-20
-- analytics pull). Round 231 shipped /afl-higher-lower; this feeds a
-- VFL/AFL premiers category in the List Quiz.
--
-- The data: every premiership 1897 through 2025, one premier per season,
-- no gaps (the league played through both wars; 1924 had no grand final
-- but Essendon are the premiers). Two-source verified on 2026-08-20:
-- afl.com.au/stats/premiership-winners cross-checked against
-- aflonline.com.au's premiers roll, which agree on every year, and the
-- famous totals hold: Essendon, Carlton and Collingwood 16 flags each,
-- Richmond, Hawthorn and Melbourne 13, Geelong 10, Fitzroy 8. Clubs are
-- named as they were at the time (South Melbourne for 1909, 1918 and
-- 1933 before the Sydney move; Footscray for 1954 before the Western
-- Bulldogs rename), the same convention the other champion tables use
-- for Minneapolis Lakers and the Chicago Black Hawks. 2026 is absent on
-- purpose: that grand final has not been played yet.
--
-- scripts/simListQuizSources.mjs ratchets this table: exactly 129 rows,
-- 18 distinct names, each year once, and the famous flag counts pinned.

BEGIN;

CREATE TABLE IF NOT EXISTS afl_premiers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year int NOT NULL UNIQUE,
  premier text NOT NULL
);

ALTER TABLE afl_premiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'afl_premiers'
  ) THEN
    CREATE POLICY "Public read access" ON afl_premiers FOR SELECT USING (true);
  END IF;
END $$;

DELETE FROM afl_premiers;

INSERT INTO afl_premiers (year, premier) VALUES
(1897, 'Essendon'), (1898, 'Fitzroy'), (1899, 'Fitzroy'), (1900, 'Melbourne'),
(1901, 'Essendon'), (1902, 'Collingwood'), (1903, 'Collingwood'), (1904, 'Fitzroy'),
(1905, 'Fitzroy'), (1906, 'Carlton'), (1907, 'Carlton'), (1908, 'Carlton'),
(1909, 'South Melbourne'), (1910, 'Collingwood'), (1911, 'Essendon'), (1912, 'Essendon'),
(1913, 'Fitzroy'), (1914, 'Carlton'), (1915, 'Carlton'), (1916, 'Fitzroy'),
(1917, 'Collingwood'), (1918, 'South Melbourne'), (1919, 'Collingwood'), (1920, 'Richmond'),
(1921, 'Richmond'), (1922, 'Fitzroy'), (1923, 'Essendon'), (1924, 'Essendon'),
(1925, 'Geelong'), (1926, 'Melbourne'), (1927, 'Collingwood'), (1928, 'Collingwood'),
(1929, 'Collingwood'), (1930, 'Collingwood'), (1931, 'Geelong'), (1932, 'Richmond'),
(1933, 'South Melbourne'), (1934, 'Richmond'), (1935, 'Collingwood'), (1936, 'Collingwood'),
(1937, 'Geelong'), (1938, 'Carlton'), (1939, 'Melbourne'), (1940, 'Melbourne'),
(1941, 'Melbourne'), (1942, 'Essendon'), (1943, 'Richmond'), (1944, 'Fitzroy'),
(1945, 'Carlton'), (1946, 'Essendon'), (1947, 'Carlton'), (1948, 'Melbourne'),
(1949, 'Essendon'), (1950, 'Essendon'), (1951, 'Geelong'), (1952, 'Geelong'),
(1953, 'Collingwood'), (1954, 'Footscray'), (1955, 'Melbourne'), (1956, 'Melbourne'),
(1957, 'Melbourne'), (1958, 'Collingwood'), (1959, 'Melbourne'), (1960, 'Melbourne'),
(1961, 'Hawthorn'), (1962, 'Essendon'), (1963, 'Geelong'), (1964, 'Melbourne'),
(1965, 'Essendon'), (1966, 'St Kilda'), (1967, 'Richmond'), (1968, 'Carlton'),
(1969, 'Richmond'), (1970, 'Carlton'), (1971, 'Hawthorn'), (1972, 'Carlton'),
(1973, 'Richmond'), (1974, 'Richmond'), (1975, 'North Melbourne'), (1976, 'Hawthorn'),
(1977, 'North Melbourne'), (1978, 'Hawthorn'), (1979, 'Carlton'), (1980, 'Richmond'),
(1981, 'Carlton'), (1982, 'Carlton'), (1983, 'Hawthorn'), (1984, 'Essendon'),
(1985, 'Essendon'), (1986, 'Hawthorn'), (1987, 'Carlton'), (1988, 'Hawthorn'),
(1989, 'Hawthorn'), (1990, 'Collingwood'), (1991, 'Hawthorn'), (1992, 'West Coast'),
(1993, 'Essendon'), (1994, 'West Coast'), (1995, 'Carlton'), (1996, 'North Melbourne'),
(1997, 'Adelaide'), (1998, 'Adelaide'), (1999, 'North Melbourne'), (2000, 'Essendon'),
(2001, 'Brisbane Lions'), (2002, 'Brisbane Lions'), (2003, 'Brisbane Lions'), (2004, 'Port Adelaide'),
(2005, 'Sydney'), (2006, 'West Coast'), (2007, 'Geelong'), (2008, 'Hawthorn'),
(2009, 'Geelong'), (2010, 'Collingwood'), (2011, 'Geelong'), (2012, 'Sydney'),
(2013, 'Hawthorn'), (2014, 'Hawthorn'), (2015, 'Hawthorn'), (2016, 'Western Bulldogs'),
(2017, 'Richmond'), (2018, 'West Coast'), (2019, 'Richmond'), (2020, 'Richmond'),
(2021, 'Melbourne'), (2022, 'Geelong'), (2023, 'Collingwood'), (2024, 'Brisbane Lions'),
(2025, 'Brisbane Lions');

COMMIT;
