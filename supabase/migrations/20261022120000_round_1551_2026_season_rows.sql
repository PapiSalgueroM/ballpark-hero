-- Round 1551 (2026-10-22): the 2026 AFL and NRL seasons reach the champion tables.
--
-- UNAPPLIED. Written for review; the lead applies it at a release, away from
-- midnight ET and never beside a gate on live tables. Never rehearsed on
-- production (BEGIN ... ROLLBACK still takes the locks): rehearse in PGlite.
-- Every block is guarded: a precondition that does not hold raises and the
-- whole transaction writes nothing. A re-run after a good apply is a no-op.
--
-- Why: the four Australian tables stop at 2025 while both 2026 grand finals
-- and both 2026 medals are decided, so Silverware Sort shows the Brisbane Lions
-- on 5 flags (the record is 6) and the Sydney Roosters on 4 premierships (the
-- record is 5), and Champ or Not cannot ask about the season people just saw.
--
-- The rows, each checked on two independent publishers on 2026-10-22:
--   afl_premiers 2026: Brisbane Lions. Grand Final 26 September 2026 at the MCG,
--     Brisbane Lions 14.12 (96) d Fremantle 12.17 (89), their third straight.
--     afl.com.au/news/1621721 (match report) and Reuters (thestar.com.my,
--     2026-09-26, "Brisbane hold off Fremantle in thriller").
--   nrl_premiers 2026: Sydney Roosters, competition NRL. Grand Final 4 October
--     2026, Sydney Roosters 19 d Newcastle Knights 18. SBS News
--     (sbs.com.au/news/article/nrl-grand-final-2026-roosters-knights-results)
--     and AFP (kuwaittimes.com/article/50945, "Sydney Roosters edge Knights").
--     Canonical name per the table's rule: Sydney Roosters (2002 on).
--   afl_brownlow 2026: Nick Daicos, Collingwood, 47 votes, sole medallist, his
--     first. afl.com.au/news/1617930 ("Daicos sets new Brownlow record") and
--     SEN (sen.com.au/news/2026/09/21/brownlow-medal-2026-club-by-club-votes).
--     Both give 47 and no tie.
--   nrl_dally_m 2026: Nathan Cleary, sole medallist, his first (30 September
--     2026). SEN (sen.com.au/news/2026/09/30/dally-m-awards-2026-...) and AAP
--     (canberratimes.com.au/story/9360601, "Cleary completes golden set").
--     The two disagree on his vote total (62 and 67); the table carries no
--     votes column, so nothing unverified ships.
--
-- Held, not added: wnba_finals 2026 (Golden State v Atlanta, still being played
-- on 2026-10-22) and world_series_v2 2026 (not yet started). Each lands in its
-- own round once two publishers carry the result; scripts/simSeasonDue.mjs goes
-- red 21 days after each final is due until it does.
--
-- Daily boards: these rows reshuffle what Champ or Not, Silverware Sort and the
-- Hall of Champions deal, so src/lib/seasonCalendar.ts counts season 2026 of
-- these four tables only from 2026-11-01 ET. Apply BEFORE that date; if the
-- release slips past it, move the date in seasonCalendar.ts to the day after
-- the apply, so the boards change at a day boundary and never mid day.
--
-- Pre counts each guard expects (the ratchets of scripts/simListQuizSources.mjs
-- before this round): afl_premiers 129, nrl_premiers 117, afl_brownlow 112,
-- nrl_dally_m 47. After: 130, 118, 113, 48. afl_brownlow and nrl_dally_m were
-- built through the MCP in Round 291 and have no create file in this folder:
-- for a PGlite rehearsal, take their definitions from one read only
-- information_schema SELECT in the release's live pass.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  IF EXISTS (SELECT 1 FROM afl_premiers WHERE year = 2026 AND premier <> 'Brisbane Lions') THEN
    RAISE EXCEPTION 'afl_premiers already holds a different 2026 premier';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM afl_premiers WHERE year = 2026) THEN
    SELECT count(*) INTO n FROM afl_premiers;
    IF n <> 129 THEN
      RAISE EXCEPTION 'afl_premiers holds % rows, the verified roll before 2026 is 129', n;
    END IF;
    INSERT INTO afl_premiers (year, premier) VALUES (2026, 'Brisbane Lions');
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  IF EXISTS (SELECT 1 FROM nrl_premiers WHERE year = 2026 AND premier <> 'Sydney Roosters') THEN
    RAISE EXCEPTION 'nrl_premiers already holds a different 2026 premier';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM nrl_premiers WHERE year = 2026) THEN
    SELECT count(*) INTO n FROM nrl_premiers;
    IF n <> 117 THEN
      RAISE EXCEPTION 'nrl_premiers holds % rows, the verified roll before 2026 is 117', n;
    END IF;
    INSERT INTO nrl_premiers (year, premier, competition) VALUES (2026, 'Sydney Roosters', 'NRL');
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  IF EXISTS (SELECT 1 FROM afl_brownlow WHERE year = 2026 AND winner <> 'Nick Daicos') THEN
    RAISE EXCEPTION 'afl_brownlow already holds a different 2026 medallist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM afl_brownlow WHERE year = 2026) THEN
    SELECT count(*) INTO n FROM afl_brownlow;
    IF n <> 112 THEN
      RAISE EXCEPTION 'afl_brownlow holds % rows, the verified roll before 2026 is 112', n;
    END IF;
    INSERT INTO afl_brownlow (year, winner, club, votes) VALUES (2026, 'Nick Daicos', 'Collingwood', 47);
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  IF EXISTS (SELECT 1 FROM nrl_dally_m WHERE year = 2026 AND winner <> 'Nathan Cleary') THEN
    RAISE EXCEPTION 'nrl_dally_m already holds a different 2026 medallist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM nrl_dally_m WHERE year = 2026) THEN
    SELECT count(*) INTO n FROM nrl_dally_m;
    IF n <> 47 THEN
      RAISE EXCEPTION 'nrl_dally_m holds % rows, the verified roll before 2026 is 47', n;
    END IF;
    INSERT INTO nrl_dally_m (year, winner) VALUES (2026, 'Nathan Cleary');
  END IF;
END $$;

COMMIT;
