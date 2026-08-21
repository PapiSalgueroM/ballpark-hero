-- APPLIED live on 2026-08-20 (Round 245). Safe to re-run: every update
-- only fills a NULL, so a second pass matches nothing.
--
-- Why: the Round 233 shape repair found the finals_mvp column holding
-- team names and coaches (the shifted scrape) and honestly nulled all of
-- it. This fills the column with the real award, given every year since
-- the league began.
--
-- Verification: Athlon's every-WNBA-Finals list (the same source whose
-- matchups agreed with all 29 verified winners and losers in Round 242)
-- carries the Finals MVP per year, and every one of the 29 names matches
-- known history independently: Cynthia Cooper's four straight to open
-- the league, Leslie's pair, Taurasi in 2009 and 2014, Fowles twice,
-- Stewart twice, Meesseman as the first bench Finals MVP in 2019, and
-- A'ja Wilson in 2023 and 2025.
--
-- The Record Books WNBA section gains the Finals MVP column in the same
-- round; simRecords pins it complete and fences it dash-free.

BEGIN;

UPDATE wnba_finals SET finals_mvp = 'Cynthia Cooper' WHERE year = 1997 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Cynthia Cooper' WHERE year = 1998 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Cynthia Cooper' WHERE year = 1999 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Cynthia Cooper' WHERE year = 2000 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Lisa Leslie' WHERE year = 2001 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Lisa Leslie' WHERE year = 2002 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Ruth Riley' WHERE year = 2003 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Betty Lennox' WHERE year = 2004 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Yolanda Griffith' WHERE year = 2005 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Deanna Nolan' WHERE year = 2006 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Cappie Pondexter' WHERE year = 2007 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Katie Smith' WHERE year = 2008 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Diana Taurasi' WHERE year = 2009 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Lauren Jackson' WHERE year = 2010 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Seimone Augustus' WHERE year = 2011 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Tamika Catchings' WHERE year = 2012 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Maya Moore' WHERE year = 2013 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Diana Taurasi' WHERE year = 2014 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Sylvia Fowles' WHERE year = 2015 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Candace Parker' WHERE year = 2016 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Sylvia Fowles' WHERE year = 2017 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Breanna Stewart' WHERE year = 2018 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Emma Meesseman' WHERE year = 2019 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Breanna Stewart' WHERE year = 2020 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Kahleah Copper' WHERE year = 2021 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Chelsea Gray' WHERE year = 2022 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'A''ja Wilson' WHERE year = 2023 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'Jonquel Jones' WHERE year = 2024 AND finals_mvp IS NULL;
UPDATE wnba_finals SET finals_mvp = 'A''ja Wilson' WHERE year = 2025 AND finals_mvp IS NULL;

COMMIT;
