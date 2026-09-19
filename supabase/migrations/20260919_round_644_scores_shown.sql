-- Round 644: Soccer Career records the legacy score it shows, out of 100, and
-- every past day keeps exactly the leaderboard points it had. Player Bingo and
-- Rarity Round get the caps their recorded scores now need, and the signed in
-- tables are brought onto the same scale.
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The release manager applies it
-- through the Supabase MCP after review, in the order below.
--
-- =====================================================================
-- ORDER OF OPERATIONS. PUBLISH FIRST, THEN APPLY WITH P FILLED IN.
-- =====================================================================
--   1. Publish the client that records the legacy score.
--   2. Note P, the moment the LIVE bundle flipped: deploy_project has
--      completed and douknowball.com serves the new entry chunk. Not the time
--      the change landed on main. Every live play between the main landing and
--      the live publish comes from the old client, and part 2 never divides an
--      old 50 or 100 written after P, so each of those would keep 50 or 100
--      leaderboard points on its day where it earned 5 or 10, up to 90 points
--      a row. The public preview (ballpark-hero.lovable.app) runs the new
--      client from the moment the change lands on main and writes to this
--      same database, but it is the smaller error: part 1 divides a new legacy
--      score of exactly 50 or 100 written before P (it cannot tell those from
--      the old formula), and its notice counts the other new scale rows before
--      P, which it leaves alone.
--   3. Write P into the v_p line of the first block below as an ISO timestamp
--      with an offset, for example 2026-09-20 14:05:00+00, and apply this
--      file. The block refuses anything that is not that shape (so 'now', a
--      bare date and a time without an offset are all refused), a P in the
--      future, and a P before the morning recompute M (below).
--   4. Rerun PART 2 on its own after a few hours and again after a few days.
--      It is safe to rerun while record_auth_completion is unchanged: part 1
--      stores the md5 of that function's definition, and part 2 refuses to
--      run, before any write, if the live definition differs, because its
--      totals delta assumes each save added the raw score (see below).
--
-- NEVER RUN ANY STATEMENT OF PART 1 ON ITS OWN, outside its block. The guard
-- inside the block (no record of part 1 having run, and the soccer-career cap
-- still reading 1000) is the only thing that stops a second division of the
-- same rows; a row already divided sits before P too. Always follow part 1
-- with part 2.
--
-- WHICH ROWS ARE OLD. The old formula (200 a Ballon d'Or, 150 a Champions
-- League or a World Cup, 50 a league title, capped at 1000) can only write a
-- multiple of 50. Live today every positive soccer-career row is one: 19,775
-- in game_completions and 2,242 in user_game_scores. So part 1 divides the
-- rows before P that ARE multiples of 50, and raises a notice with the count
-- of any before P that are not (they can only be new legacy scores, from the
-- preview, and are left alone). Part 2 divides rows after P above 100, which
-- only an old tab can write. What neither part can do is tell an old tab's 50
-- or 100 after P from a new legacy score of 50 or 100; those are left as they
-- are, each worth up to 90 leaderboard points more than it earned on its day,
-- and part 2 reports how many there are and how long P was ago.
--
-- =====================================================================
-- WHAT WAS WRONG
-- =====================================================================
-- src/pages/SoccerCareer.tsx recorded that trophy formula on retirement while
-- the retirement screen and the share card showed the legacy score out of
-- 100. The formula never looked at where a career began, and the build editor
-- lets anyone type a 99 starting overall, so a 99 build ran to the cap on most
-- careers: 4,060 of 7,048 rows in the 30 days before sat exactly at 1000. The
-- client now records the legacy score, which knows the start (The Climb in
-- calculateLegacy: a 99 start costs 16 points).
--
-- MEASURED READ ONLY ON PRODUCTION, 2026-09-19:
--   game_completions, soccer-career: 19,775 rows above 0, all multiples of 50,
--     none above 1000.
--   user_game_scores, soccer-career: 2,242 above 0, all multiples of 50.
--   user_best_scores, soccer-career: 426 rows, each equal to its player's
--     max(score) in user_game_scores; rebuilt after the rescale, 411 change and
--     every rebuilt best equals the old best divided by ten (0 mismatches).
--   game_score_caps: soccer-career 1000 'frozen from live data 2026-08-30',
--     player-bingo NULL (all 1,966 of its rows are NULL, so its view
--     denominator is 1), rarity-round 500.
--
-- WHY THE RESCALE KEEPS EVERY LEADERBOARD POINT. The board (global_leaderboard,
-- global_rank and the player_ranks view, 20260911_leaderboard_eastern_day.sql)
-- scores a player's day as 100 * min(day best, cap) / cap. Rows before P
-- become round(s / 10) against a cap of 100. For any s from 0 to 1000,
--     min(round(s / 10), 100) / 100  and  min(s, 1000) / 1000
-- differ by at most 0.005, half a point on one player day, and by nothing when
-- s is a multiple of 10, which every row part 1 divides is. round is
-- monotone, so the day best of the rescaled rows is the rescale of the day
-- best. Checked on the live rows with this read only query (P as now()):
--
--   with days as (
--     select gc.player_name, (gc.created_at at time zone 'America/New_York')::date as et_day,
--            max(least(gc.score, 1000))::numeric as old_best,
--            max(least(round(gc.score / 10.0)::integer, 100))::numeric as new_best
--     from public.game_completions gc
--     where gc.game = 'soccer-career' and gc.score > 0 and gc.player_name is not null
--       and gc.created_at < now() and gc.score % 50 = 0
--     group by 1, 2
--   )
--   select count(*) as player_days,
--          sum(100.0 * old_best / 1000) as old_points,
--          sum(100.0 * new_best / 100) as new_points,
--          max(abs(100.0 * old_best / 1000 - 100.0 * new_best / 100)) as worst_day_diff,
--          count(*) filter (where old_best <> new_best * 10) as days_changed
--   from days;
--
--   Result 2026-09-19 evening: 9,350 player days, 826,185 points before and
--   after, 0 days changed. scripts/simScoreShown.mjs section 4
--   runs the same normalisation over the live score histogram and every
--   integer from 0 to 3000 (control SCORE_SHOWN_CONTROL=norescale).
--
-- NO CACHED CAP TO BUST. game_denominators is a plain view over
-- game_score_caps, read live by global_leaderboard and global_rank, and the
-- materialized player_ranks is rebuilt every five minutes by the
-- refresh-player-ranks cron job (20260831_disk_io_leaderboard_cache.sql).
-- Nothing else copies a per game cap, and the rescale moves no point total.
--
-- =====================================================================
-- THE SIGNED IN TABLES
-- =====================================================================
-- user_game_scores (one row a play) is divided with the same P split.
--
-- user_best_scores is NOT divided. It is rebuilt in part 2 from
-- user_game_scores as each player's max(score), touching only rows that
-- differ. record_auth_completion replaces a best only with a higher score, so
-- an old tab's 800 after P can replace a real best of 84, and a tenth of 800
-- is 80, below the real best.
--
-- user_scores.total_points: ONLY THE SOCCER-CAREER PART MOVES. The owner's
-- decision of 2026-09-19 (docs/PROJECT-STATE.md, the inflated points item,
-- RESOLVED that morning) recomputed every total at M, 2026-09-19 06:20 UTC, to
-- one row per game per day, the day's best, capped by game_denominators;
-- since then record_auth_completion has added each save's raw score. M is the
-- moment between the backup migration (06:16:11 UTC) and the first save after
-- it (06:24:55 UTC), and read only on 2026-09-19 evening "that rule over the
-- plays before M, plus every play since M added raw" reproduces 545 of 545
-- totals exactly. The raw adds since M are real play (Club Manager seasons,
-- more than one career a day) and are Round 648's to change, which plans a per
-- record cap rather than a per day best, so this file must not recompute a
-- whole total. It subtracts, per account, exactly what the soccer rescale
-- takes out of that account's total:
--   part 1: for each soccer-career day with plays before M, the morning rule's
--     soccer line at cap 1000 minus the same line after the rescale at cap
--     100; plus, for each soccer-career play between M and P that part 1
--     divides, its score minus its rescaled score.
--   part 2: for each old tab play after P that it divides, its score minus its
--     rescaled score. That is right only while record_auth_completion adds the
--     raw score, as it does today; Round 648 plans a capped add, after which an
--     old tab's 1000 would have added 100 and this would take away 900. So it
--     is enforced, not assumed: part 1 stores the md5 of the function's
--     definition, and part 2 raises before any write if it has changed
--     ("recompute the part 2 delta for the new add rule").
--   Part 2 takes one snapshot of the rows it will divide, into temporary
--   tables at its top, and drives the backup, the delta and both updates from
--   that snapshot by id, so a save that commits while it runs is neither
--   divided without its delta nor counted without being divided; the next
--   rerun picks it up.
-- Part 1 checks the model first and refuses to run (changing nothing) if any
-- account with soccer-career plays no longer holds it. Accounts with no
-- soccer-career play are not touched. Dry run, read only, 2026-09-19 evening,
-- P as now(): the model check finds 0 accounts off it; the 118 accounts with
-- no soccer-career play move by 0; all 427 with soccer-career plays land, after
-- subtracting their delta, exactly on the same model recomputed over the
-- rescaled plays (427 of 427); 412 move, 896,265 points in all, none below 0.
--
-- Not touched: the browser's own lifetime points (src/lib/streaks.ts, backed
-- up to profiles.streak_state), which live in each browser. Rarity Round's
-- rows before Round 644 cannot be split by mode, so they stay as stored.
--
-- BACKUP FIRST, IN THE SAME TRANSACTION. private.r644_soccer_scores_bak holds
-- the before value of everything this file changes, tagged with the part and
-- table: soccer-career plays (id, score, created_at), bests (user_id,
-- best_score), each adjusted total (user_id, total_points), and the three
-- game_score_caps rows part 1 overwrites (game, max_score, note, updated_at;
-- the Rarity page reads that updated_at). It lives in the private schema,
-- which the API does not serve, and anon and authenticated are revoked on it.
-- The three caps go back exactly with:
--   update public.game_score_caps c
--      set max_score = b.value, note = b.note, updated_at = b.updated_at
--     from private.r644_soccer_scores_bak b
--    where b.source = 'part1:game_score_caps' and b.row_id = c.game;

