-- Round 648: the profile's all time total, one rule for the page and for the
-- database: one row per game per day, the day's best, capped.
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT, and never run against any database
-- by it: neither the build pass nor the fix pass had a database session. The
-- release manager applies it through the Supabase MCP (apply_migration, one
-- transaction) after review, and runs get_advisors afterwards as the database
-- rules require. It FAILS CLOSED: every precondition below is asserted inside
-- the same block that makes the change, and a failed one raises before
-- anything is written, however the file is run.
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
--   total = the sum over (game_type, puzzle_date) of least(max(score), cap)
--
-- exactly the grouping of the 2026-09-19 recompute, whose model Round 644
-- reproduces in its part 1 check. The cap is read from public.game_score_caps,
-- the TABLE: greatest(max_score, 1) where max_score is set. A row whose
-- max_score is NULL has no ceiling on record and its day's best counts as
-- recorded; a game with no row is not on the allowlist and counts nothing.
--
-- One deliberate difference from 2026-09-19: that recompute joined the
-- game_denominators VIEW, whose NULL cap fallback is a 99th percentile over
-- game_completions, the scan Round 370 took off the page path for Disk IO.
-- The page reads the table (it must not run that percentile on a profile
-- view), so the database reads the same table, or the two totals would not
-- be the same number. After Round 646 the only scored games left with a NULL
-- cap are list-quiz and higher-lower-transfers; by the percentile's own
-- definition it clamped about one play in a hundred of theirs.
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
--   Then PART 1 (the save adds the day's improvement), PART 2 (every stored
--   total recomputed by the rule, backed up first), get_advisors.
--
-- PART 2 IS RERUNNABLE on its own, and must be rerun whenever a cap in
-- game_score_caps changes: the save adds each play at the cap of its day, so
-- a changed cap leaves stored totals on the old one until the recompute.

-- =====================================================================
-- PART 1. The save adds what the play adds to the rule, and nothing more.
-- =====================================================================
-- Everything else is exactly the Round 569 function: SECURITY INVOKER, the
-- player from auth.uid() and never a parameter, a pinned search_path, the in
-- place increment that serialises racing saves, the conflict safe daily
-- mark, a best that only rises, EXECUTE for authenticated only.
-- scripts/simAuthSave.mjs section 3 holds every migration that defines the
-- function to those properties, and scripts/simProfileTotal.mjs section 3
-- holds this file to the rule.
--
-- THE ADD. The play's game day was worth least(best so far, cap) before this
-- save and least(greatest(best so far, score), cap) after it; the save adds
-- the difference, which is never negative. The first play of a game on a day
-- adds its capped score, a better one later that day adds what it beats the
-- best by, a worse one adds nothing.
--
-- THE LOCK. Two saves of one player for one game on one day would each read
-- the day's best without seeing the other's uncommitted row, and both would
-- add. A transaction advisory lock keyed on the player is taken before the
-- read, so the second save waits for the first to commit and then reads its
-- row (each statement in a plpgsql function takes a fresh snapshot under
-- READ COMMITTED). It is released at commit.
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
  if md5(v_def) is distinct from v_md5_569 and position('round 648 profile rule' in lower(v_def)) = 0 then
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

  /* Round 648 profile rule. One save of this player at a time from here to
     the commit, so the day's best read below sees every earlier save. */
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('record_auth_completion:' || v_user::text, 0));

  /* The game's cap from the table the page reads: a row with a cap, a row
     with no ceiling on record (NULL), or no row at all (not on the allowlist,
     worth nothing). greatest() skips a NULL, so the NULL is kept by hand. */
  select true,
         case when c.max_score is null then null else greatest(c.max_score, 1) end
    into v_listed, v_cap
    from public.game_score_caps c
   where c.game = p_game_slug;

  /* The day's best before this save: this player, this game, this day. */
  select max(s.score) into v_before
    from public.user_game_scores s
   where s.user_id = v_user
     and s.game_type = p_game_slug
     and s.puzzle_date = v_today;

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

