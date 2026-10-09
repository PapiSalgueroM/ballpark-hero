-- Round 1145: Stat Detective showed a "Career span" built only from the seasons
-- the page fetches, and it fetches rows with minutes >= 500. A season under 500
-- minutes did not exist for it, so a man who faded out on the bench lost the end
-- of his career on screen. A player reported one on 2026-10-09 (shown 1990-1996,
-- real rows 1989-90 to 2000-01). Measured read only that morning:
-- bref_nba_player_seasons holds 30,462 rows and 4,774 names, the page reads
-- 19,938 of them, and 1,845 of 2,973 profiles showed a span that was not the
-- career (1,432 ended too early, 816 started too late).
--
-- This view is the career: the first and last season a name has ANY row for,
-- whatever the minutes. season is text like '1989-90', so min and max sort in
-- season order. One row per name, 4,774 rows today, read by the page in pages
-- of 1000. Read only, security_invoker so the base table's public read policy
-- is what applies.
--
-- NOT APPLIED BY THE BUILDER. The lead applies it before the page that reads it
-- ships; without it the page fails closed into its retry state.

create or replace view public.bref_nba_career_spans with (security_invoker = true) as
  select player_name, min(season) as first_season, max(season) as last_season, count(*)::int as rows
  from public.bref_nba_player_seasons group by player_name;
grant select on public.bref_nba_career_spans to anon, authenticated;