create table if not exists private.r644_state (
  id integer primary key default 1 check (id = 1),
  publish_time timestamptz not null,
  part1_done_at timestamptz,
  raw_add_md5 text
);
alter table private.r644_state add column if not exists raw_add_md5 text;
revoke all on private.r644_state from public, anon, authenticated;

create table if not exists private.r644_soccer_scores_bak (
  source text not null,
  row_id text,
  user_id uuid,
  value integer,
  created_at timestamptz,
  note text,
  updated_at timestamptz,
  backed_up_at timestamptz not null default now()
);
revoke all on private.r644_soccer_scores_bak from public, anon, authenticated;

-- =====================================================================
-- P. THE ONE VALUE TO FILL IN, on the v_p line.
-- =====================================================================
do $$
declare
  v_p text := 'SET_P_HERE';
  v_m constant timestamptz := '2026-09-19 06:20:00+00';
  v_ts timestamptz;
  v_prior timestamptz;
begin
  if v_p !~ '^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$' then
    raise exception 'Round 644: P must be an ISO timestamp with an offset, for example 2026-09-20 14:05:00+00, and it reads %. Publish first, then write the publish time on the v_p line.', v_p;
  end if;
  v_ts := v_p::timestamptz;
  if v_ts <= v_m or v_ts > now() then
    raise exception 'Round 644: P % must be after the morning recompute % and not in the future.', v_ts, v_m;
  end if;
  select publish_time into v_prior from private.r644_state where id = 1;
  if v_prior is null then
    insert into private.r644_state (id, publish_time) values (1, v_ts);
  elsif v_prior <> v_ts then
    raise exception 'Round 644: P % differs from the P % recorded when this first ran.', v_ts, v_prior;
  end if;
