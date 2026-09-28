-- Round 648, file 1 of 2: the save adds what a play adds to the profile's
-- rule, one row per game per Eastern day, the day's best, capped.
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT, and never run against any database
-- by it: no pass of this round had a database session. The release manager
-- applies it through the Supabase MCP (apply_migration) after review, and runs
-- get_advisors afterwards as the database rules require. It FAILS CLOSED:
-- every precondition below is asserted inside the same block that makes the
-- change, and a failed one raises before anything is written, however the
-- file is run.
--
-- TWO FILES, TWO TRANSACTIONS, IN THIS ORDER.
--   1. This file replaces record_auth_completion. apply_migration runs it as
--      one transaction, and it COMMITS before file 2 starts.
--   2. 20260928_round_648_profile_recompute.sql recomputes every stored total
--      by the rule, under an exclusive lock on user_scores. It refuses unless
--      the save this file writes is the committed one.
-- They were one file until the fix of 2026-09-28. In one transaction the new
-- save is not visible to anyone until the commit, so every save that queued
-- behind the recompute's lock ran the OLD committed save, added its raw score
-- on top of the recomputed total, and left that total off the rule. Committed
-- first, the new save is the one those queued saves run.
--
-- =====================================================================
-- WHAT WAS WRONG
-- =====================================================================
-- record_auth_completion (20260914120000_record_auth_completion.sql) adds
-- p_score to user_scores.total_points exactly as the client sent it. The
-- owner directed recompute of 2026-09-19 (docs/PROJECT-STATE.md, the
-- decisions list, item 5, RESOLVED) rebuilt every total at M, 06:20 UTC that
-- morning, to one row per game per day, the day's best, capped by
-- game_denominators, which took out the per match Club Manager rows and the
-- Round 399 reload repeats. Every save since M has added its raw score again:
-- a second Club Manager season the same day, a replayed daily, all in full.
-- Round 644's migration measured that model (the rule over the plays before
-- M, plus every play since M added raw) at 545 of 545 accounts and left the
-- raw adds since M to this round by name.
--
-- The first draft of this round summed EVERY record clamped at its cap. That
-- would have undone the owner's recompute: the leak rows it removed (80,246 of
-- the top account's 87,800 points were per match Club Manager rows, and 1,516
-- same day repeat saves held 596,072 points) are still in user_game_scores,
-- and a cap of 130 on a Club Manager match row trims almost none of them.
--
-- =====================================================================
-- THE RULE (src/lib/pointsRule.ts is the same rule, for the page)
-- =====================================================================
--   total = the sum over (game_type, Eastern day) of least(max(score), cap)
--
-- THE DAY IS THE EASTERN DAY of the record's created_at,
--   (created_at at time zone 'America/New_York')::date
-- the expression Round 537 moved the World Leaderboard to
-- (20260911_leaderboard_eastern_day.sql; timezone(text, timestamptz) is
-- IMMUTABLE, as that file checked). NOT puzzle_date: the save writes it as the
-- UTC date, and 537 measured 20.3% of plays filed under a UTC day that was not
-- their Eastern day. Under it Monday's daily played at 21:00 Eastern and
-- Tuesday's at 18:00 share a day and one of them earns nothing, while two Club
-- Manager seasons at 19:50 and 20:10 Eastern are two days and both pay. The
-- save still writes puzzle_date, the daily mark and the streak on the UTC
-- date exactly as Round 569 did; only the points rule reads the Eastern day.
-- That is one difference from the 2026-09-19 recompute, which grouped by
-- puzzle_date.
--
-- The cap is read from public.game_score_caps, the TABLE: greatest(max_score,
-- 1) where max_score is set. A row whose max_score is NULL has no ceiling on
-- record and its day's best counts as recorded; a game with no row is not on
-- the allowlist and counts nothing. That is the other difference from
-- 2026-09-19: that recompute joined the game_denominators VIEW, whose NULL cap
-- fallback is a 99th percentile over game_completions, the scan Round 370 took
-- off the page path for Disk IO. The page reads the table (it must not run
-- that percentile on a profile view), so the database reads the same table,
-- or the two totals would not be the same number. After Round 646 the only
-- scored games left with a NULL cap are list-quiz and higher-lower-transfers;
-- by the percentile's own definition it clamped about one play in a hundred
-- of theirs.
--
-- The cap is a ceiling here, not a divisor. The World Leaderboard scores a
-- game day as 100 * best / cap; the profile total, like the recompute it
-- continues, adds the capped best itself. So a game whose cap is not a real
-- ceiling (pack-battle at 54,000,000 and sports-millionaire at 1,000,000,
-- both left by Round 646 until they have a scale of their own) counts its
-- day's best up to that cap. What keeps a Pack Battle pack's banked dollars
-- off the stored total is the insert policy on user_game_scores, which
-- refuses any score above 100,000 and with it the whole save (this function
-- is SECURITY INVOKER); the browser's own tally mirrors that bound.
--
-- =====================================================================
-- ORDER AND PRECONDITIONS, each asserted below before any write
-- =====================================================================
--   1. Round 646 is applied (private.r646_caps_bak, its backup, exists), so
--      the caps are each game's real ceiling. Round 646 itself goes on only
--      after Round 647 is published.
--   2. Round 644 is applied and finished: its part 1 has run, and its part 2
--      has nothing left to divide (no soccer-career row since P above 100 in
--      either table). Once this file replaces record_auth_completion, Round
--      644 part 2's md5 guard refuses to run for good, by design, so its last
--      rerun has to come first.
--   3. record_auth_completion is the Round 569 definition Round 644
--      fingerprinted (its md5 equals private.r644_state.raw_add_md5), or this
--      file's own on a rerun. Anything else is a definition nobody has
--      reviewed against this file: merge by hand.
--   4. game_score_caps is not empty (an empty allowlist would zero every
--      total), and authenticated may execute the two catalog functions the
--      new save takes its lock with.
--   Then the save is replaced, the transaction commits, and file 2 follows.
--
-- Everything else is exactly the Round 569 function: SECURITY INVOKER, the
-- player from auth.uid() and never a parameter, a pinned search_path, the in
-- place increment that serialises racing saves, the conflict safe daily
-- mark, a best that only rises, EXECUTE for authenticated only.
-- scripts/simAuthSave.mjs section 3 holds every migration that defines the
-- function to those properties, and scripts/simProfileTotal.mjs section 3
-- holds this file and file 2 to the rule.
--
-- THE ADD. The play's game day was worth least(best so far, cap) before this
-- save and least(greatest(best so far, score), cap) after it; the save adds
-- the difference, which is never negative. The first play of a game on an
-- Eastern day adds its capped score, a better one later that day adds what it
-- beats the best by, a worse one adds nothing. The play's own day is the
-- Eastern day of now(), which is the created_at its row is stamped with.
--
-- THE LOCK. Two saves of one player for one game on one day would each read
-- the day's best without seeing the other's uncommitted row, and both would
-- add. A transaction advisory lock keyed on the player is taken before the
-- read, so the second save waits for the first to commit and then reads its
-- row (each statement in a plpgsql function takes a fresh snapshot under
-- READ COMMITTED). It is released at commit. The day's best is read through
-- the index on user_id: one player's rows, filtered to the game and the day.
do $r648_part1$
declare
  v_p timestamptz;
  v_md5_569 text;
  v_def text;
  v_left integer;