-- =====================================================================
-- PART 2. RERUNNABLE. Every stored total becomes the rule over its records.
-- Backs up first, in the same transaction, and touches only the rows that
-- differ.
-- =====================================================================
-- The caps are copied out of game_score_caps into a temporary table BEFORE
-- the lock, so nothing but one grouped aggregate over user_game_scores runs
-- while writers wait. user_scores is then locked against writers (readers,
-- the profile's rank count among them, are not blocked): a save that is
-- waiting holds its user_game_scores row uncommitted and its per player lock,
-- this statement does not see that row, and once the lock lifts the save
-- adds that row's improvement on top of the recomputed total, which is the
-- rule over every row. After the update the block counts the accounts whose
-- stored total differs from the model and raises (rolling everything back)
-- if there is one.

create table if not exists private.r648_totals_bak (
  user_id uuid not null,
  total_points integer,
  recomputed_to integer,
  backed_up_at timestamptz not null default now()
);
revoke all on private.r648_totals_bak from public, anon, authenticated;

do $r648_part2$
declare
  v_def text;
  v_changed integer;
  v_accounts integer;
  v_before bigint;
  v_after bigint;
  v_off integer;
begin
  v_def := pg_get_functiondef('public.record_auth_completion(text,integer,integer)'::regprocedure);
  if position('round 648 profile rule' in lower(v_def)) = 0 then
    raise exception 'Round 648 part 2: record_auth_completion is not this file''s definition, so the save would move the totals off the rule again straight after the recompute. Run part 1 first. Nothing was changed.';
  end if;
  if to_regclass('private.r646_caps_bak') is null then
    raise exception 'Round 648 part 2: Round 646 has not been applied, so the caps are not yet each game''s real ceiling. Nothing was changed.';
  end if;
  if not exists (select 1 from public.game_score_caps) then
    raise exception 'Round 648 part 2: public.game_score_caps is empty. Nothing was changed.';
  end if;

  create temporary table r648_caps on commit drop as
    select c.game,
           case when c.max_score is null then null else greatest(c.max_score, 1) end as cap
      from public.game_score_caps c;

  lock table public.user_scores in exclusive mode;

  create temporary table r648_model on commit drop as
    select u.user_id, coalesce(t.total, 0)::integer as total
      from public.user_scores u
      left join (
        select d.user_id, sum(d.worth) as total
          from (
            select s.user_id,
                   case when k.cap is null then max(s.score)
                        else least(max(s.score), k.cap) end as worth
              from public.user_game_scores s
              join r648_caps k on k.game = s.game_type
             group by s.user_id, s.game_type, s.puzzle_date, k.cap
          ) d
         group by d.user_id
      ) t on t.user_id = u.user_id;

  insert into private.r648_totals_bak (user_id, total_points, recomputed_to)
    select u.user_id, u.total_points, m.total
      from public.user_scores u
      join r648_model m on m.user_id = u.user_id
     where u.total_points is distinct from m.total;

  select coalesce(sum(u.total_points), 0), coalesce(sum(m.total), 0)
    into v_before, v_after
    from public.user_scores u
    join r648_model m on m.user_id = u.user_id;

  update public.user_scores u
     set total_points = m.total,
         updated_at = now()
    from r648_model m
   where m.user_id = u.user_id
     and u.total_points is distinct from m.total;
  get diagnostics v_changed = row_count;

  select count(*) into v_off
    from public.user_scores u
    join r648_model m on m.user_id = u.user_id
   where u.total_points is distinct from m.total;
  if v_off > 0 then
    raise exception 'Round 648 part 2: % stored totals still differ from the rule after the update. Everything in this block is rolled back.', v_off;
  end if;

  select count(*) into v_accounts from r648_model;
  raise notice 'Round 648 part 2: % of % stored totals recomputed by the rule, % points before and % after; the previous values are in private.r648_totals_bak.', v_changed, v_accounts, v_before, v_after;
  drop table if exists r648_model;
  drop table if exists r648_caps;
end
$r648_part2$;

-- To put every total back exactly as it was before the most recent run:
--   update public.user_scores u
--      set total_points = b.total_points
--     from (select distinct on (user_id) user_id, total_points
--             from private.r648_totals_bak
--            order by user_id, backed_up_at desc) b
--    where b.user_id = u.user_id;
-- and put record_auth_completion back from
-- supabase/migrations/20260914120000_record_auth_completion.sql.
