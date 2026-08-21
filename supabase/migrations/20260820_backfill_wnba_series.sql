-- APPLIED live on 2026-08-20 (Round 242). Safe to re-run: every update
-- only fills a NULL, so a second pass matches nothing.
--
-- Why: Round 233's shape repair recovered every WNBA runner-up but had
-- to null the series score on the ten type-B rows the scrape never
-- carried. This closes the last incomplete finals column on the site.
--
-- Verification: Athlon's every-WNBA-Finals list (fetched 2026-08-20)
-- was checked against the database: all 29 winners and all 29 losers
-- agree, and the 19 series scores already carried all match, which
-- corroborates both sides. The ten missing scores below come from that
-- list AND match known history row by row (the Comets' 2-1 over the
-- Liberty in 1999, the Sparks' two sweeps, the Mercury's five-game 2007
-- classic with the Shock, the Sparks over the Lynx in five in 2016).
--
-- With this, every finals table is fully complete: winner, runner-up
-- and series on every row (cup 110, ws 121, nba 80, wnba 29).

BEGIN;

UPDATE wnba_finals SET series_result = '2-1' WHERE year = 1999 AND series_result IS NULL;
UPDATE wnba_finals SET series_result = '2-0' WHERE year = 2001 AND series_result IS NULL;
UPDATE wnba_finals SET series_result = '2-0' WHERE year = 2002 AND series_result IS NULL;
UPDATE wnba_finals SET series_result = '2-1' WHERE year = 2004 AND series_result IS NULL;
UPDATE wnba_finals SET series_result = '3-2' WHERE year = 2007 AND series_result IS NULL;
UPDATE wnba_finals SET series_result = '3-0' WHERE year = 2011 AND series_result IS NULL;
UPDATE wnba_finals SET series_result = '3-0' WHERE year = 2014 AND series_result IS NULL;
UPDATE wnba_finals SET series_result = '3-2' WHERE year = 2016 AND series_result IS NULL;
UPDATE wnba_finals SET series_result = '3-1' WHERE year = 2022 AND series_result IS NULL;
UPDATE wnba_finals SET series_result = '3-1' WHERE year = 2023 AND series_result IS NULL;

COMMIT;
