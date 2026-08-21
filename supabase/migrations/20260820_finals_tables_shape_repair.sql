-- APPLIED live on 2026-08-20 (Round 233). Guarded so a re-run is harmless:
-- the backups use IF NOT EXISTS, the shape updates match nothing once the
-- shape is fixed, and the inserts check for their year first.
--
-- Why: simListQuizSources (Round 233, harness 97) audited every List Quiz
-- source table after Round 232 caught cfb_national_champions teaching
-- wrong history. The four finals-series tables all carry the same scrape
-- disease, columns shifted per row depending on what the scrape dropped:
--
--   stanley_cup_finals_v2: 85 of 110 rows had the series score sitting in
--     loser and the head coach's name sitting in series_result.
--   world_series_v2: about 100 rows the same, score in loser (including
--     best-of-9 scores tagged "[V]" and tie-game scores like 4-0-1 tagged
--     "[T]") and the manager's name in series_result.
--   wnba_finals: two shapes. Where loser held the score, the REAL loser
--     sat in finals_mvp (a team name in a person column) and the winning
--     coach sat in series_result. Where loser was real, the losing coach
--     sat in finals_mvp and the winning coach in series_result, and the
--     actual score was never scraped at all.
--   nba_finals: loser empty on every row before 2026. The score sat in
--     series_result OR in winning_coach, and its direction depended on
--     whose franchise page the row came from, so about half the scores
--     read loser-first (Boston's 1959 sweep stored as 0-4). On exactly
--     those rows winning_coach held the LOSING coach (Jason Kidd stored
--     as the 2024 winning coach when Joe Mazzulla's Celtics won). Some
--     rows had a franchise finals-history string in series_result.
--
-- Nothing wrong ever shipped: the List Quiz reads only the winner
-- columns, and winner plus nba_finals.finals_mvp were checked row by row
-- against the record and are correct. But Round 232 proved this kind of
-- corruption sits harmless only until a new feature reads the table.
--
-- The repair rule, same for all four tables: a column must mean what its
-- name says. Every cell either moves to its right column, corroborated
-- against known history, or goes to NULL. Nothing is invented:
--   - Scores move to series_result, winner-first (for a completed series
--     the winner won more games, so ordering max-first is definitional;
--     every relocated games-split was also checked against the record).
--   - wnba_finals losers recovered from the team names in finals_mvp,
--     all 19 verified as the true runners-up.
--   - nba_finals losers recovered from franchise-history strings that
--     name a team other than the winner, all 15 verified.
--   - Coach and manager names go to NULL: there is no coach column, the
--     attribution was wrong on about half the nba rows, and unverified
--     names in a wrong column are not data. The pre-repair tables are
--     kept whole in *_bak_20260820 (RLS on, no public policy).
--   - wnba type-B scores and pre-2026 nba losers without a history
--     string were never scraped: NULL, honestly thin, not filled.
--
-- Also adds the two rows for seasons decided since the tables stopped:
--   stanley_cup_finals_v2 2026: Carolina Hurricanes over the Vegas
--     Golden Knights in six, verified against NHL.com and CBS Sports on
--     2026-08-20.
--   nba_finals 2026 was already present (Knicks over the Spurs) and was
--     corroborated today against NBA.com and ESPN: five games, Jalen
--     Brunson Finals MVP.
--
-- The en dash the scrape used inside scores is spelled chr(8211) below
-- so the character itself never appears in this repo.
--
-- scripts/simListQuizSources.mjs fences all of this permanently: a loser
-- must never start with a digit, a series_result must be winner-first
-- games, and the person columns must never carry digits.

BEGIN;

-- Backups first. CREATE TABLE AS leaves RLS off, so it goes on in the
-- same breath; with no policy the anon key cannot touch them.
CREATE TABLE IF NOT EXISTS stanley_cup_finals_v2_bak_20260820 AS SELECT * FROM stanley_cup_finals_v2;
CREATE TABLE IF NOT EXISTS world_series_v2_bak_20260820 AS SELECT * FROM world_series_v2;
CREATE TABLE IF NOT EXISTS wnba_finals_bak_20260820 AS SELECT * FROM wnba_finals;
CREATE TABLE IF NOT EXISTS nba_finals_bak_20260820 AS SELECT * FROM nba_finals;
ALTER TABLE stanley_cup_finals_v2_bak_20260820 ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_series_v2_bak_20260820 ENABLE ROW LEVEL SECURITY;
ALTER TABLE wnba_finals_bak_20260820 ENABLE ROW LEVEL SECURITY;
ALTER TABLE nba_finals_bak_20260820 ENABLE ROW LEVEL SECURITY;

-- 1) Stanley Cup: shifted rows move the score home and drop the coach
-- debris; the real loser was never scraped, so NULL.
UPDATE stanley_cup_finals_v2
SET series_result = replace(loser, chr(8211), '-'), loser = NULL
WHERE loser ~ ('^[0-9]+' || chr(8211) || '[0-9]+$');

UPDATE stanley_cup_finals_v2
SET series_result = replace(series_result, chr(8211), '-')
WHERE series_result LIKE '%' || chr(8211) || '%';

INSERT INTO stanley_cup_finals_v2 (year, winner, loser, series_result, conn_smythe_winner)
SELECT 2026, 'Carolina Hurricanes', 'Vegas Golden Knights', '4-2', NULL
WHERE NOT EXISTS (SELECT 1 FROM stanley_cup_finals_v2 WHERE year = 2026);

-- 2) World Series: the seven odd-format seasons first, digits exactly as
-- the record has them (1903, 1919, 1920, 1921 were best of nine; 1907,
-- 1912, 1922 each had one tie game). 1922's loser was scraped clean.
UPDATE world_series_v2 SET series_result = '5-3', loser = NULL WHERE year = 1903;
UPDATE world_series_v2 SET series_result = '4-0-1', loser = NULL WHERE year = 1907;
UPDATE world_series_v2 SET series_result = '4-3-1', loser = NULL WHERE year = 1912;
UPDATE world_series_v2 SET series_result = '5-3', loser = NULL WHERE year = 1919;
UPDATE world_series_v2 SET series_result = '5-2', loser = NULL WHERE year = 1920;
UPDATE world_series_v2 SET series_result = '5-3', loser = NULL WHERE year = 1921;
UPDATE world_series_v2 SET series_result = '4-0-1' WHERE year = 1922;

