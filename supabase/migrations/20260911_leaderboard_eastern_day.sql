-- Round 537 (built as 528, see docs/WORKBOARD.md): the shared leaderboard's day ends at midnight Eastern, not 8pm.
--
-- WHAT WAS WRONG. public.game_completions.completed_on defaults to
-- ((now() AT TIME ZONE 'utc'))::date and global_leaderboard filtered the same
-- UTC date, so the writer and the reader agreed with each other and disagreed
-- with the rest of the site: getTodayET() is what 74 source files use, and
-- Round 301 moved the Games Today clock to Eastern specifically. The
-- leaderboard was never brought along, so its "Today" rolled over at 20:00
-- Eastern (00:00 UTC), in the middle of the busiest hours on the site.
--
-- MEASURED ON PRODUCTION BEFORE THIS RAN, not argued:
--   * 72,460 of 356,808 completions over 30 days (20.3%) sat under a UTC day
--     that was not their Eastern day. Grouped by Eastern hour the signature was
--     exact with no noise in it: every play from 20:00 to 23:59 filed to the
--     wrong day, every play before 20:00 filed correctly.
--   * Sampled live at 23:48 Eastern, inside the broken window: the Today board
--     showed 111 players when 407 had played that Eastern day, counting 2,844
--     of 14,933 plays. It was not merely short, it was wrong about who was
--     winning. The day's real top three (754, 599 and 539 points) did not
--     appear at all and the player shown first was really fourth.
--
-- THE SECOND BUG, found while fixing the first. The "best per game per day"
-- grouping also keyed on completed_on, so one Eastern evening spent on one game
-- either side of 20:00 counted as TWO days and both day-bests were summed.
-- 1,087 of 19,799 player-game-days (5.49%) were split that way, inflating the
-- all time board. Fixing only the filter and not the grouping would have left
-- that, and worse, would have split a single Eastern day inside the "today"
-- window, so both move here together.
--   Impact of the grouping correction, measured before applying: of 5,494
--   players, 756 see their all time total change, by 2.4 points on average,
--   worst case 378. That is inflation being removed, and no stored value is
--   rewritten: these totals are derived on read, so nothing is clawed back
--   from anybody's row.
--
-- WHAT IS DELIBERATELY NOT DONE. completed_on is left exactly as it is on every
-- one of the 356k+ stored rows, and its default is left alone. The Eastern day
-- is read from created_at, a real timestamptz, at query time. That corrects
-- history as well as the future without rewriting a single row and without
-- leaving completed_on meaning UTC before a date and Eastern after it.
--
-- PERFORMANCE, because this is the query that once nearly took the instance
-- down. Round 370 exists because global_rank was burning 1.9 billion buffer
-- blocks over 1,541,353 calls and Supabase alerted on the Disk IO budget.
-- game_completions is indexed on completed_on twice and not at all on
-- created_at, so switching the filter without an index would have dropped this
-- to a sequential scan over the whole table. The index below covers the new
-- expression. It is allowed to exist because timezone(text, timestamptz) is
-- IMMUTABLE in Postgres (checked against pg_proc.provolatile rather than
-- assumed; it is the one argument session timezone form that is only STABLE).

-- 1. The index the rewritten filter needs, mirroring idx_game_completions_day_game.
create index if not exists idx_game_completions_et_day_game
  on public.game_completions (((created_at at time zone 'America/New_York')::date), game)
  where score is not null and score > 0;

-- 2. The board itself, now Eastern, and now with the Week and Month views spec
--    section 104 asks for. Week and Month are trailing windows (last 7 and last
--    30 Eastern days) rather than calendar weeks, and the UI labels them that
--    way, because a trailing window is what the phrase "this week" means to
--    somebody checking whether they are climbing.
--    An unrecognised p_period still behaves as alltime, exactly as before.
create or replace function public.global_leaderboard(p_period text default 'alltime'::text, p_games text[] default null::text[])
 returns table(rank bigint, player_name text, total_points numeric, games_played bigint)
 language sql
 stable
 set search_path to 'public'
