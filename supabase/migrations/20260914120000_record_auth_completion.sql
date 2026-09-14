-- Round 569: a signed in player's completion is saved in ONE atomic call.
--
-- WHAT WAS WRONG, measured on 2026-09-14. src/lib/completions.ts
-- saveAuthCompletion did six sequential round trips: insert the game score,
-- insert the daily completion, READ user_scores, count today's games, then
-- WRITE total_points back as the value it read plus the new score, then read
-- and write the best score. Two failures follow from that shape, and the
-- live data carries both fingerprints:
--
--   1. An interrupted save. The game score row lands, the player closes the
--      tab, and the total is never updated. Many accounts are short by
--      exactly their final play's score (1,000 short with a last play of
--      1,000; 600 and 600; 400 and 400) with no two plays near each other.
--   2. A lost update. Two saves read the same total and both write total
--      plus their own score, so one score vanishes. The heaviest accounts
--      carry hundreds of plays within five seconds of the previous one and
--      shortfalls that match no single score.
--
--   34 of 488 signed in accounts hold fewer total points than their own
--   recorded plays add up to, 19,857 points in all, worst single account
--   3,170. saveAuthCompletion is the ONLY writer of total_points and of
--   user_game_scores (no trigger, no other function), so the two can only
--   disagree through those two failures.
--
-- It also produced noise that buried real errors: 177 duplicate key
-- violations a day, because the daily completion was de-duplicated by
-- letting the insert FAIL on its unique constraint, and 57 PostgREST 406s a
-- day from .single() against a player's first ever row.
--
-- THE FIX. One call, one transaction. total_points is incremented in place
-- by INSERT ... ON CONFLICT DO UPDATE, which locks the row, so concurrent
-- saves serialise and every one of them adds. The daily completion uses ON
-- CONFLICT DO NOTHING. The best score only updates when it improves.
--
-- SECURITY. SECURITY INVOKER, so the function runs with exactly the caller's
-- row level security, which on all four tables is `auth.uid() = user_id`.
-- The user comes from auth.uid() and is NEVER a parameter, so nobody can
-- credit another account. It runs fixed SQL only (see the exec_sql incident
-- of 2026-08-25 in CLAUDE.md). EXECUTE is granted to authenticated only.
--
-- WHAT IT DELIBERATELY DOES NOT DO. It does not clamp the score against
-- game_score_caps: today's client does not clamp either, and changing what a
-- play is worth is a scoring decision, not a save fix. It does not repair
-- the 19,857 missing points: how historical points are treated is already an
-- open owner decision (PROJECT-STATE, the repeat saves across 152 accounts),
-- and restoring these would move the same public board he has not yet
-- decided about. The repair is folded into that decision instead.
--
-- One behavioural improvement, stated so it is not a surprise: the old
-- client computed "yesterday" with local time setDate and then a UTC
-- toISOString, which could pick the wrong day for a player near midnight
-- outside UTC. This uses the UTC date on both sides, which is what the old
-- code meant.

create or replace function public.record_auth_completion(
  p_game_slug text,
  p_score integer,
  p_correct integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_games integer;
  v_total integer;
  v_streak integer;
  v_longest integer;
begin
  if v_user is null then
    raise exception 'record_auth_completion needs a signed in user';
  end if;
  if p_game_slug is null or length(p_game_slug) = 0 then
    raise exception 'record_auth_completion needs a game slug';
  end if;

  insert into public.user_game_scores (user_id, game_type, score, correct_answers, puzzle_date)
  values (v_user, p_game_slug, coalesce(p_score, 0), coalesce(p_correct, 0), v_today);

  insert into public.daily_completions (user_id, game_slug, date)
  values (v_user, p_game_slug, v_today)
  on conflict (user_id, game_slug, date) do nothing;

  select count(*) into v_games
  from public.daily_completions
  where user_id = v_user and date = v_today;

  insert into public.user_scores as s
    (user_id, total_points, games_played_today, last_played_at, updated_at, current_streak, longest_streak)
  values
    (v_user, coalesce(p_score, 0), greatest(v_games, 1), now(), now(), 1, 1)
  on conflict (user_id) do update set
    total_points = s.total_points + excluded.total_points,
    games_played_today = excluded.games_played_today,
    current_streak = case
      when (s.last_played_at at time zone 'utc')::date = v_today then coalesce(s.current_streak, 0)
      when (s.last_played_at at time zone 'utc')::date = v_today - 1 then coalesce(s.current_streak, 0) + 1
      else 1
    end,
    longest_streak = greatest(
      coalesce(s.longest_streak, 0),
      case
        when (s.last_played_at at time zone 'utc')::date = v_today then coalesce(s.current_streak, 0)
        when (s.last_played_at at time zone 'utc')::date = v_today - 1 then coalesce(s.current_streak, 0) + 1
        else 1
      end
    ),
    last_played_at = now(),
    updated_at = now()
  returning total_points, current_streak, longest_streak into v_total, v_streak, v_longest;

  insert into public.user_best_scores as b (user_id, game_type, best_score)
  values (v_user, p_game_slug, coalesce(p_score, 0))
  on conflict (user_id, game_type) do update set
    best_score = excluded.best_score,
    achieved_at = now()
  where excluded.best_score > b.best_score;

  return jsonb_build_object(
    'total_points', v_total,
    'current_streak', v_streak,
    'longest_streak', v_longest,
    'games_played_today', greatest(v_games, 1)
  );
end;
$$;

revoke all on function public.record_auth_completion(text, integer, integer) from public;
revoke all on function public.record_auth_completion(text, integer, integer) from anon;
grant execute on function public.record_auth_completion(text, integer, integer) to authenticated;
