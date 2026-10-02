-- Rollback for the Round 839 review's global_rank plan fix: puts public.global_rank back
-- exactly as pg_get_functiondef printed it on production at 2026-10-01 21:31 UTC, before
-- that file was applied. Not a migration: run it by hand through the Supabase MCP only if
-- the new function misbehaves. Know what it restores: a 30 Days rank card that takes about
-- two seconds for an anonymous visitor.

CREATE OR REPLACE FUNCTION public.global_rank(p_player text, p_period text DEFAULT 'alltime'::text, p_games text[] DEFAULT NULL::text[])
 RETURNS TABLE(rank bigint, total_points numeric, total_players bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