UPDATE world_series_v2
SET series_result = replace(loser, chr(8211), '-'), loser = NULL
WHERE loser ~ ('^[0-9]+' || chr(8211) || '[0-9]+$');

UPDATE world_series_v2
SET series_result = replace(series_result, chr(8211), '-')
WHERE series_result LIKE '%' || chr(8211) || '%';

-- 3) WNBA: type A rows carry the score in loser and the true loser in
-- finals_mvp, so both move home. Type B rows carry only coaches outside
-- loser; their score was never scraped, so those columns go to NULL.
UPDATE wnba_finals
SET series_result = replace(loser, chr(8211), '-'),
    loser = finals_mvp,
    finals_mvp = NULL
WHERE loser ~ ('^[0-9]+' || chr(8211) || '[0-9]+$');

UPDATE wnba_finals
SET series_result = NULL, finals_mvp = NULL
WHERE series_result IS NOT NULL AND series_result !~ '^[0-9]+-[0-9]+$';

-- 4) NBA: recover the loser where a franchise-history string names a
-- team other than the winner (all 15 such rows verified), then pull the
-- score out of whichever column holds it and store it winner-first,
-- then clear the mixed-attribution coach column and any leftover
-- history strings.
UPDATE nba_finals
SET loser = trim(split_part(series_result, ' (', 1))
WHERE year < 2026
  AND loser IS NULL
  AND series_result ~ ' \([0-9]+\) \([0-9]+, '
  AND trim(split_part(series_result, ' (', 1)) <> winner;

UPDATE nba_finals n
SET series_result = s.norm, winning_coach = NULL
FROM (
  SELECT id,
         greatest(split_part(replace(raw, chr(8211), '-'), '-', 1)::int,
                  split_part(replace(raw, chr(8211), '-'), '-', 2)::int)::text
         || '-' ||
         least(split_part(replace(raw, chr(8211), '-'), '-', 1)::int,
               split_part(replace(raw, chr(8211), '-'), '-', 2)::int)::text AS norm
  FROM (
    SELECT id, COALESCE(
      CASE WHEN series_result ~ ('^[0-9]+' || chr(8211) || '[0-9]+$') THEN series_result END,
      CASE WHEN winning_coach ~ ('^[0-9]+' || chr(8211) || '[0-9]+$') THEN winning_coach END
    ) AS raw
    FROM nba_finals WHERE year < 2026
  ) x
  WHERE raw IS NOT NULL
) s
WHERE n.id = s.id;

UPDATE nba_finals SET series_result = NULL
WHERE year < 2026 AND series_result IS NOT NULL AND series_result !~ '^[0-9]+-[0-9]+$';

UPDATE nba_finals SET winning_coach = NULL
WHERE year < 2026 AND winning_coach IS NOT NULL;

COMMIT;