begin
  if to_regclass('public.game_score_caps') is null then
    raise exception 'Round 648: public.game_score_caps does not exist. Nothing was changed.';
  end if;
  if not exists (select 1 from public.game_score_caps) then
    raise exception 'Round 648: public.game_score_caps is empty, and an empty allowlist would zero every total. Nothing was changed.';
  end if;
  if to_regclass('private.r646_caps_bak') is null then
    raise exception 'Round 648: Round 646 has not been applied (private.r646_caps_bak does not exist), so the caps are not yet each game''s real ceiling. Apply Round 646 first. Nothing was changed.';
  end if;
  if to_regclass('private.r644_state') is null then
    raise exception 'Round 648: Round 644 has not been applied (private.r644_state does not exist). Apply it, and rerun its part 2 for the last time, first. Nothing was changed.';
  end if;
  select publish_time, raw_add_md5 into v_p, v_md5_569
    from private.r644_state
   where id = 1 and part1_done_at is not null;
  if v_p is null or v_md5_569 is null then
    raise exception 'Round 648: Round 644 part 1 has not run, so there is no fingerprint of the Round 569 save to check against. Nothing was changed.';
  end if;
  select (select count(*) from public.user_game_scores
           where game_type = 'soccer-career' and created_at >= v_p and score > 100)
       + (select count(*) from public.game_completions
           where game = 'soccer-career' and created_at >= v_p and score > 100)
    into v_left;
  if v_left > 0 then
    raise exception 'Round 648: Round 644 part 2 still has % soccer-career rows to divide. Rerun Round 644 part 2 first: once this file replaces record_auth_completion its md5 guard refuses to run for good. Nothing was changed.', v_left;
  end if;
  v_def := pg_get_functiondef('public.record_auth_completion(text,integer,integer)'::regprocedure);
  if md5(v_def) is distinct from v_md5_569 and position('round 648 profile rule (eastern day)' in lower(v_def)) = 0 then
    raise exception 'Round 648: record_auth_completion is neither the Round 569 definition Round 644 fingerprinted nor this file''s own, so something else has changed it since. Merge by hand. Nothing was changed.';
  end if;
  if not has_function_privilege('authenticated', 'pg_catalog.pg_advisory_xact_lock(bigint)', 'execute')
     or not has_function_privilege('authenticated', 'pg_catalog.hashtextextended(text,bigint)', 'execute') then
    raise exception 'Round 648: authenticated cannot execute pg_advisory_xact_lock(bigint) or hashtextextended(text,bigint), which the new save takes its per player lock with. Nothing was changed.';
  end if;

  execute $fn$