as $function$
  with bounds as (
    select (now() at time zone 'America/New_York')::date as et_today
  ),
  best as (
    select gc.player_name, gc.game,
           (gc.created_at at time zone 'America/New_York')::date as et_day,
           max(least(gc.score, d.max_score))::numeric as day_best, d.max_score
    from public.game_completions gc
    join public.game_denominators d on d.game = gc.game
    cross join bounds b
    where gc.score is not null and gc.score > 0 and gc.player_name is not null
      and (p_games is null or gc.game = any(p_games))
      and (gc.created_at at time zone 'America/New_York')::date <= b.et_today
      and (
        p_period not in ('today', 'week', 'month')
        or (p_period = 'today' and (gc.created_at at time zone 'America/New_York')::date = b.et_today)
        or (p_period = 'week'  and (gc.created_at at time zone 'America/New_York')::date > b.et_today - 7)
        or (p_period = 'month' and (gc.created_at at time zone 'America/New_York')::date > b.et_today - 30)
      )
    group by gc.player_name, gc.game, (gc.created_at at time zone 'America/New_York')::date, d.max_score
  ),
  totals as (
    select b.player_name, sum(100.0 * b.day_best / b.max_score) as pts, count(*) as plays
    from best b group by b.player_name
  )
  select row_number() over (order by t.pts desc, t.player_name asc) as rank,
         t.player_name, round(t.pts)::numeric as total_points, t.plays as games_played
  from totals t
  order by t.pts desc, t.player_name asc
  limit 100;
$function$;

-- 3. One player's rank. The cached path still serves the two periods the
--    materialized view holds, which are the ones every page load asks for;
--    week, month and the per sport filters take the live path, which is the
--    leaderboard screen only and is bounded by the same index.
create or replace function public.global_rank(p_player text, p_period text default 'alltime'::text, p_games text[] default null::text[])
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
    select t.player_name, t.pts,
           row_number() over (order by t.pts desc, t.player_name asc) as rn,
           count(*) over () as cnt
    from (
      select b.player_name, sum(100.0 * b.day_best / b.max_score) as pts
      from (
        select gc.player_name, gc.game,
               (gc.created_at at time zone 'America/New_York')::date as et_day,
               max(least(gc.score, d.max_score))::numeric as day_best, d.max_score
        from public.game_completions gc
        join public.game_denominators d on d.game = gc.game
        where (p_games is not null or p_period in ('week', 'month'))
          and gc.score is not null and gc.score > 0 and gc.player_name is not null
          and (p_games is null or gc.game = any(p_games))
          and (gc.created_at at time zone 'America/New_York')::date <= (now() at time zone 'America/New_York')::date
          and (
            p_period not in ('today', 'week', 'month')
            or (p_period = 'today' and (gc.created_at at time zone 'America/New_York')::date = (now() at time zone 'America/New_York')::date)
            or (p_period = 'week'  and (gc.created_at at time zone 'America/New_York')::date > (now() at time zone 'America/New_York')::date - 7)
            or (p_period = 'month' and (gc.created_at at time zone 'America/New_York')::date > (now() at time zone 'America/New_York')::date - 30)
          )
        group by gc.player_name, gc.game, (gc.created_at at time zone 'America/New_York')::date, d.max_score
      ) b
      group by b.player_name
    ) t
  ) ranked
  where ranked.player_name = p_player;
$function$;

-- 4. The cache the hot path reads, rebuilt on the same Eastern day. Swapped
--    inside this transaction rather than dropped and recreated in the open, so
--    global_rank never sees a missing view and no visitor gets a blank rank.
--    The unique index keeps its name so the refresh-player-ranks cron job's
--    REFRESH MATERIALIZED VIEW CONCURRENTLY keeps working untouched, and the
--    grants are replicated exactly (anon, authenticated and service_role all
--    held full privileges, per pg_class.relacl read before this ran).
create materialized view public.player_ranks_next as
  with scored as (
    select gc.player_name,
           gc.game,
           (gc.created_at at time zone 'America/New_York')::date as et_day,
           max(least(gc.score::numeric, d.max_score)) as day_best,
           d.max_score
    from public.game_completions gc
    join public.game_denominators d on d.game = gc.game
    where gc.score is not null and gc.score > 0 and gc.player_name is not null
      and (gc.created_at at time zone 'America/New_York')::date <= (now() at time zone 'America/New_York')::date
    group by gc.player_name, gc.game, (gc.created_at at time zone 'America/New_York')::date, d.max_score
  ),
  totals as (
    select 'alltime'::text as period, scored.player_name,
           sum(100.0 * scored.day_best / scored.max_score) as pts,
           count(*) as plays
    from scored group by scored.player_name
    union all
    select 'today'::text as period, scored.player_name,
           sum(100.0 * scored.day_best / scored.max_score) as pts,
           count(*) as plays
    from scored
    where scored.et_day = (now() at time zone 'America/New_York')::date
    group by scored.player_name
  )
  select period, player_name, round(pts) as total_points, plays as games_played,
         row_number() over (partition by period order by pts desc, player_name) as rank,
         count(*) over (partition by period) as total_players
  from totals;

create unique index player_ranks_next_pkey on public.player_ranks_next using btree (period, player_name);
grant all on public.player_ranks_next to anon, authenticated, service_role;

drop materialized view public.player_ranks;
alter materialized view public.player_ranks_next rename to player_ranks;
alter index public.player_ranks_next_pkey rename to player_ranks_pkey;
