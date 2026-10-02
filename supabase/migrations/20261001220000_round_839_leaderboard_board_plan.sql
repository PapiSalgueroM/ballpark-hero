-- Round 839: the World Leaderboard's board answers inside the anon statement timeout again.
--
-- WHAT A VISITOR SAW. /leaderboard said "No scores yet today. Be the first!" on a day
-- 293 players had scored. Found by the rendered audit of 2026-10-01
-- (docs/audits/LIVE-RENDERED-AUDIT-2026-10-01.md, section f): rpc/global_leaderboard
-- answered 500 with Postgres 57014, "canceling statement due to statement timeout", and
-- the page mapped the failed response to an empty board (fixed in the same round in
-- src/pages/Leaderboard.tsx).
--
-- MEASURED ON PRODUCTION BEFORE THIS RAN, as a visitor (anon key, 3 second timeout):
--   today   500 after 3.7 s      all time   200 in 2.2 s
--   7 days  200 in 0.6 s         30 days    200 in 1.4 s
-- and by EXPLAIN (ANALYZE, BUFFERS) on the function's own body:
--   * with the period written as a literal: 327 ms, an index range scan on the day.
--   * the way the function really runs it (the period is a PARAMETER, so the plan is
--     generic): 2,831 ms and 91,070 buffers. The OR chain over p_period cannot become an
--     index condition when p_period is not known at plan time, so the only index
--     condition left was "day <= today": the whole covering index, 346,000 rows read and
--     thrown away to keep 6,341. That is the timeout.
--   * 79,000 of those buffers were something else: game_denominators is a view whose
--     max_score falls back to a subquery (the game's best stored score) when the cap is
--     null, and joined row by row the planner ran that subquery once per completion
--     (123 loops of 623 rows, twice).
--
-- THE FIX, three changes and no new object:
--   1. The window is a RANGE on the day (from, to), read from a one row CTE through
--      scalar subqueries, so the generic plan gets an index condition on both ends.
--   2. The denominators are computed ONCE (a materialized CTE over the same view), so
--      a null cap costs one subquery per game, not one per completion.
--   3. The unfiltered all time board is read from public.player_ranks, the materialized
--      view pg_cron already refreshes every 5 minutes for the rank card (job
--      refresh-player-ranks). Same ordering (points descending, then name), same
--      rounding, same play count: its definition is this function's own all time
--      query. Reading 740,000 rows per page load to rebuild what is already stored was
--      the 2.2 second all time call, and it grows with every play.
--   Measured with plan_cache_mode = force_generic_plan (the way the function runs):
--   today 49 ms and 1,553 buffers.
--
-- WHAT DOES NOT CHANGE. The signature, the return shape, the Eastern day, the trailing
-- 7 and 30 day windows (day > today - 7 is day >= today - 6), the per game per day best,
-- the cap, the tie break. A sport filter still scans live, including all time for one
-- sport. An unknown period still means all time. The all time board can now trail a
-- play by up to five minutes, the same as the rank card beside it has since Round 370.
--
-- NOT SECURITY DEFINER, same as before: it reads three public read only relations.

create or replace function public.global_leaderboard(
  p_period text default 'alltime',
  p_games text[] default null
)
returns table(rank bigint, player_name text, total_points numeric, games_played bigint)
language sql
stable
set search_path to 'public'
as $function$
  select r.rank::bigint, r.player_name, r.total_points, r.games_played::bigint
  from public.player_ranks r
  where p_games is null
    and coalesce(p_period, 'alltime') not in ('today', 'week', 'month')
    and r.period = 'alltime'
    and r.rank <= 100

  union all

  select live.rank, live.player_name, live.total_points, live.games_played
  from (
    with bounds as (
      select b.et_today as et_to,
             case coalesce(p_period, 'alltime')
               when 'today' then b.et_today
               when 'week'  then b.et_today - 6
               when 'month' then b.et_today - 29
               else '-infinity'::date
             end as et_from
      from (select (now() at time zone 'America/New_York')::date as et_today) b
    ),
    den as materialized (
      select d.game, d.max_score from public.game_denominators d
    ),
    best as (
      select gc.player_name, gc.game,
             (gc.created_at at time zone 'America/New_York')::date as et_day,
             max(least(gc.score, den.max_score))::numeric as day_best, den.max_score
      from public.game_completions gc
      join den on den.game = gc.game
      where (p_games is not null or coalesce(p_period, 'alltime') in ('today', 'week', 'month'))
        and gc.score is not null and gc.score > 0 and gc.player_name is not null
        and (p_games is null or gc.game = any(p_games))
        and (gc.created_at at time zone 'America/New_York')::date <= (select et_to from bounds)
        and (gc.created_at at time zone 'America/New_York')::date >= (select et_from from bounds)
      group by gc.player_name, gc.game, (gc.created_at at time zone 'America/New_York')::date, den.max_score
    ),
    totals as (
      select b.player_name, sum(100.0 * b.day_best / b.max_score) as pts, count(*) as plays
      from best b group by b.player_name
    )
    select row_number() over (order by t.pts desc, t.player_name asc) as rank,
           t.player_name, round(t.pts)::numeric as total_points, t.plays as games_played
    from totals t
    order by t.pts desc, t.player_name asc
    limit 100
  ) live

  order by 1;
$function$;