end $$;

-- =====================================================================
-- PART 1. RUNS ONCE. One block: the guard, the checks, the backup, the two
-- rescales, the soccer part of each total, and the caps. Never run a
-- statement of it on its own.
-- =====================================================================
do $$
declare
  v_p timestamptz;
  v_m constant timestamptz := '2026-09-19 06:20:00+00';
  v_done timestamptz;
  v_cap integer;
  v_odd integer;
  v_off integer;
begin
  select publish_time, part1_done_at into v_p, v_done from private.r644_state where id = 1;
  if v_p is null then
    raise exception 'Round 644 part 1: no P recorded, so nothing can be split.';
  end if;
  if v_done is not null then
    raise notice 'Round 644 part 1 already ran at %, skipped.', v_done;
    return;
  end if;
  select max_score into v_cap from public.game_score_caps where game = 'soccer-career';
  if v_cap is distinct from 1000 then
    raise exception 'Round 644 part 1: the soccer-career cap reads %, not 1000, so the rows may not be on the old scale any more. Nothing was changed.', v_cap;
  end if;

  /* The invariant: before P, only multiples of 50 are the old formula. */
  select (select count(*) from public.game_completions
           where game = 'soccer-career' and score > 0 and created_at < v_p and score % 50 <> 0)
       + (select count(*) from public.user_game_scores
           where game_type = 'soccer-career' and score > 0 and created_at < v_p and score % 50 <> 0)
    into v_odd;
  if v_odd > 0 then
    raise notice 'Round 644 part 1: % soccer-career rows before P are not multiples of 50. The old formula cannot write them, so they are new legacy scores and are left as they are.', v_odd;
  end if;

  /* The totals model: for every account with soccer-career plays, the stored
     total is the morning rule over its plays before M plus every play since M
     added raw. If that no longer holds, the soccer delta below would be wrong. */
  select count(*) into v_off
  from public.user_scores u
  where exists (select 1 from public.user_game_scores s where s.user_id = u.user_id and s.game_type = 'soccer-career')
    and u.total_points is distinct from (
      coalesce((select sum(g.best) from (
          select s.game_type, s.puzzle_date, least(max(s.score), d.max_score) as best
            from public.user_game_scores s
            join public.game_denominators d on d.game = s.game_type
           where s.user_id = u.user_id and s.created_at < v_m
           group by s.game_type, s.puzzle_date, d.max_score) g), 0)
      + (select coalesce(sum(s.score), 0) from public.user_game_scores s
          where s.user_id = u.user_id and s.created_at >= v_m));
  if v_off > 0 then
    raise exception 'Round 644 part 1: % accounts with soccer-career plays no longer hold the morning rule plus raw saves (Round 648 may have landed). Nothing was changed; recheck the totals step.', v_off;
  end if;

  /* The soccer part of each total, computed before anything moves. */
  create temporary table r644_part1_delta on commit drop as
    select x.user_id, sum(x.d)::integer as delta
    from (
      select s.user_id,
             least(max(s.score), 1000)
             - least(max(case when s.score > 0 and s.score % 50 = 0 then round(s.score / 10.0)::integer else s.score end), 100) as d
        from public.user_game_scores s
       where s.game_type = 'soccer-career' and s.created_at < v_m
       group by s.user_id, s.puzzle_date
      union all
      select s.user_id, s.score - round(s.score / 10.0)::integer as d
        from public.user_game_scores s
       where s.game_type = 'soccer-career' and s.created_at >= v_m and s.created_at < v_p
         and s.score > 0 and s.score % 50 = 0
    ) x
    group by x.user_id;

  /* Backup, before any change. */
  insert into private.r644_soccer_scores_bak (source, row_id, value, created_at)
    select 'part1:game_completions', gc.id::text, gc.score, gc.created_at
    from public.game_completions gc
    where gc.game = 'soccer-career' and gc.score > 0 and gc.created_at < v_p and gc.score % 50 = 0;
  insert into private.r644_soccer_scores_bak (source, row_id, user_id, value, created_at)
    select 'part1:user_game_scores', s.id::text, s.user_id, s.score, s.created_at
    from public.user_game_scores s
    where s.game_type = 'soccer-career' and s.score > 0 and s.created_at < v_p and s.score % 50 = 0;
  insert into private.r644_soccer_scores_bak (source, user_id, value)
    select 'part1:user_scores', u.user_id, u.total_points
    from public.user_scores u
    join r644_part1_delta d on d.user_id = u.user_id
    where d.delta <> 0;
  insert into private.r644_soccer_scores_bak (source, row_id, value, note, updated_at)
    select 'part1:game_score_caps', c.game, c.max_score, c.note, c.updated_at
    from public.game_score_caps c
    where c.game in ('soccer-career', 'player-bingo', 'rarity-round');

  /* Before P, the old formula's rows: multiples of 50 above 0. */
  update public.game_completions
     set score = round(score / 10.0)::integer
   where game = 'soccer-career' and score > 0 and created_at < v_p and score % 50 = 0;
  update public.user_game_scores
     set score = round(score / 10.0)::integer
   where game_type = 'soccer-career' and score > 0 and created_at < v_p and score % 50 = 0;

  update public.user_scores u
     set total_points = u.total_points - d.delta
    from r644_part1_delta d
   where d.user_id = u.user_id and d.delta <> 0;
  drop table if exists r644_part1_delta;

  /* The caps, each the game's real ceiling, read from the code:
       soccer-career 100: calculateLegacy clamps the legacy score to 0..100.
       player-bingo 1700: twelve lines (winningLines in src/lib/playerBingo.ts)
         at 100 each plus the 500 blackout bonus. It records from this round.
       rarity-round 500: five rounds at 100 at most. From this round only
         Rarity runs carry a score (the obscurity total, recordedRunScore in
         src/lib/rarityRound.ts); Crowd Says records a play with no score.
         Stamping this row also tells the page when the switch landed: its
         today standing counts only rows written since updated_at. */
  insert into public.game_score_caps (game, max_score, note)
  values
    ('soccer-career', 100, 'Round 644: the legacy score out of 100; history before the publish rescaled from the old 0 to 1000 formula'),
    ('player-bingo', 1700, 'Round 644: engine ceiling, 12 lines at 100 plus the 500 blackout bonus'),
    ('rarity-round', 500, 'Round 644: engine ceiling, 5 rounds at 100; only Rarity runs are ranked, higher is better')
  on conflict (game) do update
    set max_score = excluded.max_score,
        note = excluded.note,
        updated_at = now();

  /* The add rule part 2's delta depends on, fingerprinted as it stands now. */
  update private.r644_state
     set part1_done_at = now(),
         raw_add_md5 = md5(pg_get_functiondef('public.record_auth_completion(text,integer,integer)'::regprocedure))
   where id = 1;
