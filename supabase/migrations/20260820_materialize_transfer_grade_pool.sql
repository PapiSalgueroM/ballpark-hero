-- ALREADY APPLIED to the live project on 2026-08-20 (Rounds 224 and 225),
-- in five steps whose end state this file reproduces. Safe to re-run: it
-- rebuilds the pool from the source tables, which is also how to REFRESH
-- it after soccer_player_club_stints or player_market_values change.
--
-- Why the pool is a table and not the view it used to be: the view's
-- computation measured 27.9 seconds (window functions over 80,586 stint
-- rows plus a misplanned nested loop), which is beyond the anon statement
-- timeout, so every fetch from /grade-transfer died and the game was dead
-- in production. The dataset is static history (moves 2010-2023 graded
-- against values three years on), so it is materialized.
--
-- Data rules baked into the rebuild, found the same day:
-- 1. The stints table keys careers by (player_name, nationality), and
--    mononym Brazilians collide: distinct real players merge into one fake
--    career whose stint boundaries fabricate transfers that never happened
--    (a "Levski Sofia -> FC Barcelona" Paulinho). person_key exists on the
--    table but is backfilled for only 9 rows, so it cannot be used yet.
--    Until it is, any (player_name, move_year) that maps to more than one
--    distinct move, in any nationality, is dropped entirely: every kept
--    row is a real move, and the crowd-vote key (player_name, move_year)
--    the game writes is unique.
-- 2. Stint rows repeat the same move with different position labels, so
--    the move identity is collapsed first (one row per name, nationality,
--    year, from, to).
-- 3. Round 225: each move is dated by the SELLING club's last recorded
--    season, which is the year the player actually left. Dating by the
--    buying club's first season, the old rule, ran a year late on the
--    26,130 standard summer moves and up to two late across data holes
--    (Neymar's Santos to Barcelona was shown as 2015; the real year is
--    2013). value_at_move is his value in his final season at the selling
--    club, the honest pre-move number, and value_after is three years on.
--    128 transitions with overlapping stints (negative gaps) are excluded
--    as noise. Winter-window moves remain ambiguous by a few weeks in
--    yearly snapshot data; that is source granularity, not an error to
--    paper over. Zero crowd votes existed when the dating changed, so no
--    vote keys migrated.

BEGIN;

DROP VIEW IF EXISTS public.transfer_grade_pool;
DROP TABLE IF EXISTS public.transfer_grade_pool;

CREATE TABLE public.transfer_grade_pool AS
WITH moves AS (
  SELECT s.player_name, s.nationality, s."position",
         s.club AS from_club,
         s.last_year AS move_year,
         lead(s.club) OVER w AS to_club,
         lead(s.first_year) OVER w AS next_first
  FROM soccer_player_club_stints s
  WINDOW w AS (PARTITION BY s.player_name, s.nationality ORDER BY s.first_year)
), joined AS (
  SELECT m.player_name, m.nationality, m."position", m.from_club, m.to_club, m.move_year,
         (v0.market_value_usd / 1000000)::integer AS value_at_move,
         (v3.market_value_usd / 1000000)::integer AS value_after,
         round(100.0 * (v3.market_value_usd - v0.market_value_usd)::numeric / v0.market_value_usd::numeric)::integer AS pct_change,
         CASE
           WHEN v0.market_value_usd >= 80000000 THEN 'v>=80'
           WHEN v0.market_value_usd >= 40000000 THEN 'v40-79'
           WHEN v0.market_value_usd >= 25000000 THEN 'v25-39'
           ELSE 'v15-24'
         END AS value_band
  FROM moves m
  JOIN player_market_values v0 ON v0.player_name::text = m.player_name AND v0.nationality::text = m.nationality::text AND v0.year = m.move_year
  JOIN player_market_values v3 ON v3.player_name::text = m.player_name AND v3.nationality::text = m.nationality::text AND v3.year = (m.move_year + 3)
  WHERE m.to_club IS NOT NULL AND m.to_club <> m.from_club
    AND m.next_first >= m.move_year
    AND m.move_year >= 2010 AND m.move_year <= 2023
    AND v0.market_value_usd >= 15000000
), one_per_move AS (
  SELECT DISTINCT ON (player_name, nationality, move_year, from_club, to_club) *
  FROM joined
  ORDER BY player_name, nationality, move_year, from_club, to_club, "position"
), solo AS (
  SELECT * FROM one_per_move j
  WHERE NOT EXISTS (
    SELECT 1 FROM one_per_move k
    WHERE k.player_name = j.player_name AND k.move_year = j.move_year
      AND (k.nationality <> j.nationality OR k.from_club <> j.from_club OR k.to_club <> j.to_club)
  )
), ranked AS (
  SELECT solo.player_name, solo.nationality, solo."position", solo.from_club, solo.to_club,
         solo.move_year, solo.value_at_move, solo.value_after, solo.pct_change, solo.value_band,
         percent_rank() OVER (PARTITION BY solo.value_band ORDER BY solo.pct_change) AS pr
  FROM solo
)
SELECT player_name, nationality, "position", from_club, to_club, move_year,
       value_at_move, value_after, pct_change, value_band,
       CASE
         WHEN pr >= 0.85 THEN 'A'
         WHEN pr >= 0.65 THEN 'B'
         WHEN pr >= 0.35 THEN 'C'
         WHEN pr >= 0.15 THEN 'D'
         ELSE 'F'
       END AS actual_grade
FROM ranked;

-- CREATE TABLE AS leaves RLS off, the 2026-07-22 lesson. Close it now.
ALTER TABLE public.transfer_grade_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.transfer_grade_pool FOR SELECT USING (true);

CREATE INDEX idx_transfer_grade_pool_value ON public.transfer_grade_pool (value_at_move DESC);

COMMIT;
