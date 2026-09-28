-- Round 648: a signed in play adds at most its game's cap to the player's
-- stored total, and every stored total is recomputed as the sum of its
-- records with each one clamped at its game's cap. The cap is the World
-- Leaderboard's denominator (public.game_denominators), so the profile, the
-- all time rank and the board score a record the same way.
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT, and not run against any database
-- by it either: the round had no database session. The release manager
-- applies it through the Supabase MCP after review, in the order below, and
-- runs get_advisors afterwards as the database rules require.
--
-- =====================================================================
-- WHAT WAS WRONG
-- =====================================================================
-- record_auth_completion (20260914120000_record_auth_completion.sql) adds
-- p_score to user_scores.total_points exactly as the client sent it. Pack
-- Battle records the banked value of a pack in dollars, so one pack added
-- about 8,800,000 to a total in which a whole Club Manager season is worth at
-- most 130, and the profile showed that number as Total Points, divided it
-- into the average score, and fed it to the points badges and achievements.
-- The owner's recompute of 2026-09-19 morning (the day's best per game per
-- day, capped) put every total right for the plays before it, and every save
-- since then has added the raw score again. The Round 644 migration says so
-- and leaves those adds to this round by name.
--
-- The client side of the same total (src/hooks/useProfileTotal.ts) sums the
-- player's user_game_scores rows clamped by game_denominators from this round
-- on, so the page is right the moment the client is live; this file brings
-- the STORED total, which the all time rank counts against, onto the same
-- rule, and stops the save from growing it raw again.
--
-- =====================================================================
-- THE RULE
-- =====================================================================
-- A record is worth least(greatest(score, 0), cap), where cap is the game's
-- row in public.game_denominators (the frozen cap where one is known, the
-- game's own 99th percentile otherwise, floored at 1). A game with NO row is
-- not on the allowlist and is worth nothing, the board's own rule since Round
-- 360; scripts/simLeaderboardCaps.mjs keeps every shipped game in the view.
-- The record itself (user_game_scores.score, user_best_scores.best_score) is
-- stored as the game showed it: the clamp is on what it adds to the total.
--
-- Per record, not per day: the board takes the day's best per game because
-- it ranks strangers' handles across anonymous rows, while the profile total
-- is a signed in player's own history and a second Club Manager season on
-- one day is a second season. This is the rule the Round 644 migration
-- anticipated for this round ("a per record cap rather than a per day best").
--
-- =====================================================================
-- ORDER OF OPERATIONS
-- =====================================================================
--   1. Round 644 part 2 must have had its LAST rerun. Part 2 stores the md5
--      of record_auth_completion's definition and refuses to run once it has
--      changed, by design; part 1 of this file changes it. If part 2 is still
--      wanted afterwards, its delta has to be recomputed for the capped add,
--      as its own header says.
--   2. If Round 646 (caps at each game's real ceiling) is applied first, the
--      recompute below reads the new caps. If it lands later, run PART 2 of
--      this file again: it is a pure recompute from the records and is safe
--      to rerun at any time.
--   3. Apply this file. Part 1 replaces the function. Part 2 backs up every
--      total it will change into private.r648_totals_bak and recomputes.
--   4. get_advisors.
--
-- =====================================================================
-- PART 1. The save adds the clamped score.
-- =====================================================================
-- Everything else is exactly the Round 569 function: SECURITY INVOKER, the
-- player from auth.uid() and never a parameter, a pinned search_path, the
-- in place increment that serialises racing saves, the conflict safe daily
-- mark, a best that only rises, EXECUTE for authenticated only.
-- scripts/simAuthSave.mjs section 3 holds every migration that defines the
-- function to those properties.

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
  v_cap numeric;
  v_add integer;
begin
  if v_user is null then
    raise exception 'record_auth_completion needs a signed in user';
  end if;
  if p_game_slug is null or length(p_game_slug) = 0 then
    raise exception 'record_auth_completion needs a game slug';
  end if;

  /* Round 648: what this play adds to the total. The game's denominator on
     the World Leaderboard, and nothing at all for a game that has no row,
     which is the board's own rule for a game that is not allowed to score. */
  select d.max_score into v_cap
  from public.game_denominators d
  where d.game = p_game_slug;
  v_add := case
    when v_cap is null then 0
    else least(greatest(coalesce(p_score, 0), 0), v_cap)::integer
  end;

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
  values (v_user, p_game_slug, coalesce(p_score, 0))
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
$$;

revoke all on function public.record_auth_completion(text, integer, integer) from public;
revoke all on function public.record_auth_completion(text, integer, integer) from anon;
grant execute on function public.record_auth_completion(text, integer, integer) to authenticated;

-- =====================================================================
-- PART 2. RERUNNABLE. Every stored total becomes the clamped sum of its
-- records. Backs up first, in the same transaction, and touches only the
-- rows that differ.
-- =====================================================================
-- The table is locked against writers for the duration so a save cannot
-- land between the model being read and the row being written: a save that
-- is waiting holds its user_game_scores row uncommitted, this statement does
-- not see it, and once the lock lifts the save adds its clamped score on top
-- of the recomputed total. Readers are not blocked. The whole thing is one
-- statement over about 550 rows.

create table if not exists private.r648_totals_bak (
  user_id uuid not null,
  total_points integer,
  recomputed_to integer,
  backed_up_at timestamptz not null default now()
);
revoke all on private.r648_totals_bak from public, anon, authenticated;

do $$
declare
  v_changed integer;
  v_accounts integer;
begin
  lock table public.user_scores in exclusive mode;

  create temporary table r648_model on commit drop as
    select u.user_id,
           coalesce((
             select sum(least(greatest(s.score, 0), d.max_score))::integer
             from public.user_game_scores s
             join public.game_denominators d on d.game = s.game_type
             where s.user_id = u.user_id
           ), 0) as total
    from public.user_scores u;

  insert into private.r648_totals_bak (user_id, total_points, recomputed_to)
    select u.user_id, u.total_points, m.total
    from public.user_scores u
    join r648_model m on m.user_id = u.user_id
    where u.total_points is distinct from m.total;

  update public.user_scores u
     set total_points = m.total,
         updated_at = now()
    from r648_model m
   where m.user_id = u.user_id
     and u.total_points is distinct from m.total;
  get diagnostics v_changed = row_count;

  select count(*) into v_accounts from r648_model;
  raise notice 'Round 648 part 2: % of % stored totals recomputed as the clamped sum of their records; the previous values are in private.r648_totals_bak.', v_changed, v_accounts;
  drop table if exists r648_model;
end $$;

-- To put a total back exactly as it was before the most recent run:
--   update public.user_scores u
--      set total_points = b.total_points
--     from (select distinct on (user_id) user_id, total_points
--             from private.r648_totals_bak
--            order by user_id, backed_up_at desc) b
--    where b.user_id = u.user_id;
