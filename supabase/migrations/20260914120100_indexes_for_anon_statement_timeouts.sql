-- Round 569: three indexes for the queries that were timing out for anonymous players.
-- Applied to production on 2026-09-14 through the Supabase MCP apply_migration tool;
-- this file is the repo's record of it.
--
-- Found in the live logs on 2026-09-14: 32 "canceling statement due to statement
-- timeout" in 24 hours, surfacing as HTTP 500s on nflfastr_player_stats and
-- player_market_values. Anonymous requests run under statement_timeout=3s, and the
-- site plays signed out, so most players are anonymous. pg_stat_statements showed
-- the worst cases clustering at 2.8 to 3.0 seconds, i.e. queries being cancelled at
-- that cap.
--
-- Measured before and after inside a rolled back transaction, same queries:
--   nflfastr_player_stats where season, recent_team, season_type:
--     3,167 ms sequential scan (134,271 rows discarded to return 199) -> 11 ms index scan.
--     This one alone was OVER the 3 second cap on a cold read. 38,345 calls recorded.
--     After applying, a different season and team (2023, SF) ran in 5 ms.
--   player_market_values where club ilike:
--     181 ms sequential scan (141,343 rows discarded) -> 46 ms trigram bitmap scan.
--     30,367 calls recorded.
--   player_market_values where year and market_value_usd:
--     23 ms sequential scan -> 7 ms bitmap index scan. 5,754 calls, 459 ms mean in
--     production under load.
--
-- Deliberately NOT added: a btree on player_market_values(club). The query that
-- pairs name_folded ilike with club equality already uses the existing name_folded
-- trigram index (17 ms measured), so a fourth index would be write cost for nothing.
-- pg_trgm lives in the public schema on this project, so the operator class is
-- written unqualified, the same way the two existing trigram indexes are. (A first
-- attempt qualified it as extensions.gin_trgm_ops and was refused whole, leaving
-- nothing partial.)

create index if not exists idx_nflfastr_player_stats_season_team_type
  on public.nflfastr_player_stats (season, recent_team, season_type);

create index if not exists idx_player_market_values_club_trgm
  on public.player_market_values using gin (club gin_trgm_ops);

create index if not exists idx_player_market_values_year_value
  on public.player_market_values (year, market_value_usd);

analyze public.nflfastr_player_stats;
analyze public.player_market_values;
