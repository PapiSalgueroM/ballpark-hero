-- Round 387, applied 2026-09-01 through the Supabase MCP as
-- round_387_peak_view_from_peak_row. Kept here so the schema is readable from
-- the repo; the deployed database is the source of truth.
--
-- The peak view carries the position and nationality of the row that earned
-- the peak, not of the newest row. person_key is NULL on every row of
-- player_market_values, so one name is one career and the Round 367 view was a
-- merge of two men for a shared name: Claudio Bravo's $16M (the Chilean
-- goalkeeper at Barcelona) under the Argentine left-back's position and
-- nationality from his newer rows, so "Name a goalkeeper" refused him.
--
-- The search dropdown dedupes by the most valuable row (ties by the most recent
-- year), so that row is what a player is shown; the view now reads the same
-- row, and the two agree by construction. Measured before: 151 players whose
-- view position differed from their peak row's, 64 whose nationality did. Same
-- four columns in the same order, so nothing that reads the view changes shape.
-- Pool sizes move slightly (Centre-Back 2,381 to 2,404, Right Winger 2,105 to
-- 2,096, Goalkeeper stays 2,270). The casts keep the unbounded varchar type
-- the array_agg version produced: CREATE OR REPLACE VIEW may not change a
-- column's type, and the first attempt without them was refused for exactly
-- that ("cannot change data type of view column nationality").
create or replace view public.player_peak_values as
  select distinct on (player_name)
    player_name,
    market_value_usd as peak_value_usd,
    nationality::character varying as nationality,
    position::character varying as position
  from public.player_market_values
  where player_name is not null and market_value_usd is not null
  order by player_name, market_value_usd desc, year desc nulls last, id desc;

-- Round 361 raised exactly this as an ERROR on a view created without it.
alter view public.player_peak_values set (security_invoker = true);

comment on view public.player_peak_values is
  'Round 367, reshaped in Round 387. One row per player: the peak market value and the nationality and position of the row that earned it (value, then year, then id), which is the row the search dropdown shows. Exists so Rarity Round can read a whole category pool instead of the top 1,000 rows of an all-years table. Read only, derived entirely from player_market_values.';

-- Rollback: re-apply 20260831_player_peak_values_view.sql, which restores the
-- newest-row definition with the same four columns.