create or replace function public.record_auth_completion(
  p_game_slug text,
  p_score integer,
  p_correct integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $body$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_day date := (now() at time zone 'America/New_York')::date;
  v_score integer := coalesce(p_score, 0);
  v_games integer;
  v_total integer;
  v_streak integer;
  v_longest integer;
  v_listed boolean;
  v_cap integer;
  v_before integer;
  v_after integer;
  v_add integer;
begin
  if v_user is null then
    raise exception 'record_auth_completion needs a signed in user';
  end if;
  if p_game_slug is null or length(p_game_slug) = 0 then
    raise exception 'record_auth_completion needs a game slug';
  end if;

  /* Round 648 profile rule (Eastern day). One save of this player at a time
     from here to the commit, so the day's best read below sees every earlier
     save. */
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('record_auth_completion:' || v_user::text, 0));

  /* The game's cap from the table the page reads: a row with a cap, a row
     with no ceiling on record (NULL), or no row at all (not on the allowlist,
     worth nothing). greatest() skips a NULL, so the NULL is kept by hand. */
  select true,
         case when c.max_score is null then null else greatest(c.max_score, 1) end
    into v_listed, v_cap
    from public.game_score_caps c
   where c.game = p_game_slug;

  /* The day's best before this save: this player, this game, this Eastern
     day, the day Round 537 moved the board to. Not puzzle_date, which is the
     UTC date. */
  select max(s.score) into v_before
    from public.user_game_scores s
   where s.user_id = v_user
     and s.game_type = p_game_slug
     and (s.created_at at time zone 'America/New_York')::date = v_day;

  insert into public.user_game_scores (user_id, game_type, score, correct_answers, puzzle_date)
  values (v_user, p_game_slug, v_score, coalesce(p_correct, 0), v_today);

  /* least() and greatest() skip a NULL, so the first play of the day (no
     best before it) is spelled out rather than left to them. */
  v_after := case when v_before is null then v_score else greatest(v_before, v_score) end;
  v_add := case
    when v_listed is null then 0
    when v_cap is null then v_after - coalesce(v_before, 0)
    when v_before is null then least(v_after, v_cap)
    else least(v_after, v_cap) - least(v_before, v_cap)
  end;

  insert into public.daily_completions (user_id, game_slug, date)
  values (v_user, p_game_slug, v_today)
  on conflict (user_id, game_slug, date) do nothing;

  select count(*) into v_games
  from public.daily_completions
  where user_id = v_user and date = v_today;

  insert into public.user_scores as s
    (user_id, total_points, games_played_today, last_played_at, updated_at, current_streak, longest_streak)
  values
    (v_user, v_add, greatest(v_games, 1), now(), now(), 1, 1)
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
  values (v_user, p_game_slug, v_score)
  on conflict (user_id, game_type) do update set
    best_score = excluded.best_score,
    achieved_at = now()
  where excluded.best_score > b.best_score;

  return jsonb_build_object(
    'total_points', v_total,
    'points_added', v_add,
    'current_streak', v_streak,
    'longest_streak', v_longest,
    'games_played_today', greatest(v_games, 1)
  );
end;
$body$
$fn$;

  execute $fn$ revoke all on function public.record_auth_completion(text, integer, integer) from public $fn$;
  execute $fn$ revoke all on function public.record_auth_completion(text, integer, integer) from anon $fn$;
  execute $fn$ grant execute on function public.record_auth_completion(text, integer, integer) to authenticated $fn$;
end
$r648_part1$;

-- Next, as its own apply_migration once this one has committed:
-- 20260928_round_648_profile_recompute.sql.
--
-- To put the save back, rerun the function from
-- supabase/migrations/20260914120000_record_auth_completion.sql. File 2's
-- footer puts the stored totals back.
