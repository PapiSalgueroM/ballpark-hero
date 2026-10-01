-- Round 716: today's standing on a daily game's result, counted in the
-- database. ADDS ONE READ ONLY FUNCTION, public.daily_score_standing. It
-- changes no table, no row, no policy and no other function.
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The release manager applies it
-- through the Supabase MCP after review. Until it is applied the client's
-- call fails and the panel stays hidden, which is the same thing a player
-- sees on a quiet day, so nothing breaks in the gap.
--
-- WHAT WAS WRONG. src/components/game/PostGameStats.tsx ("better than X% of
-- players today") selected every score row for the game straight from
-- user_game_scores, on the UTC date. That table holds signed in players only
-- (about 500 accounts), so the panel described a small slice of the day and
-- called it everyone, on a day that ended at 8pm Eastern while every daily
-- puzzle turns over at midnight Eastern. It also shipped the day's rows to the
-- phone to count them, which is the silent 1,000 row truncation Round 361
-- found in Most Played Today.
--
-- WHAT THIS DOES. Counts the day in game_completions, which gets a row from
-- every visitor, signed in or not (src/lib/completions.ts), and returns five
-- numbers and nothing else: players, how many of the others scored below the
-- viewer, the median, the top score, and the count in each bucket. Never a
-- row, never a name.
--
--   The day is the Eastern day, the one getTodayET and the leaderboard use
--   (20260911_leaderboard_eastern_day.sql). completed_on (a UTC date) narrows
--   the scan to two dates through idx_game_completions_day_game; the Eastern
--   date of created_at picks the exact day. The ET day index is partial on
--   score > 0 and a lost daily records 0, which has to count, so it is not
--   used.
--   A player counts once, at their best that day, the rule the leaderboard
--   uses for a player's day.
--   The viewer is taken out by name (p_player, the handle their own row was
--   written under) and put back as p_score, so the standing is the same
--   whether or not their own insert has landed yet. Both halves come from the
--   client, and both only move the viewer's own placement: nothing here writes.
--   Buckets are the game's own scale, sent as ascending lower edges
--   (src/lib/dailyStanding.ts builds them from each game's recorded score
--   ceiling). Bucket i holds scores from edge i up to below edge i + 1; the
--   first also takes anything under it and the last anything over it, so the
--   counts always add up to players. Anything but 2 to 12 strictly ascending
--   whole edges returns no row.
--   The game must be on Round 360's allowlist (game_score_caps), the same
--   fence most_played_today keeps, so an invented key reads nothing.
--   Under 20 players, counting the viewer, it returns no row at all. The
--   client holds the same floor (DAILY_STANDING_MIN_PLAYERS), and
--   scripts/simDailyStanding.mjs fails if the two ever differ.
--
-- A fixed SQL body, no dynamic SQL, SECURITY INVOKER: it reads with the
-- caller's rights, and game_completions' "Public read completions" policy is
-- what lets anon read it today.
--
-- CHECKED READ ONLY ON PRODUCTION, 2026-09-30, with the body inlined as a
-- SELECT (nothing created): club-manager today, edges {0,30,60,90,120},
-- p_score 50, a name nobody has, returned players 54, below 21, median 75,
-- top 130, buckets {19,3,8,8,16}. An independent count of the same day gave
-- 53 other players, 21 below 50, 19 under 30 and 16 at 120 or more, and the
-- buckets add up to 54. Footle, the same day, returned no row: in the 30 days
-- to 2026-09-30 no daily puzzle game reached 20 players on any Eastern day
-- (Footle's best was 9), so today this panel is hidden everywhere until one
-- does.
create or replace function public.daily_score_standing(
  p_game text,
  p_edges integer[],
  p_score integer,
  p_player text default null
)
returns table (players integer, below integer, median numeric, top integer, bucket_counts integer[])
language sql
stable
security invoker
set search_path = public
as $$
  with today as (
    select (now() at time zone 'America/New_York')::date as d
  ),
  edges as (
    select p_edges as e, coalesce(array_length(p_edges, 1), 0) as n
  ),
  others as (
    select max(gc.score) as best
    from public.game_completions gc
    cross join today t
    where gc.game = p_game
      and gc.completed_on in (t.d, t.d + 1)
      and (gc.created_at at time zone 'America/New_York')::date = t.d
      and gc.score is not null
      and gc.player_name is not null
      and gc.player_name is distinct from p_player
    group by gc.player_name
  ),
  everyone as (
    select best from others
    union all
    select p_score
  )
  select
    count(*)::integer,
    (select count(*) from others o where o.best < p_score)::integer,
    percentile_cont(0.5) within group (order by ev.best)::numeric,
    max(ev.best)::integer,
    (select array_agg((select count(*) from everyone x
                        where (i = 1 or x.best >= ed.e[i])
                          and (i = ed.n or x.best < ed.e[i + 1]))::integer order by i)
       from generate_series(1, ed.n) as i)
  from everyone ev
  cross join edges ed
  where p_score is not null
    and exists (select 1 from public.game_score_caps c where c.game = p_game)
    and ed.n between 2 and 12
    and array_position(ed.e, null) is null
    and not exists (select 1 from generate_series(2, ed.n) as j where ed.e[j] <= ed.e[j - 1])
  group by ed.e, ed.n
  having count(*) >= 20;
$$;

revoke all on function public.daily_score_standing(text, integer[], integer, text) from public;
grant execute on function public.daily_score_standing(text, integer[], integer, text) to anon, authenticated;
