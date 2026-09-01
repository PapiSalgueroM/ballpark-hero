-- ROLLBACK for 20260826_leaderboard_score_caps.sql
--
-- Captured from the LIVE database on 2026-08-26 with pg_get_functiondef, before
-- anything was changed, so this is the exact text Postgres itself reports and
-- not a reconstruction from memory. Running this whole file puts the World
-- Leaderboard back exactly as it is today, including the forgery hole the
-- migration exists to close. Only run it if the migration caused a problem.
--
-- The order matters: the functions must stop referencing game_denominators
-- before the view can be dropped.

CREATE OR REPLACE FUNCTION public.global_leaderboard(p_period text DEFAULT 'alltime'::text, p_games text[] DEFAULT NULL::text[])
 RETURNS TABLE(rank bigint, player_name text, total_points numeric, games_played bigint)
 LANGUAGE sql
 STABLE
AS $function$
  with maxes as (
    select game, greatest(max(score), 1)::numeric as max_score
    from public.game_completions
    where score is not null and score > 0
    group by game
  ),
  best as (
    select gc.player_name, gc.game, gc.completed_on,
           max(least(gc.score, m.max_score))::numeric as day_best, m.max_score
    from public.game_completions gc
    join maxes m using (game)
    where gc.score is not null and gc.score > 0 and gc.player_name is not null
      and (p_games is null or gc.game = any(p_games))
      and (p_period <> 'today' or gc.completed_on = (now() at time zone 'utc')::date)
    group by gc.player_name, gc.game, gc.completed_on, m.max_score
  ),
  totals as (
    select b.player_name, sum(100.0 * b.day_best / b.max_score) as pts,
           count(*) as plays
    from best b
    group by b.player_name
  )
  select row_number() over (order by t.pts desc, t.player_name asc) as rank,
         t.player_name, round(t.pts)::numeric as total_points, t.plays as games_played
  from totals t
  order by t.pts desc, t.player_name asc
  limit 100;
$function$;

CREATE OR REPLACE FUNCTION public.global_rank(p_player text, p_period text DEFAULT 'alltime'::text, p_games text[] DEFAULT NULL::text[])
 RETURNS TABLE(rank bigint, total_points numeric, total_players bigint)
 LANGUAGE sql
 STABLE
AS $function$
  with maxes as (
    select game, greatest(max(score), 1)::numeric as max_score
    from public.game_completions
    where score is not null and score > 0
    group by game
  ),
  best as (
    select gc.player_name, gc.game, gc.completed_on,
           max(least(gc.score, m.max_score))::numeric as day_best, m.max_score
    from public.game_completions gc
    join maxes m using (game)
    where gc.score is not null and gc.score > 0 and gc.player_name is not null
      and (p_games is null or gc.game = any(p_games))
      and (p_period <> 'today' or gc.completed_on = (now() at time zone 'utc')::date)
    group by gc.player_name, gc.game, gc.completed_on, m.max_score
  ),
  totals as (
    select b.player_name, sum(100.0 * b.day_best / b.max_score) as pts
    from best b
    group by b.player_name
  ),
  ranked as (
    select t.player_name, t.pts,
           row_number() over (order by t.pts desc, t.player_name asc) as rn,
           count(*) over () as cnt
    from totals t
  )
  select r.rn as rank, round(r.pts)::numeric as total_points, r.cnt as total_players
  from ranked r
  where r.player_name = p_player;
$function$;

drop view if exists public.game_denominators;
drop table if exists public.game_score_caps;
