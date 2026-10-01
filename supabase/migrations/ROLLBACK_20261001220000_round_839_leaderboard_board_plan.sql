-- Rollback for Round 839: puts public.global_leaderboard back exactly as pg_get_functiondef
-- printed it on production at 2026-10-01 21:10 UTC, before the round ran. Not a migration:
-- run it by hand through the Supabase MCP only if the Round 839 function misbehaves.
-- Know what it restores: the Today board answering 57014 for anonymous visitors.

CREATE OR REPLACE FUNCTION public.global_leaderboard(p_period text DEFAULT 'alltime'::text, p_games text[] DEFAULT NULL::text[])
 RETURNS TABLE(rank bigint, player_name text, total_points numeric, games_played bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
