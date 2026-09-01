-- Round 387, applied 2026-09-01 through the Supabase MCP as
-- round_387_position_and_nationality_tag_views. Kept here so the schema is
-- readable from the repo; the deployed database is the source of truth.
--
-- One row per (player, position tag) and per (player, nationality tag), each
-- with the player's peak value under that tag. Rarity Round's "Name a
-- goalkeeper" dropdown filters player_market_values by position across EVERY
-- row a player has, so a man tagged a winger at his peak and a forward in
-- another year is offered for "Name a forward" and, with a pool keyed to one
-- row per player, refused. The pool that scores him has to mean the same
-- thing, "ever tagged", the way the club pools already mean "ever played
-- for". These are those pools; player_peak_values keeps serving the value
-- only categories and the prominence map.
create or replace view public.player_position_peaks as
  select player_name, position, max(market_value_usd) as peak_value_usd
  from public.player_market_values
  where player_name is not null and market_value_usd is not null and position is not null
  group by player_name, position;

alter view public.player_position_peaks set (security_invoker = true);

comment on view public.player_position_peaks is
  'Round 387. One row per player and position tag with the peak market value under that tag. Rarity Round position pools read this so the scorer accepts every player the position-filtered dropdown offers. Read only, derived entirely from player_market_values.';

create or replace view public.player_nationality_peaks as
  select player_name, nationality, max(market_value_usd) as peak_value_usd
  from public.player_market_values
  where player_name is not null and market_value_usd is not null and nationality is not null
  group by player_name, nationality;

alter view public.player_nationality_peaks set (security_invoker = true);

comment on view public.player_nationality_peaks is
  'Round 387. One row per player and nationality tag with the peak market value under that tag. Rarity Round nationality pools read this so the scorer accepts every player the nationality-filtered dropdown offers. Read only, derived entirely from player_market_values.';

-- Rollback:
--   drop view if exists public.player_position_peaks;
--   drop view if exists public.player_nationality_peaks;
-- and point fetchPositionPool / fetchNationalityPool back at player_peak_values.
