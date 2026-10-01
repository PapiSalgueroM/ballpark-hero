-- Round 839 review: the rank card under the 30 Days tab gets the same plan fix as the board.
--
-- NOT APPLIED when this file was written. The review that wrote it could only read
-- production; the lead applies it (apply_migration with this file's body, then the checks
-- at the bottom).
--
-- WHAT A VISITOR WAITS FOR. The page asks global_leaderboard and global_rank together
-- (Promise.all in src/pages/Leaderboard.tsx), so a window draws when the slower of the two
-- answers. Round 839 fixed the board; global_rank still has the plan the board had.
-- Measured on production 2026-10-01 as a visitor (anon key, 3 second timeout, REST):
--   global_rank month, no filter   1,285 / 1,752 / 1,962 ms   (the board beside it: 535 to 726)
--   global_rank alltime, Soccer    1,144 / 1,154 / 1,359 ms
--   everything else under 1.2 s.
-- 1.96 s is two thirds of the anonymous statement timeout, and when it is crossed the
-- page loses the rank card the same way it used to lose the board.
--
-- WHY, by EXPLAIN (ANALYZE, BUFFERS) of the body with plan_cache_mode = force_generic_plan
-- (the way the function runs it, the period is a parameter):
--   1,354 ms and 426,414 buffers. The only index condition is "day <= today" (the OR chain
--   over p_period cannot become one), and game_denominators' null cap fallback ran as two
--   SubPlans, 910 loops each, 207,000 buffers each. A sort also spilled to disk.
--
-- THE FIX is Round 839's own three moves for the board, minus the cache (global_rank
-- already reads player_ranks for the unfiltered today and all time card):
--   1. the window is a range on the day, from a one row CTE read through scalar
--      subqueries, so the generic plan has an index condition on both ends;
--   2. the denominators are computed once, in a materialized CTE;
--   3. nothing else.
--   Same body as a pg_temp copy, same generic plan: 776 ms and 11,046 buffers.
--
-- WHAT DOES NOT CHANGE, checked old against new on production through a pg_temp copy:
-- 54 cases, 0 differences (top, 100th, a random, Guest and an unknown player; today, week,
-- month, all time, an unknown period and a NULL period; no filter, an empty list, three
-- null cap games and the 36 game Soccer list). The signature and return shape, the cache
-- branch, the Eastern day, the trailing windows (day > today - 7 is day >= today - 6), the
-- tie break, and the NULL period answering nothing (the "p_period is not null" line keeps
-- that; the board treats NULL as all time since Round 839, but nothing sends NULL to either).
--
-- NOT SECURITY DEFINER, same as before.

create or replace function public.global_rank(
  p_player text,
  p_period text default 'alltime',
  p_games text[] default null
)
returns table(rank bigint, total_points numeric, total_players bigint)
language sql
stable
set search_path to 'public'
as $function$
  select r.rank::bigint, r.total_points, r.total_players::bigint
  from public.player_ranks r
  where p_games is null
    and p_period in ('today', 'alltime')
    and r.period = p_period
    and r.player_name = p_player

  union all

  select ranked.rn, round(ranked.pts)::numeric, ranked.cnt
  from (
    with bounds as (
      select b.et_today as et_to,
             case p_period
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
      where (p_games is not null or p_period in ('week', 'month'))
        and p_period is not null
        and gc.score is not null and gc.score > 0 and gc.player_name is not null
        and (p_games is null or gc.game = any(p_games))
        and (gc.created_at at time zone 'America/New_York')::date <= (select et_to from bounds)
        and (gc.created_at at time zone 'America/New_York')::date >= (select et_from from bounds)
      group by gc.player_name, gc.game, (gc.created_at at time zone 'America/New_York')::date, den.max_score
    ),
    totals as (
      select b.player_name, sum(100.0 * b.day_best / b.max_score) as pts
      from best b group by b.player_name
    )
    select t.player_name, t.pts,
           row_number() over (order by t.pts desc, t.player_name asc) as rn,
           count(*) over () as cnt
    from totals t
  ) ranked
  where ranked.player_name = p_player;
$function$;

-- AFTER APPLYING, three read only checks:
--   1. select pg_get_functiondef('public.global_rank(text,text,text[])'::regprocedure);
--      prints this body.
--   2. node scripts/simLeaderboardCache.mjs is green (section 6 asks global_rank too).
--   3. get_advisors (security and performance) shows nothing new.
-- To undo: run ROLLBACK_20261001230000_round_839_global_rank_plan.sql beside this file.
