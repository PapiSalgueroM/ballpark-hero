-- Round 675, economy step E1: scales and worth.
--
-- Spec: docs/design/POINTS-ECONOMY-V2.md on the points-economy branch,
-- sections 1 (rules 1 and 2), 5 (E1), 9 (the chain, row E1, and P644) and 13
-- (Round 675).
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The lead applies it after the
-- round's adversarial review, on a normal day after Release F is live and
-- after L1, with the steps under APPLY below. Players see nothing: the World
-- Leaderboard still reads Round 537's functions until E2 (Round 676).
--
-- REHEARSED IN PGLITE, NEVER ON PRODUCTION. scripts/simEconomyMigrations.mjs
-- loads scripts/data/economySchema.sql (production's objects, read with
-- SELECTs only), applies L1, writes a copy of the live row shapes, and runs
-- this file there: its refusals, its proofs, the equality proof against the
-- real board objects, a second apply refused, the undo and the reapply.
--
-- =====================================================================
-- WHAT THIS DOES, in one DO block (one statement, one transaction)
-- =====================================================================
--   1. public.et_day(timestamptz): the Eastern day, SQL, IMMUTABLE, PARALLEL
--      SAFE, a standard SQL body (bound when created, so no search path is
--      read when it runs, and the planner inlines it, which the E1b index
--      needs to match the view).
--   2. public.score_scales: legacy, 644, g, dp.
--   3. public.game_scale_caps: caps kept as periods per (game, scale), never
--      edited in place (rule 2). One legacy period per game in
--      game_score_caps, from -infinity to infinity, at the cap in force now:
--        - a game with a cap: that cap;
--        - the seven NULL caps that float on the live view's 99th percentile
--          (they have scored rows): frozen at the denominator the live view
--          gives inside this block, so no past day moves;
--        - the fourteen NULL caps with no scored row: the engine ceiling
--          (scripts/lib/scoreCeilingTable.mjs, the same number
--          scripts/genScaleCaps.mjs writes as the g row), or, for a game that
--          records no score, L1's hard maximum. Never 1, so an untagged forged
--          1 cannot pay 100.
--      And two 644 periods: soccer-career at 100 from P644, player-bingo at
--      1700 from -infinity (both the engine ceilings).
--   4. public.legacy_scale_rules: two rows, one per game, so the join cannot
--      fan out: soccer-career rows from P644 scoring at most 100 are on 644
--      (an old tab's row above 100 stays legacy), every player-bingo row is on
--      644 (before Round 644 it recorded no score).
--   5. Four columns, nullable, no default (catalog only):
--      game_completions.score_scale, game_completions.ranked_day,
--      user_game_scores.score_scale, user_game_scores.ranked_day. No client
--      role may write them: L1's column grant on game_completions is still
--      exactly (game, score, player_name). E3 (Round 677) opens them.
--   6. public.scored_plays and public.scored_days (security_invoker), the
--      spec's view verbatim: the only place a score becomes points.
--   The three tables: RLS on, one public read policy, SELECT only for anon
--   and authenticated. Production's default privileges hand anon and
--   authenticated every privilege on a new public table (pg_default_acl read
--   2026-09-30), so each is revoked here and SELECT granted back.
--
-- =====================================================================
-- THE EQUALITY PROOF (before the block ends; any miss rolls it all back)
-- =====================================================================
-- For every (surface, player or account, game, Eastern day):
--   A. the views equal a recomputation written here in plain CASE form,
--      independent of the three tables (the machinery: joins, rules,
--      periods), on both surfaces;
--   B. on the board, the views equal Round 537's formula over the live
--      game_denominators view (max of least(score, denominator), times 100,
--      over the denominator) on every day, EXCEPT the days E1 is meant to
--      revalue, each of which equals the recomputation of A:
--        soccer-644  a day holding a Soccer Career row from P644 scoring at
--                    most 100, paid at 100 (the board pays it a tenth today:
--                    891 player days and +72,991 points on 2026-09-29, and
--                    growing every day until E2);
--        bingo-644   a Player Bingo day, paid at 1700 where the live board
--                    divides by its floating denominator (1700 when read on
--                    2026-09-28, so expected +0);
--        fixed       a day of one of the fourteen NULL cap games with no
--                    scored row, now at its engine ceiling or hard maximum
--                    (expected: no such day exists).
--   Each class's day count and point change is raised as a notice.
-- WHY NO VISITOR CAN HOLD THIS OFF. After L1 a visitor can only insert a
-- board row of (game, score, player_name) stamped now(), untagged. Every such
-- row falls in one of the classes above: equal in every game, or a declared
-- revaluation checked against A. Nothing here is a count or a threshold over
-- a table a visitor can write (section 9, rule 3).
--
-- THE COST OF THE PROOF. It reads game_completions twice and
-- user_game_scores twice while this block holds both in ACCESS EXCLUSIVE
-- mode (the column adds need it, and the proof must see what the views see).
-- The refresh-player-ranks cron reads game_completions once in about 4 s
-- (Round 537), so expect the lock held for roughly two such reads. A board
-- insert queued behind it waits, and anon's statement_timeout is 3 s. APPLY
-- step 2 times it right after a cron run; see the round's state entry for the
-- rehearsal's timing at production scale.
--
-- =====================================================================
-- PRECONDITIONS, every one read before any write. Any drift refuses.
-- =====================================================================
--   a. The ledger exists, L1 is live, E1 is not live, and no later step is.
--   b. Production's fingerprints, read on 2026-09-30 and equal to the spec's
--      section 2 where it gives one: global_leaderboard 56a5f15c...,
--      global_rank 4da21bd9..., the player_ranks definition 397d0f5f..., the
--      game_denominators definition 8c566278..., and the caps content
--      6c637738... (md5 of game:max_score for all 151 rows, byte order; the
--      spec's 3345521c... did not record its formula and no reading of the
--      table reproduces it, so this file pins its own and says how).
--   c. No Round 644, 646 or 648 object exists (those files are superseded;
--      646 and 648 are deleted in Round 675).
--   d. None of E1's objects exists yet: et_day, the three tables, the two
--      views, the four columns, the E1b index.
--   e. The NULL caps are exactly the seven floating and the fourteen fixed
--      named here, and each unscored one of the fourteen has an L1 hard
--      maximum above 1.
--   f. P644 EVIDENCE, by id order, which a forged created_at cannot move:
--      the first scored soccer-career row at or after P644 is id 593987, and
--      no scored soccer-career row with a lower id is off a multiple of 50
--      (the old formula wrote only multiples of 50). Read 2026-09-30: 593987,
--      score 73, at 2026-09-23 00:24:53.338907 UTC; 20,439 scored rows below
--      it, none off a multiple of 50, none dated at or after P644.
--      P644 itself: the spec takes the completion time of Lovable deployment
--      c902a3af (Release D) when it can be read, else the first proven new
--      row. No tool this round holds reads a Lovable deployment record, so it
--      is the fallback, 2026-09-23 00:24:53 UTC, after Release D's main
--      landing (3bddc098, 2026-09-22 01:21:53 UTC at the latest).
--
-- =====================================================================
-- APPLY (the lead, after the round's adversarial review)
-- =====================================================================
--   1. Read only, before, so a refusal is not a surprise:
--        select step, seq, undone_at from private.economy_steps order by seq;
--        select md5(pg_get_functiondef('public.global_leaderboard(text,text[])'::regprocedure)),
--               md5(pg_get_functiondef('public.global_rank(text,text,text[])'::regprocedure)),
--               md5(pg_get_viewdef('public.player_ranks'::regclass)),
--               md5(pg_get_viewdef('public.game_denominators'::regclass)),
--               (select md5(string_agg(game || ':' || coalesce(max_score::text, ''), ',' order by game collate "C"))
--                  from public.game_score_caps);
--      Expect L1 live and nothing after it, then 56a5f15c..., 4da21bd9...,
--      397d0f5f..., 8c566278..., 6c637738....
--   2. TIME IT. Read only:
--        select status, start_time, end_time from cron.job_run_details
--         where command ilike '%player_ranks%' order by start_time desc limit 1;
--      Apply within the minute after its end_time.
--   3. apply_migration, name econ_e1_scales_and_worth, query = this whole
--      file with LF line endings. A lock_timeout failure changed nothing: go
--      back to step 2. Read the notice: the class counts and point changes.
--   4. get_advisors, security and performance. Expected new: at most an
--      INFO for each new table's policy and a WARN that et_day has no pinned
--      search_path (its body is a standard SQL body bound at creation, so no
--      path is read at run time; a SET clause would stop the planner
--      inlining it and the E1b index could not serve the view). Anything else
--      new is a stop: apply the undo.
--   5. Read only, after:
--        select step, seq, applied_at, undone_at from private.economy_steps order by seq;
--        select scale, count(*) from public.game_scale_caps group by 1 order by 1;
--      E1 live at seq 2; 151 legacy rows and 2 on 644.
--   6. E1b the same day (its own file), then Round 676's E2.
--
-- UNDO: supabase/migrations/ROLLBACK_20260930_econ_e1_scales_and_worth.sql.
-- It refuses while E1b or any later step is live, drops everything this made
-- and marks E1 undone, so E1 can be applied again.
--
-- NOT IN THIS FILE, on purpose: the board on the view (E2), the door and the
-- column grants that let a client tag a row (E3), the g and dp cap rows
-- (generated by scripts/genScaleCaps.mjs, applied in E3b), any change to
-- game_score_caps (its mirror waits for T0), and any rewrite of a stored score.

do $e1$
declare
  -- P644: the first proven new scale Soccer Career row (header, f).
  v_p644 constant timestamptz := '2026-09-23 00:24:53+00';
  v_p644_first constant bigint := 593987;
  -- Release D's main landing, at the latest: 3bddc098's commit time.
  v_release_d_main constant timestamptz := '2026-09-22 01:21:53+00';
  v_fp constant jsonb := $json${
    "global_leaderboard": "56a5f15c1f180dfdc82278391f3e52a8",
    "global_rank": "4da21bd9801909bd0187e654c34ba52f",
    "player_ranks": "397d0f5ff1d102bcd9e7fd3cb1db24a9",
    "game_denominators": "8c566278c12cfeb8c900b7ccf0545fa2",
    "caps": "6c637738840d766a97c50032f48459e5"
  }$json$;
  -- The seven NULL caps with scored rows: frozen at the live denominator.
  v_floating constant text[] := array['cbb-grid', 'clue-auction', 'higher-lower-transfers', 'list-quiz',
                                      'nba-stat-line', 'perfect-season-nhl', 'player-bingo'];
  -- The fourteen NULL caps with no scored row: [legacy cap, basis]. A null
  -- cap here means L1's hard maximum for that game (it records no score, so
  -- it has no engine ceiling).
  v_fixed constant jsonb := $json${
    "football-connect-4":   [500,  "engine ceiling: CONNECT4_CEILING, src/lib/connect4Score.ts"],
    "grade-transfer":       [500,  "engine ceiling: gradeTransferCeiling, src/hooks/useGradeTransfer.ts"],
    "guess-transfer-value": [900,  "engine ceiling: GUESS_TRANSFER_VALUE_CEILING, src/hooks/useGuessTransferValue.ts"],
    "hall-of-champions":    [null, "records no score: L1's hard maximum"],
    "idle-arena":           [null, "records no score: L1's hard maximum"],
    "mlb-connect-4":        [500,  "engine ceiling: CONNECT4_CEILING, src/lib/connect4Score.ts"],
    "nba-connect-4":        [500,  "engine ceiling: CONNECT4_CEILING, src/lib/connect4Score.ts"],
    "nfl-connect-4":        [500,  "engine ceiling: CONNECT4_CEILING, src/lib/connect4Score.ts"],
    "nhl-connect-4":        [500,  "engine ceiling: CONNECT4_CEILING, src/lib/connect4Score.ts"],
    "stadium-tycoon":       [null, "records no score: L1's hard maximum"],
    "stat-detective":       [null, "records no score: L1's hard maximum"],
    "who-am-i":             [null, "records no score: L1's hard maximum"],
    "wonderkid-factory":    [null, "records no score: L1's hard maximum"],
    "world-cup-bracket":    [null, "records no score: L1's hard maximum"]
  }$json$;
  v_three constant text[] := array['score_scales', 'game_scale_caps', 'legacy_scale_rules'];
  v_five constant text[] := array['score_scales', 'game_scale_caps', 'legacy_scale_rules', 'scored_plays', 'scored_days'];
  v_roles constant text[] := array['anon', 'authenticated'];
  v_me text := current_user;
  v_bad text;
  v_r text;
  v_n bigint;
  v_installed jsonb;
  -- the proof's numbers
  v_machinery_off bigint;
  v_board_off bigint;
  v_board_days bigint;
  v_account_days bigint;
  v_board_same bigint;
  v_soccer_days bigint;
  v_soccer_delta numeric;
  v_bingo_days bigint;
  v_bingo_delta numeric;
  v_fixed_days bigint;
  v_fixed_delta numeric;
  v_board_ref numeric;
  v_board_view numeric;
begin
  set local lock_timeout = '3s';

  -- ---------------------------------------------------------------
  -- PRECONDITIONS. Reads only.
  -- ---------------------------------------------------------------

  -- a. the ledger: L1 live, E1 not, nothing later
  if to_regclass('private.economy_steps') is null then
    raise exception 'Round 675 E1: private.economy_steps does not exist, so L1 has not been applied. E1 follows L1. Nothing was changed.';
  end if;
  if not exists (select 1 from private.economy_steps where step = 'L1' and seq = 1 and undone_at is null) then
    raise exception 'Round 675 E1: L1 is not live in the ledger. E1 follows L1. Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where step = 'E1' and undone_at is null) then
    raise exception 'Round 675 E1: already applied (private.economy_steps holds a live E1 row). Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where seq > 2 and undone_at is null) then
    raise exception 'Round 675 E1: a later economy step is live, so E1 cannot be applied under it. Nothing was changed.';
  end if;

  -- b. the fingerprints
  if md5(pg_get_functiondef('public.global_leaderboard(text,text[])'::regprocedure)) <> v_fp->>'global_leaderboard'
     or md5(pg_get_functiondef('public.global_rank(text,text,text[])'::regprocedure)) <> v_fp->>'global_rank'
     or md5(pg_get_viewdef('public.player_ranks'::regclass)) <> v_fp->>'player_ranks'
     or md5(pg_get_viewdef('public.game_denominators'::regclass)) <> v_fp->>'game_denominators' then
    raise exception 'Round 675 E1: the board is not Round 537''s as read on 2026-09-30 (global_leaderboard, global_rank, player_ranks or game_denominators changed). The equality proof compares against it; re-read it before going on. Nothing was changed.';
  end if;
  if (select md5(string_agg(game || ':' || coalesce(max_score::text, ''), ',' order by game collate "C")) from public.game_score_caps)
     <> v_fp->>'caps' then
    raise exception 'Round 675 E1: game_score_caps is not the 151 rows read on 2026-09-30 (caps md5 %). Every legacy period is taken from it; re-read it before going on. Nothing was changed.',
      (select md5(string_agg(game || ':' || coalesce(max_score::text, ''), ',' order by game collate "C")) from public.game_score_caps);
  end if;

  -- c. no Round 644, 646 or 648 object
  if to_regclass('private.r644_state') is not null
     or to_regclass('private.r644_soccer_scores_bak') is not null
     or to_regclass('private.r646_caps_bak') is not null
     or to_regclass('public.game_score_cap_history') is not null then
    raise exception 'Round 675 E1: a Round 644, 646 or 648 object exists, so one of those superseded files has run. Nothing was changed.';
  end if;

  -- d. none of E1's objects yet
  if to_regprocedure('public.et_day(timestamptz)') is not null
     or to_regclass('public.score_scales') is not null or to_regclass('public.game_scale_caps') is not null
     or to_regclass('public.legacy_scale_rules') is not null or to_regclass('public.scored_plays') is not null
     or to_regclass('public.scored_days') is not null or to_regclass('public.idx_gc_scored_day_cover') is not null
     or exists (select 1 from pg_attribute a
                 where a.attrelid in ('public.game_completions'::regclass, 'public.user_game_scores'::regclass)
                   and a.attname in ('score_scale', 'ranked_day') and not a.attisdropped) then
    raise exception 'Round 675 E1: one of E1''s objects already exists but no live E1 made it. Read the catalog before going on. Nothing was changed.';
  end if;

  -- e. the NULL caps are the ones this file names
  select string_agg(x, ', ' order by x collate "C") into v_bad from (
    select c.game::text as x from public.game_score_caps c
     where c.max_score is null and not (c.game = any (v_floating)) and not (v_fixed ? c.game)
    union all
    select g || ' (named here, cap not NULL)' from unnest(v_floating) g
     where not exists (select 1 from public.game_score_caps c where c.game = g and c.max_score is null)
    union all
    select g || ' (named here, cap not NULL)' from jsonb_object_keys(v_fixed) g
     where not exists (select 1 from public.game_score_caps c where c.game = g and c.max_score is null)) s;
  if v_bad is not null then
    raise exception 'Round 675 E1: the NULL caps are not the 7 floating and 14 fixed this file names: %. Nothing was changed.', v_bad;
  end if;
  select string_agg(g, ', ') into v_bad from jsonb_object_keys(v_fixed) g
   where jsonb_typeof(v_fixed->g->0) = 'null'
     and coalesce((select h.hard_max from private.game_hard_max h where h.game = g), 0) <= 1;
  if v_bad is not null then
    raise exception 'Round 675 E1: no L1 hard maximum above 1 for: %. Nothing was changed.', v_bad;
  end if;

  -- f. P644, by id order
  if v_p644 <= v_release_d_main then
    raise exception 'Round 675 E1: P644 is not after Release D''s main landing. Nothing was changed.';
  end if;
  if (select min(gc.id) from public.game_completions gc
       where gc.game = 'soccer-career' and gc.score > 0 and gc.created_at >= v_p644) is distinct from v_p644_first then
    raise exception 'Round 675 E1: the first scored soccer-career row at or after P644 is id %, not %. A row dated at or after P644 sits below the proven first new row, or that row is gone. Read them before going on. Nothing was changed.',
      (select min(gc.id) from public.game_completions gc where gc.game = 'soccer-career' and gc.score > 0 and gc.created_at >= v_p644), v_p644_first;
  end if;
  if exists (select 1 from public.game_completions gc
              where gc.game = 'soccer-career' and gc.score > 0 and gc.id < v_p644_first and gc.score % 50 <> 0) then
    raise exception 'Round 675 E1: a scored soccer-career row below id % is not a multiple of 50, so the new scale began before P644. Nothing was changed.', v_p644_first;
  end if;

  -- ---------------------------------------------------------------
  -- WRITES. game_completions first, while holding nothing else.
  -- ---------------------------------------------------------------
  lock table public.game_completions in access exclusive mode;
  lock table public.user_game_scores in access exclusive mode;

  -- 1. the Eastern day
  create function public.et_day(t timestamptz) returns date
    language sql immutable parallel safe
    return (t at time zone 'America/New_York')::date;
  comment on function public.et_day(timestamptz) is
    'Points economy V2 rule 8: the Eastern day of a moment. Round 675 (economy step E1).';

  -- 2. the scales
  create table public.score_scales (
    scale text primary key,
    note text not null
  );
  insert into public.score_scales (scale, note) values
    ('legacy', 'every row recorded before its game carried a tag, at the cap in force when E1 applied'),
    ('644', 'Round 644''s scale: Soccer Career''s legacy score out of 100, Player Bingo scored'),
    ('g', 'a raw result, valued at the engine ceiling'),
    ('dp', 'day points, 0 to 100');

  -- 3. caps in periods
  create table public.game_scale_caps (
    game text not null references public.game_score_caps (game) on delete cascade,
    scale text not null references public.score_scales (scale),
    valid_from timestamptz not null default '-infinity',
    valid_until timestamptz not null default 'infinity',
    cap numeric not null check (cap >= 1),
    note text not null,
    primary key (game, scale, valid_from),
    check (valid_from < valid_until)
  );
  insert into public.game_scale_caps (game, scale, valid_from, valid_until, cap, note)
  select c.game, 'legacy', '-infinity', 'infinity',
         case when c.max_score is not null then c.max_score::numeric
              when c.game = any (v_floating) then d.max_score
              when jsonb_typeof(v_fixed->c.game->0) = 'number' then (v_fixed->c.game->>0)::numeric
              else (select h.hard_max from private.game_hard_max h where h.game = c.game)::numeric
         end,
         case when c.max_score is not null then 'the cap in force when E1 applied'
              when c.game = any (v_floating) then 'a NULL cap on the live 99th percentile, frozen at the denominator the live view gave when E1 applied'
              else 'a NULL cap with no scored row, ' || (v_fixed->c.game->>1)
         end
    from public.game_score_caps c
    join public.game_denominators d on d.game = c.game;
  insert into public.game_scale_caps (game, scale, valid_from, valid_until, cap, note) values
    ('soccer-career', '644', v_p644, 'infinity', 100, 'the legacy score out of 100 (SOCCER_CAREER_CEILING), from P644'),
    ('player-bingo', '644', '-infinity', 'infinity', 1700, 'a blackout (playerBingoCeiling); every player-bingo score is on 644');

  -- 4. the rules for rows recorded before their game carried a tag
  create table public.legacy_scale_rules (
    game text primary key,
    from_ts timestamptz not null,
    max_score integer,
    scale text references public.score_scales (scale),
    note text not null
  );
  insert into public.legacy_scale_rules (game, from_ts, max_score, scale, note) values
    ('soccer-career', v_p644, 100, '644', 'a row from P644 scoring at most 100 is the new client''s legacy score; above 100 it is an old tab and stays legacy'),
    ('player-bingo', '-infinity', null, '644', 'before Round 644 Player Bingo recorded no score, so every scored row is on 644');

  -- the three tables: RLS, one read policy, SELECT only for the client roles
  alter table public.score_scales enable row level security;
  alter table public.game_scale_caps enable row level security;
  alter table public.legacy_scale_rules enable row level security;
  create policy score_scales_read on public.score_scales for select to anon, authenticated using (true);
  create policy game_scale_caps_read on public.game_scale_caps for select to anon, authenticated using (true);
  create policy legacy_scale_rules_read on public.legacy_scale_rules for select to anon, authenticated using (true);
  revoke all on table public.score_scales, public.game_scale_caps, public.legacy_scale_rules from public, anon, authenticated;
  grant select on table public.score_scales, public.game_scale_caps, public.legacy_scale_rules to anon, authenticated;
  comment on table public.score_scales is 'Points economy V2 (section 5, E1): the scales a recorded score can be on.';
  comment on table public.game_scale_caps is 'Points economy V2 rule 2: caps per (game, scale) as periods, never edited in place. A row with no period for its tag is worth nothing.';
  comment on table public.legacy_scale_rules is 'Points economy V2 (section 5, E1): which untagged rows are on a scale other than legacy. One rule a game.';

  -- 5. the columns
  alter table public.game_completions add column score_scale text, add column ranked_day date;
  alter table public.user_game_scores add column score_scale text, add column ranked_day date;

  -- 6. the one worth
  create view public.scored_plays with (security_invoker = true) as
  with src as (
    select 'board'::text as surface, gc.player_name as who, gc.game, gc.score, gc.created_at,
           coalesce(gc.ranked_day, public.et_day(gc.created_at)) as day, gc.score_scale
      from public.game_completions gc
     where gc.score > 0 and gc.player_name is not null
    union all
    select 'account', s.user_id::text, s.game_type, s.score, s.created_at,
           coalesce(s.ranked_day, public.et_day(s.created_at)), s.score_scale
      from public.user_game_scores s
     where s.score > 0)
  select src.surface, src.who, src.game, src.day, src.created_at,
         coalesce(src.score_scale, r.scale, 'legacy') as scale,
         100.0 * least(src.score, k.cap)::numeric / k.cap as worth
    from src
    left join public.legacy_scale_rules r
      on src.score_scale is null and r.game = src.game and src.created_at >= r.from_ts
     and (r.max_score is null or src.score <= r.max_score)
    join public.game_scale_caps k
      on k.game = src.game and k.scale = coalesce(src.score_scale, r.scale, 'legacy')
     and src.created_at >= k.valid_from and src.created_at < k.valid_until
   where src.day <= public.et_day(now());
  create view public.scored_days with (security_invoker = true) as
  select surface, who, game, day, max(worth) as points from public.scored_plays group by 1, 2, 3, 4;
  revoke all on table public.scored_plays, public.scored_days from public, anon, authenticated;
  grant select on table public.scored_plays, public.scored_days to anon, authenticated;
  comment on view public.scored_plays is 'Points economy V2 rule 1: the only place a recorded score becomes points (0 to 100), for the board and the account alike.';
  comment on view public.scored_days is 'Points economy V2: a day''s points per (surface, who, game, Eastern day), the best of the day.';

  -- ---------------------------------------------------------------
  -- PROOFS. Any failure raises, and the whole block rolls back.
  -- ---------------------------------------------------------------

  -- the Eastern day, on both sides of midnight and across the 2026-11-01 change
  if public.et_day('2026-09-30 03:30:00+00') <> '2026-09-29' or public.et_day('2026-09-30 04:30:00+00') <> '2026-09-30'
     or public.et_day('2026-11-01 04:30:00+00') <> '2026-11-01' or public.et_day('2026-11-01 06:30:00+00') <> '2026-11-01'
     or public.et_day('2026-11-02 04:30:00+00') <> '2026-11-01' or public.et_day('2026-11-02 05:30:00+00') <> '2026-11-02'
     or (select provolatile from pg_proc where oid = 'public.et_day(timestamptz)'::regprocedure) <> 'i' then
    raise exception 'Round 675 E1 proof: et_day is not the Eastern day, or not IMMUTABLE.';
  end if;

  -- the scales, and one open legacy period per game
  if (select string_agg(scale, ',' order by scale collate "C") from public.score_scales) <> '644,dp,g,legacy' then
    raise exception 'Round 675 E1 proof: score_scales is not legacy, 644, g and dp.';
  end if;
  select string_agg(c.game, ', ') into v_bad from public.game_score_caps c
   where (select count(*) from public.game_scale_caps k where k.game = c.game and k.scale = 'legacy') <> 1
      or not exists (select 1 from public.game_scale_caps k where k.game = c.game and k.scale = 'legacy'
                      and k.valid_from = '-infinity' and k.valid_until = 'infinity');
  if v_bad is not null then
    raise exception 'Round 675 E1 proof: not exactly one open legacy period for: %', v_bad;
  end if;
  select string_agg(a.game || '/' || a.scale, ', ') into v_bad
    from public.game_scale_caps a
    join public.game_scale_caps b on b.game = a.game and b.scale = a.scale
     and a.valid_from < b.valid_from and b.valid_from < a.valid_until;
  if v_bad is not null then
    raise exception 'Round 675 E1 proof: overlapping periods for: %', v_bad;
  end if;
  if (select count(*) from public.game_scale_caps) <> (select count(*) from public.game_score_caps) + 2
     or (select count(*) from public.game_scale_caps where scale = '644') <> 2
     or (select count(*) from public.legacy_scale_rules) <> 2 then
    raise exception 'Round 675 E1 proof: the caps are not one legacy row a game plus two on 644, or the rules are not two.';
  end if;
  -- each legacy cap is the value it claims
  select string_agg(c.game, ', ') into v_bad
    from public.game_score_caps c
    join public.game_scale_caps k on k.game = c.game and k.scale = 'legacy'
    join public.game_denominators d on d.game = c.game
   where (c.max_score is not null and k.cap <> c.max_score)
      or (c.game = any (v_floating) and k.cap <> d.max_score)
      or (v_fixed ? c.game and (k.cap <= 1 or k.cap <> coalesce((v_fixed->c.game->>0)::numeric,
                                                                  (select h.hard_max from private.game_hard_max h where h.game = c.game)::numeric)));
  if v_bad is not null then
    raise exception 'Round 675 E1 proof: a legacy cap is not the cap in force, the frozen denominator or the fixed value it claims: %', v_bad;
  end if;

  -- privileges: read only for the client roles, RLS on, invoker views
  select string_agg(r || ' ' || p || ' ' || t, ', ') into v_bad
    from unnest(v_roles) r, unnest(v_five) t,
         unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p
   where has_table_privilege(r, 'public.' || t, p);
  if v_bad is not null then
    raise exception 'Round 675 E1 proof: write privilege held: %', v_bad;
  end if;
  select string_agg(r || ' ' || t, ', ') into v_bad
    from unnest(v_roles) r, unnest(v_five) t where not has_table_privilege(r, 'public.' || t, 'SELECT');
  if v_bad is not null then
    raise exception 'Round 675 E1 proof: SELECT not held: %', v_bad;
  end if;
  select string_agg(c.relname::text, ', ') into v_bad
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_three)
     and (not c.relrowsecurity
          or (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) <> 1
          or exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname and p.cmd <> 'SELECT'));
  if v_bad is not null then
    raise exception 'Round 675 E1 proof: RLS off, or not exactly one read policy, on: %', v_bad;
  end if;
  select string_agg(c.relname::text, ', ') into v_bad
    from pg_class c
   where c.oid in ('public.scored_plays'::regclass, 'public.scored_days'::regclass)
     and not coalesce('security_invoker=true' = any (c.reloptions), false);
  if v_bad is not null then
    raise exception 'Round 675 E1 proof: not security_invoker: %', v_bad;
  end if;
  -- the four columns: no default, nullable, and no client role may write them
  select string_agg(c.relname || '.' || a.attname, ', ') into v_bad
    from pg_attribute a join pg_class c on c.oid = a.attrelid
   where c.oid in ('public.game_completions'::regclass, 'public.user_game_scores'::regclass)
     and a.attname in ('score_scale', 'ranked_day')
     and (a.attnotnull or a.atthasdef
          or has_column_privilege('anon', c.oid, a.attnum, 'INSERT') or has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT')
          or has_column_privilege('anon', c.oid, a.attnum, 'UPDATE') or has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE'));
  if v_bad is not null or (select count(*) from pg_attribute a
                            where a.attrelid in ('public.game_completions'::regclass, 'public.user_game_scores'::regclass)
                              and a.attname in ('score_scale', 'ranked_day') and not a.attisdropped) <> 4 then
    raise exception 'Round 675 E1 proof: the four columns are not nullable, default free and closed to the client roles (%)', v_bad;
  end if;
  foreach v_r in array v_roles loop
    if (select string_agg(a.attname::text, ',' order by a.attname::text collate "C")
          from pg_attribute a
         where a.attrelid = 'public.game_completions'::regclass and a.attnum > 0 and not a.attisdropped
           and has_column_privilege(v_r, a.attrelid, a.attnum, 'INSERT')) is distinct from 'game,player_name,score' then
      raise exception 'Round 675 E1 proof: % may insert game_completions columns other than exactly game, player_name, score.', v_r;
    end if;
  end loop;
  -- executed as each client role: the views and tables read, a write is refused
  foreach v_r in array v_roles loop
    perform set_config('role', v_r, true);
    perform 1 from public.scored_plays limit 1;
    perform 1 from public.score_scales limit 1;
    perform 1 from public.game_scale_caps limit 1;
    perform 1 from public.legacy_scale_rules limit 1;
    begin
      update public.game_scale_caps set cap = cap where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may UPDATE game_scale_caps');
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.legacy_scale_rules (game, from_ts, note) select 'x', now(), 'x' where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may INSERT legacy_scale_rules');
    exception when insufficient_privilege then null;
    end;
    perform set_config('role', v_me, true);
  end loop;
  if v_bad is not null then
    raise exception 'Round 675 E1 proof, executed: %', v_bad;
  end if;

  -- THE EQUALITY PROOF (header). Every row's cap two ways: cap_live is Round
  -- 537's (the live game_denominators view), cap_rec is what E1 means, in
  -- plain CASE form with its own literals, not read from the tables E1 wrote.
  with rows_ as (
    select 'board'::text as surface, gc.player_name as who, gc.game,
           (gc.created_at at time zone 'America/New_York')::date as day,
           gc.score, gc.created_at, d.max_score as cap_live
      from public.game_completions gc
      join public.game_denominators d on d.game = gc.game
     where gc.score is not null and gc.score > 0 and gc.player_name is not null
       and (gc.created_at at time zone 'America/New_York')::date <= (now() at time zone 'America/New_York')::date
    union all
    select 'account', s.user_id::text, s.game_type,
           (s.created_at at time zone 'America/New_York')::date,
           s.score, s.created_at, d.max_score
      from public.user_game_scores s
      join public.game_denominators d on d.game = s.game_type
     where s.score > 0
       and (s.created_at at time zone 'America/New_York')::date <= (now() at time zone 'America/New_York')::date
  ),
  classed as (
    select r.*,
           case when r.game = 'soccer-career' and r.created_at >= '2026-09-23 00:24:53+00' and r.score <= 100 then 'soccer-644'
                when r.game = 'player-bingo' then 'bingo-644'
                when v_fixed ? r.game then 'fixed'
           end as cls,
           case when r.game = 'soccer-career' and r.created_at >= '2026-09-23 00:24:53+00' and r.score <= 100 then 100::numeric
                when r.game = 'player-bingo' then 1700::numeric
                when v_fixed ? r.game then coalesce((v_fixed->r.game->>0)::numeric,
                                                    (select h.hard_max from private.game_hard_max h where h.game = r.game)::numeric)
                else r.cap_live
           end as cap_rec
      from rows_ r
  ),
  days as (
    select surface, who, game, day,
           max(100.0 * least(score, cap_live)::numeric / cap_live) as ref_pts,
           max(100.0 * least(score, cap_rec)::numeric / cap_rec) as rec_pts,
           max(cls) as cls
      from classed
     group by surface, who, game, day
  ),
  j as (
    select coalesce(d.surface, v.surface) as surface, d.ref_pts, d.rec_pts, d.cls, v.points
      from days d
      full join public.scored_days v
        on v.surface = d.surface and v.who = d.who and v.game = d.game and v.day = d.day
  )
  select count(*) filter (where points is distinct from rec_pts),
         count(*) filter (where surface = 'board' and cls is null and points is distinct from ref_pts),
         count(*) filter (where surface = 'board'),
         count(*) filter (where surface = 'account'),
         count(*) filter (where surface = 'board' and cls is null and points = ref_pts),
         count(*) filter (where surface = 'board' and cls = 'soccer-644'),
         coalesce(sum(points - ref_pts) filter (where surface = 'board' and cls = 'soccer-644'), 0),
         count(*) filter (where surface = 'board' and cls = 'bingo-644'),
         coalesce(sum(points - ref_pts) filter (where surface = 'board' and cls = 'bingo-644'), 0),
         count(*) filter (where surface = 'board' and cls = 'fixed'),
         coalesce(sum(points - ref_pts) filter (where surface = 'board' and cls = 'fixed'), 0),
         coalesce(sum(ref_pts) filter (where surface = 'board'), 0),
         coalesce(sum(points) filter (where surface = 'board'), 0)
    into v_machinery_off, v_board_off, v_board_days, v_account_days, v_board_same,
         v_soccer_days, v_soccer_delta, v_bingo_days, v_bingo_delta, v_fixed_days, v_fixed_delta,
         v_board_ref, v_board_view
    from j;
  if v_machinery_off > 0 then
    raise exception 'Round 675 E1 proof: on % day(s) the views do not value the rows the way E1 means (the recomputation). Nothing was changed.', v_machinery_off;
  end if;
  if v_board_off > 0 then
    raise exception 'Round 675 E1 proof: % board day(s) outside the declared revaluations are not worth what Round 537''s board pays today. Nothing was changed.', v_board_off;
  end if;

  -- ---------------------------------------------------------------
  -- THE LEDGER ROW: md5s of what E1 created (definitions and grants, no
  -- data, so the rehearsal and production record the same values)
  -- ---------------------------------------------------------------
  v_installed := jsonb_build_object(
    'et_day_md5', md5(pg_get_functiondef('public.et_day(timestamptz)'::regprocedure)),
    'scored_plays_md5', md5(pg_get_viewdef('public.scored_plays'::regclass)),
    'scored_days_md5', md5(pg_get_viewdef('public.scored_days'::regclass)),
    'acl', (select jsonb_object_agg(c.relname::text, c.relacl::text) from pg_class c
             where c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_five)),
    'policies_md5', (select md5(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual, 'check', with_check)
                                          order by tablename::text collate "C", policyname::text collate "C")::text)
                       from pg_policies where schemaname = 'public' and tablename::text = any (v_three)),
    'columns', jsonb_build_array('game_completions.ranked_day', 'game_completions.score_scale',
                                 'user_game_scores.ranked_day', 'user_game_scores.score_scale'),
    'p644', v_p644);
  insert into private.economy_steps (step, seq, installed, prior)
  values ('E1', 2, v_installed, jsonb_build_object('replaced', 'nothing: E1 only adds', 'fingerprints', v_fp))
  on conflict (step) do update
    set applied_at = now(), undone_at = null, installed = excluded.installed, prior = excluded.prior;

  raise notice 'Round 675 E1 applied. Board: % player days, % worth what Round 537 pays today, % point(s) before and % after. Revalued as declared: soccer-644 % day(s), change % points; bingo-644 % day(s), change % points; fixed % day(s), change % points. Account: % days, every one as E1 means.',
    v_board_days, v_board_same, round(v_board_ref, 3), round(v_board_view, 3),
    v_soccer_days, round(v_soccer_delta, 3), v_bingo_days, round(v_bingo_delta, 3), v_fixed_days, round(v_fixed_delta, 3),
    v_account_days;
end
$e1$;