end $$;

-- =====================================================================
-- PART 2. RERUNNABLE. Old tabs after P, the soccer part of their totals, then
-- the bests. Run it again on its own a few hours after the publish and a few
-- days after. It refuses to run, before any write, if record_auth_completion
-- has changed since part 1.
-- =====================================================================
do $$
declare
  v_p timestamptz;
  v_md5 text;
  v_ambiguous integer;
begin
  select publish_time, raw_add_md5 into v_p, v_md5 from private.r644_state where id = 1 and part1_done_at is not null;
  if v_p is null then
    raise exception 'Round 644 part 2: part 1 has not run, so there is no scale to bring anything onto.';
  end if;
  if v_md5 is null or v_md5 <> md5(pg_get_functiondef('public.record_auth_completion(text,integer,integer)'::regprocedure)) then
    raise exception 'Round 644 part 2: record_auth_completion changed since part 1; recompute the part 2 delta for the new add rule. Nothing was changed.';
  end if;

  /* One snapshot of everything this part will change, taken before any write.
     The backup, the delta and the updates below all read it by id, so a save
     committing while this runs is left whole for the next rerun. A
     soccer-career score above 100 after P can only be an old tab. */
  create temporary table r644_part2_ugs on commit drop as
    select s.id, s.user_id, s.score, s.created_at
      from public.user_game_scores s
     where s.game_type = 'soccer-career' and s.created_at >= v_p and s.score > 100;
  create temporary table r644_part2_gc on commit drop as
    select gc.id, gc.score, gc.created_at
      from public.game_completions gc
     where gc.game = 'soccer-career' and gc.created_at >= v_p and gc.score > 100;
  create temporary table r644_part2_delta on commit drop as
    select r.user_id, sum(r.score - round(r.score / 10.0)::integer)::integer as delta
      from r644_part2_ugs r
     group by r.user_id;

  select (select count(*) from public.game_completions
           where game = 'soccer-career' and created_at >= v_p and score in (50, 100))
       + (select count(*) from public.user_game_scores
           where game_type = 'soccer-career' and created_at >= v_p and score in (50, 100))
    into v_ambiguous;
  raise notice 'Round 644 part 2: P was % ago. % soccer-career rows since P sit at exactly 50 or 100; an old tab''s 50 or 100 cannot be told from a new legacy score, so they are left as they are, each up to 90 leaderboard points above what it earned.', now() - v_p, v_ambiguous;

  insert into private.r644_soccer_scores_bak (source, row_id, value, created_at)
    select 'part2:game_completions', r.id::text, r.score, r.created_at
    from r644_part2_gc r;
  insert into private.r644_soccer_scores_bak (source, row_id, user_id, value, created_at)
    select 'part2:user_game_scores', r.id::text, r.user_id, r.score, r.created_at
    from r644_part2_ugs r;
  insert into private.r644_soccer_scores_bak (source, user_id, value)
    select 'part2:user_scores', u.user_id, u.total_points
    from public.user_scores u
    join r644_part2_delta d on d.user_id = u.user_id
    where d.delta <> 0;

  update public.game_completions gc
     set score = round(r.score / 10.0)::integer
    from r644_part2_gc r
   where gc.id = r.id;
  update public.user_game_scores s
     set score = round(r.score / 10.0)::integer
    from r644_part2_ugs r
   where s.id = r.id;
  update public.user_scores u
     set total_points = u.total_points - d.delta
    from r644_part2_delta d
   where d.user_id = u.user_id and d.delta <> 0;

  /* Bests, rebuilt from the plays and never divided. Also one snapshot, and a
     best that a save raised after it was taken is left for the next rerun. */
  create temporary table r644_part2_bests on commit drop as
    select b.user_id, b.best_score as before, m.best
      from public.user_best_scores b
      join (select s.user_id, max(s.score) as best
              from public.user_game_scores s
             where s.game_type = 'soccer-career'
             group by s.user_id) m on m.user_id = b.user_id
     where b.game_type = 'soccer-career' and b.best_score is distinct from m.best;
  insert into private.r644_soccer_scores_bak (source, user_id, value)
    select 'part2:user_best_scores', r.user_id, r.before
    from r644_part2_bests r;
  update public.user_best_scores b
     set best_score = r.best
    from r644_part2_bests r
   where b.user_id = r.user_id
     and b.game_type = 'soccer-career'
     and b.best_score is not distinct from r.before;

  drop table if exists r644_part2_ugs;
  drop table if exists r644_part2_gc;
  drop table if exists r644_part2_delta;
  drop table if exists r644_part2_bests;
end $$;
