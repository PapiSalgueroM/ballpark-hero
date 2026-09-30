-- Round 677, economy step E3: the door in SQL.
--
-- Spec: docs/design/POINTS-ECONOMY-V2.md on the points-economy branch,
-- sections 5 (E3), 6 (the door), 8 (one ranked result a day), 9 (the chain,
-- row E3) and 13 (Round 677).
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The lead applies it after the
-- round's adversarial review, on a normal day after E2, with the steps under
-- APPLY below. It is additive: nothing calls record_play until Round 679's
-- client ships, and game_rules stays empty until E3b (Round 691), so until
-- then every record_play answers "old client". One thing is live the moment
-- it lands: the board insert refuses a name that belongs to another account
-- (THE NAME RULE below).
--
-- REHEARSED IN PGLITE, NEVER ON PRODUCTION. scripts/simEconomyMigrations.mjs
-- loads production's objects (scripts/data/economySchema.sql and
-- scripts/data/economySchemaE3.sql, read with SELECTs only), applies L1, a
-- stand-in for E1 and E2 (scripts/data/economyE2StandIn.sql, the section 5
-- shapes), then this file, and runs the door there: every refusal before a
-- write, every door case of the spec's section 12, the undo and the reapply.
-- No test row is ever written to production: the proofs below are catalog
-- checks and role probes that touch no row.
--
-- =====================================================================
-- WHAT THIS CREATES, in one DO block (one statement, one transaction)
-- =====================================================================
--   public.game_rules      one row per game key: family, scale, pays, claim,
--                          round. Public read, no client write. EMPTY until
--                          E3b seeds it from the frozen release tree.
--   private.ranked_claims  one ranked claim per (account, game, Eastern day),
--                          with the run that holds it and its state (open,
--                          settled, forfeit); at most one open season claim
--                          per (account, game).
--   private.season_closes  a season number closes once per save.
--   private.play_refusals  counts only, no identity: unknown games, clamps,
--                          names that could not be used, no open cap.
--   public.name_is_owned(p_name text, p_caller uuid) boolean, SECURITY
--                          DEFINER, STABLE, fixed SQL.
--   public.record_play(p_game text, p_phase text, p_run uuid, p_step integer,
--                      p_score integer, p_correct integer, p_player_name text)
--                          jsonb, SECURITY DEFINER, fixed SQL, EXECUTE to
--                          authenticated only. One signature, never
--                          overloaded.
--   private.play_count, private.play_board_row, private.play_points,
--   private.play_start, private.play_finish: the door's internals, SECURITY
--                          INVOKER, executable by no client role. They run as
--                          the definer that calls them. play_finish is also
--                          what the T0 shim calls (supabase/held/
--                          econ_t0_shim.sql, Round 691, NOT applied here).
--   indexes on lower(display_name) and lower(username) in profiles, where
--                          none exists (production had none on 2026-09-30).
--   game_completions: the client's column grant grows to (game, score,
--                          player_name, score_scale, ranked_day), and the
--                          insert policy adds three clauses (below).
-- E3c (a separate file, outside a transaction) adds the unique index on
-- user_game_scores (user_id, game_type, ranked_day).
--
-- =====================================================================
-- THE DOOR (spec section 6)
-- =====================================================================
-- Every call: a signed in user or it raises; a game key of 1 to 64
-- characters, a phase of start or finish and a run id, or 22023; the game in
-- game_rules, else it counts "unknown game", writes one unscored board row on
-- a finish, and answers {ranked: false, reason: "old client"}; a season start
-- needs a season number from 1; then a per player transaction advisory lock.
-- Every statement is scoped to auth.uid(). No parameter names a user: p_run is
-- the browser's run id (a save id for a season or career), matched only
-- among the caller's own claims.
--
-- start. first-action and deal: claim (account, game, today) on conflict do
--   nothing, or keep the claim this run already holds (today's, or
--   yesterday's within 24 hours). week-one: a closed season (season_closes)
--   is never claimed again; the open season claim of another save, or of
--   another season, is forfeited at 0 (the client has shown the confirm); a
--   new claim only when none was made today. finish: no claim at start.
--   Answers {claimed, owner, settled, points, day, reason}.
-- finish. The score is clamped to 0 .. the open cap of (game, its scale) and a
--   clamp is counted, never refused; a for fun game writes an unscored board
--   row and answers {ranked: false, reason: "fun"}. The claim is this run's:
--   a season's open claim for (run, season) whatever its day; otherwise
--   today's, or yesterday's still open within 24 hours of its claim (a run
--   keeps the day it was dealt). A settled claim of this run answers what it
--   stored and writes nothing (retries are idempotent). No claim and today's
--   slot free (and, for a season, no open season claim): the finish claims.
--   Any other case is practice. A season finish inserts into season_closes;
--   a season this save already closed is refused as practice and its claim
--   forfeited. A ranked settle writes, with one now(): user_game_scores
--   (score, score_scale from game_rules, ranked_day and puzzle_date the claim
--   day, correct_answers clamped to 0 .. 1000); the board row with the same
--   score, scale and ranked_day; daily_completions on the claim day; the
--   streak in user_scores on Eastern days, NEVER total_points. It answers
--   {ranked: true, day, points}, points read back from scored_days AFTER the
--   writes. Practice writes one unscored board row and answers {ranked:
--   false, reason}. A finish is always exactly one board row, except a retry
--   and a name that cannot be used (below).
-- The board row's name: the account's profile display name, else its
--   username (each cut to 40 characters), else p_player_name when it is 1 to
--   40 characters and not owned by another account, else no board row
--   (counted as "name taken").
--
-- =====================================================================
-- THE NAME RULE (live at once)
-- =====================================================================
-- The board insert policy refuses a player_name another account owns:
-- name_is_owned(p_name, p_caller) is true when a profile other than the
-- caller has that display name or username, case folded, AND the caller's own
-- profile does not. A guest (auth.uid() null) can use no account's name. An
-- account's own tab (it carries its JWT) inserts under its own name as
-- before. DEVIATION from the spec's one line definition, on purpose: without
-- "and the caller's own profile does not", two accounts sharing a display
-- name (profiles are self edited and display_name is not unique) would each
-- have every board row of their own refused. Production had no shared name on
-- 2026-09-30; the rehearsal proves the shared case both ways.
-- Measured read only on 2026-09-30: 41 account names; 8 of the 2,364 names on
-- the board in the last 7 days were account names, 488 of 144,699 rows. A
-- row from the owning account's own tab still lands; a row from any other
-- browser under that name is refused (Round 679's client mints a fresh
-- handle once on that refusal).
-- The policy also bounds the two new columns: score_scale null or a scale in
-- score_scales; ranked_day null or yesterday or today (Eastern). Both
-- subqueries run as the inserting role, so anon must read score_scales and
-- execute et_day: E3 checks both before any write, and its executed proof
-- runs the full insert shape as each client role (a missing grant there would
-- refuse every board row on the site).
--
-- =====================================================================
-- WHAT E3 ASSUMES OF E1 AND E2 (checked before any write)
-- =====================================================================
--   ledger rows L1 and E2 live, nothing live after E2; public.et_day
--   (timestamptz) returning date, IMMUTABLE, executable by anon and
--   authenticated; public.score_scales (scale) readable by both roles;
--   public.game_scale_caps (game, scale, valid_from, valid_until, cap);
--   public.scored_days (surface, who, game, day, points); score_scale text and
--   ranked_day date on game_completions and user_game_scores, with no client
--   grant yet; the save and the game_completions write policy and column
--   grants exactly as L1 recorded them.
--
-- =====================================================================
-- DEVIATIONS FROM THE SPEC, each with its reason
-- =====================================================================
--   lock_timeout is 1 s, not section 9's 3 s: L1's measured rule. Altering
--   the insert policy takes ACCESS EXCLUSIVE on game_completions, anon's
--   statement_timeout is 3 s, so a board insert queued behind a 3 s wait
--   could be cancelled; at 1 s it is delayed at most a second.
--   name_is_owned exempts a name the caller's own profile carries (above).
--   A season claim carries its season number (1 and up) in step and every
--   other claim carries 0, so the partial unique index "one open season claim
--   per (account, game)" is (user_id, game) where state = 'open' and step > 0
--   (ranked_claims has no family column; the spec's table shape is kept).
--
-- =====================================================================
-- APPLY (the lead, after the round's adversarial review)
-- =====================================================================
--   1. Read only, before:
--        select step, seq, undone_at from private.economy_steps order by seq;
--        select md5(pg_get_functiondef('public.record_auth_completion(text,integer,integer)'::regprocedure));
--        select to_regclass('public.game_rules'), to_regprocedure('public.record_play(text,text,uuid,integer,integer,integer,text)');
--      Expect L1, E1, E1b, E2 live, the save at L1's recorded md5, two nulls.
--   2. TIME IT as L1's APPLY step 2 (just after a refresh-player-ranks run).
--   3. apply_migration, name econ_e3_the_door, query = this whole file WITH
--      LF LINE ENDINGS (a CRLF body is refused by the proof below).
--   4. get_advisors, type security. Expect new WARNs that anon and
--      authenticated can execute the SECURITY DEFINER function
--      public.name_is_owned (the insert policy calls it as the inserting
--      role: by design) and that authenticated can execute
--      public.record_play (the door: by design). An INFO about RLS with no
--      policy on the three private tables is also by design. Anything else
--      new is a stop: apply the undo.
--   5. E3c (20260930_econ_e3c_one_ranked_day.sql), its three statements.
--   6. Refresh scripts/data/playDoorCatalog.json from production
--      (node scripts/simPlayDoor.mjs --query, read only, source
--      "production"); simPlayDoor and simEconomyMigrations must end green.
--   7. Within the hour, read only: game_completions keeps growing at its
--      usual rate, and get_logs shows no new 4xx spike on POST
--      /rest/v1/game_completions beyond the owned name refusals (a few a
--      day, per the measure above). A spike is a stop: apply the undo.
--
-- UNDO: supabase/migrations/ROLLBACK_20260930_econ_e3_the_door.sql (E3c's
-- undo first, newest first). It refuses once the door has recorded a claim.

do $e3$
declare
  v_me text := current_user;
  v_roles constant text[] := array['anon', 'authenticated'];
  v_six constant text[] := array['daily_completions', 'game_completions', 'game_score_caps',
                                 'user_best_scores', 'user_game_scores', 'user_scores'];
  v_internals constant text[] := array['play_count', 'play_board_row', 'play_points', 'play_start', 'play_finish'];
  v_l1 record;
  v_e2 record;
  v_save oid := to_regprocedure('public.record_auth_completion(text,integer,integer)');
  v_door oid;
  v_owned oid;
  v_seq integer;
  v_prior jsonb;
  v_installed jsonb;
  v_made_idx text[] := array[]::text[];
  v_bad text;
  v_r text;
  v_check text;
begin
  set local lock_timeout = '1s';

  -- ---------------------------------------------------------------
  -- PRECONDITIONS. Reads only. Nothing below writes until all pass.
  -- ---------------------------------------------------------------

  -- a. the ledger: L1 and E2 live, E3 not, nothing live after E2
  if to_regclass('private.economy_steps') is null then
    raise exception 'Round 677 E3: private.economy_steps does not exist, so L1 was never applied. E3 comes after E2. Nothing was changed.';
  end if;
  select * into v_l1 from private.economy_steps where step = 'L1' and undone_at is null;
  if not found then
    raise exception 'Round 677 E3: L1 is not live in the ledger. Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where step = 'E3' and undone_at is null) then
    raise exception 'Round 677 E3: already applied (private.economy_steps holds a live E3 row). Nothing was changed.';
  end if;
  select * into v_e2 from private.economy_steps where step = 'E2' and undone_at is null;
  if not found then
    raise exception 'Round 677 E3: E2 is not live in the ledger. E3 is applied on a normal day after E2. Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where seq > v_e2.seq and undone_at is null) then
    raise exception 'Round 677 E3: a step after E2 is live (%), so E3 cannot go under it. Nothing was changed.',
      (select string_agg(step, ', ' order by seq) from private.economy_steps where seq > v_e2.seq and undone_at is null);
  end if;

  -- b. the save is the one L1 installed, one signature
  if v_save is null or (select count(*) from pg_proc where proname = 'record_auth_completion' and pronamespace = 'public'::regnamespace) <> 1 then
    raise exception 'Round 677 E3: record_auth_completion is missing or has more than one signature (an overload makes every 3 argument call ambiguous). Nothing was changed.';
  end if;
  if md5(pg_get_functiondef(v_save)) is distinct from v_l1.installed->>'save_def_md5' then
    raise exception 'Round 677 E3: record_auth_completion is not the save L1 recorded (md5 %, L1 recorded %). Something changed it; read it before going on. Nothing was changed.',
      md5(pg_get_functiondef(v_save)), v_l1.installed->>'save_def_md5';
  end if;

  -- c. what E3 assumes E1 and E2 installed
  if to_regprocedure('public.et_day(timestamptz)') is null
     or (select provolatile from pg_proc where oid = to_regprocedure('public.et_day(timestamptz)')) <> 'i'
     or (select prorettype from pg_proc where oid = to_regprocedure('public.et_day(timestamptz)')) <> 'date'::regtype then
    raise exception 'Round 677 E3: public.et_day(timestamptz) is missing, not IMMUTABLE, or does not return date (E1). Nothing was changed.';
  end if;
  if to_regclass('public.score_scales') is null or to_regclass('public.game_scale_caps') is null or to_regclass('public.scored_days') is null then
    raise exception 'Round 677 E3: score_scales, game_scale_caps or scored_days is missing (E1). Nothing was changed.';
  end if;
  select string_agg(x.rel || '.' || x.col || ' ' || x.typ, ', ') into v_bad
    from (values ('public.game_completions', 'score_scale', 'text'), ('public.game_completions', 'ranked_day', 'date'),
                 ('public.user_game_scores', 'score_scale', 'text'), ('public.user_game_scores', 'ranked_day', 'date'),
                 ('public.game_scale_caps', 'game', 'text'), ('public.game_scale_caps', 'scale', 'text'),
                 ('public.game_scale_caps', 'valid_from', 'timestamp with time zone'),
                 ('public.game_scale_caps', 'valid_until', 'timestamp with time zone'), ('public.game_scale_caps', 'cap', 'numeric'),
                 ('public.score_scales', 'scale', 'text'),
                 ('public.scored_days', 'surface', 'text'), ('public.scored_days', 'who', 'text'), ('public.scored_days', 'game', 'text'),
                 ('public.scored_days', 'day', 'date'), ('public.scored_days', 'points', 'numeric')) as x(rel, col, typ)
   where not exists (select 1 from pg_attribute a where a.attrelid = x.rel::regclass and a.attname = x.col
                        and not a.attisdropped and format_type(a.atttypid, a.atttypmod) = x.typ);
  if v_bad is not null then
    raise exception 'Round 677 E3: the columns E1 installs are not all there as E3 reads them: %. Nothing was changed.', v_bad;
  end if;
  foreach v_r in array v_roles loop
    if not has_table_privilege(v_r, 'public.score_scales', 'SELECT')
       or not has_function_privilege(v_r, 'public.et_day(timestamptz)', 'EXECUTE')
       or not has_function_privilege(v_r, 'auth.uid()', 'EXECUTE') then
      raise exception 'Round 677 E3: % cannot read score_scales or execute et_day or auth.uid(). The new insert policy runs them as the inserting role, so every board row would be refused. Nothing was changed.', v_r;
    end if;
    if exists (select 1 from pg_attribute a where a.attrelid = 'public.game_completions'::regclass
                and a.attname in ('score_scale', 'ranked_day')
                and has_column_privilege(v_r, a.attrelid, a.attnum, 'INSERT')) then
      raise exception 'Round 677 E3: % may already insert score_scale or ranked_day, which only E3 grants. Read the grants before going on. Nothing was changed.', v_r;
    end if;
  end loop;

  -- d. E3's own objects are absent
  if to_regclass('public.game_rules') is not null or to_regclass('private.ranked_claims') is not null
     or to_regclass('private.season_closes') is not null or to_regclass('private.play_refusals') is not null
     or exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname in ('record_play', 'name_is_owned'))
     or exists (select 1 from pg_proc where pronamespace = 'private'::regnamespace and proname = any (v_internals))
     or to_regclass('public.ugs_one_ranked_day') is not null then
    raise exception 'Round 677 E3: an object E3 creates already exists, but no live E3 made it. Read the catalog before going on. Nothing was changed.';
  end if;

  -- e. profiles, which the door and name_is_owned read as their owner
  if to_regclass('public.profiles') is null then
    raise exception 'Round 677 E3: public.profiles does not exist. Nothing was changed.';
  end if;
  select string_agg(x.col, ', ') into v_bad
    from (values ('user_id', 'uuid'), ('display_name', 'text'), ('username', 'text')) as x(col, typ)
   where not exists (select 1 from pg_attribute a where a.attrelid = 'public.profiles'::regclass and a.attname = x.col
                        and not a.attisdropped and format_type(a.atttypid, a.atttypmod) = x.typ);
  if v_bad is not null then
    raise exception 'Round 677 E3: profiles lacks %. Nothing was changed.', v_bad;
  end if;

  -- f. game_completions as L1 left it: RLS on and not forced, owned by the
  --    save's owner (the door inserts as that owner), the write policy and
  --    the column grants exactly as L1 recorded them
  if exists (select 1 from pg_class c where c.oid in ('public.game_completions'::regclass, 'public.user_game_scores'::regclass,
                                                       'public.daily_completions'::regclass, 'public.user_scores'::regclass,
                                                       'public.profiles'::regclass)
                and (not c.relrowsecurity or c.relforcerowsecurity or pg_get_userbyid(c.relowner) <> 'postgres')) then
    raise exception 'Round 677 E3: a table the door writes or reads has RLS off, FORCE RLS on, or an owner other than postgres. Nothing was changed.';
  end if;
  if (select md5(coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual, 'check', with_check)
                                    order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)::text)
        from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd <> 'SELECT')
     is distinct from v_l1.installed->>'write_policies_md5' then
    raise exception 'Round 677 E3: the write policies on the six tables are not what L1 recorded. Read pg_policies before going on. Nothing was changed.';
  end if;
  if coalesce((select jsonb_object_agg(a.attname::text, a.attacl::text) from pg_attribute a
                where a.attrelid = 'public.game_completions'::regclass and a.attacl is not null), '{}'::jsonb)
     is distinct from v_l1.installed->'gc_column_acl' then
    raise exception 'Round 677 E3: the column grants on game_completions are not what L1 recorded. Nothing was changed.';
  end if;

  -- ---------------------------------------------------------------
  -- WRITES
  -- ---------------------------------------------------------------

  -- 0. game_completions first, while holding nothing else (as L1)
  lock table public.game_completions in access exclusive mode;

  v_prior := jsonb_build_object(
    'gc_policy_check', (select with_check from pg_policies where schemaname = 'public' and tablename = 'game_completions' and policyname = 'Anyone can log a completion'),
    'gc_column_acl', v_l1.installed->'gc_column_acl',
    'profile_indexes', coalesce((select jsonb_agg(indexname::text order by indexname) from pg_indexes where schemaname = 'public' and tablename = 'profiles'), '[]'::jsonb));

  -- 1. the tables
  create table public.game_rules (
    game text primary key references public.game_score_caps(game) on delete cascade,
    family text not null,
    scale text references public.score_scales(scale),
    pays boolean not null,
    claim text not null check (claim in ('first-action', 'deal', 'week-one', 'finish')),
    round text not null
  );
  alter table public.game_rules enable row level security;
  revoke all on table public.game_rules from public, anon, authenticated;
  grant select on table public.game_rules to anon, authenticated;
  create policy "game rules are public read" on public.game_rules for select to anon, authenticated using (true);
  comment on table public.game_rules is
    'Points economy V2, step E3 (Round 677): per game key its family, scale, whether it pays and when its ranked claim is made. Seeded by E3b (Round 691) from the release tree; empty until then. Written only by migrations.';

  create table private.ranked_claims (
    user_id uuid,
    game text,
    et_day date,
    run_id uuid not null,
    step integer not null default 0,
    state text not null check (state in ('open', 'settled', 'forfeit')),
    score integer,
    claimed_at timestamptz not null default now(),
    settled_at timestamptz,
    primary key (user_id, game, et_day)
  );
  create unique index ranked_claims_one_open_season on private.ranked_claims (user_id, game) where state = 'open' and step > 0;
  create index ranked_claims_run on private.ranked_claims (user_id, game, run_id);
  alter table private.ranked_claims enable row level security;
  revoke all on table private.ranked_claims from public, anon, authenticated;

  create table private.season_closes (
    user_id uuid,
    game text,
    save_id uuid,
    season integer,
    closed_at timestamptz not null default now(),
    primary key (user_id, game, save_id, season)
  );
  alter table private.season_closes enable row level security;
  revoke all on table private.season_closes from public, anon, authenticated;

  create table private.play_refusals (
    day date,
    game text,
    reason text,
    n integer not null default 0,
    primary key (day, game, reason)
  );
  alter table private.play_refusals enable row level security;
  revoke all on table private.play_refusals from public, anon, authenticated;

  -- 2. name_is_owned: a boolean, never an id
  create function public.name_is_owned(p_name text, p_caller uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
  as $fn$
  select exists (select 1 from public.profiles p
                  where p.user_id is distinct from p_caller
                    and (lower(p.display_name) = lower(p_name) or lower(p.username) = lower(p_name)))
     and not exists (select 1 from public.profiles p
                      where p.user_id = p_caller
                        and (lower(p.display_name) = lower(p_name) or lower(p.username) = lower(p_name)))
  $fn$;
  revoke all on function public.name_is_owned(text, uuid) from public, anon, authenticated, service_role;
  grant execute on function public.name_is_owned(text, uuid) to anon, authenticated;

  if not exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'profiles' and indexdef ilike '%(lower(display_name))%') then
    create index profiles_lower_display_name on public.profiles (lower(display_name));
    v_made_idx := array_append(v_made_idx, 'profiles_lower_display_name');
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'profiles' and indexdef ilike '%(lower(username))%') then
    create index profiles_lower_username on public.profiles (lower(username));
    v_made_idx := array_append(v_made_idx, 'profiles_lower_username');
  end if;

  -- 3. the door's internals: INVOKER, run as the definer that calls them
  create function private.play_count(p_game text, p_reason text)
  returns void
  language sql
  security invoker
  set search_path = ''
  as $fn$
  insert into private.play_refusals as r (day, game, reason, n)
  values (public.et_day(now()), p_game, p_reason, 1)
  on conflict (day, game, reason) do update set n = r.n + 1
  $fn$;

  create function private.play_board_row(p_game text, p_score integer, p_scale text, p_day date, p_player_name text)
  returns boolean
  language plpgsql
  security invoker
  set search_path = ''
  as $fn$
declare
  v_name text;
begin
  select coalesce(nullif(left(p.display_name, 40), ''), nullif(left(p.username, 40), '')) into v_name
    from public.profiles p where p.user_id = auth.uid();
  if v_name is null and length(p_player_name) between 1 and 40
     and not public.name_is_owned(p_player_name, auth.uid()) then
    v_name := p_player_name;
  end if;
  if v_name is null then
    perform private.play_count(p_game, 'name taken');
    return false;
  end if;
  insert into public.game_completions (game, score, player_name, score_scale, ranked_day)
  values (p_game, p_score, v_name, p_scale, p_day);
  return true;
end;
  $fn$;

  create function private.play_points(p_game text, p_day date)
  returns numeric
  language sql
  stable
  security invoker
  set search_path = ''
  as $fn$
  select coalesce(round(max(d.points), 2), 0)
    from public.scored_days d
   where d.surface = 'account' and d.who = auth.uid()::text and d.game = p_game and d.day = p_day
  $fn$;

  create function private.play_start(p_game text, p_claim text, p_pays boolean, p_run uuid, p_step integer)
  returns jsonb
  language plpgsql
  security invoker
  set search_path = ''
  as $fn$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_today date := public.et_day(now());
  v_step integer := case when p_claim = 'week-one' then p_step else 0 end;
  v_claim private.ranked_claims%rowtype;
  v_mine boolean;
begin
  if v_user is null then
    raise exception 'record_play needs a signed in user';
  end if;
  if not p_pays then
    return jsonb_build_object('claimed', false, 'reason', 'fun', 'day', v_today);
  end if;
  if p_claim = 'finish' then
    return jsonb_build_object('claimed', false, 'reason', 'claims at finish', 'day', v_today);
  end if;
  if p_claim = 'week-one' then
    if exists (select 1 from private.season_closes x
                where x.user_id = v_user and x.game = p_game and x.save_id = p_run and x.season = v_step) then
      return jsonb_build_object('claimed', false, 'owner', 'closed', 'settled', true, 'reason', 'season closed', 'day', v_today);
    end if;
    select * into v_claim from private.ranked_claims c
     where c.user_id = v_user and c.game = p_game and c.state = 'open' and c.step > 0
       for update;
    if found then
      if v_claim.run_id = p_run and v_claim.step = v_step then
        return jsonb_build_object('claimed', true, 'owner', 'this run', 'settled', false, 'day', v_claim.et_day);
      end if;
      update private.ranked_claims c set state = 'forfeit', score = 0, settled_at = v_now
       where c.user_id = v_user and c.game = p_game and c.et_day = v_claim.et_day;
    end if;
  else
    select * into v_claim from private.ranked_claims c
     where c.user_id = v_user and c.game = p_game and c.run_id = p_run
       and (c.et_day = v_today or (c.et_day = v_today - 1 and c.claimed_at > v_now - interval '24 hours'))
     order by c.et_day desc
     limit 1;
    if found then
      return jsonb_build_object('claimed', v_claim.state = 'open', 'owner', 'this run', 'settled', v_claim.state <> 'open',
                                'points', case when v_claim.state = 'settled' then private.play_points(p_game, v_claim.et_day) end,
                                'day', v_claim.et_day);
    end if;
  end if;
  insert into private.ranked_claims (user_id, game, et_day, run_id, step, state, claimed_at)
  values (v_user, p_game, v_today, p_run, v_step, 'open', v_now)
  on conflict (user_id, game, et_day) do nothing;
  select * into v_claim from private.ranked_claims c
   where c.user_id = v_user and c.game = p_game and c.et_day = v_today;
  v_mine := v_claim.run_id = p_run and v_claim.step = v_step;
  return jsonb_build_object(
    'claimed', v_mine and v_claim.state = 'open',
    'owner', case when v_mine then 'this run' else 'another run' end,
    'settled', v_claim.state <> 'open',
    'points', case when v_claim.state = 'settled' then private.play_points(p_game, v_today) end,
    'reason', case when v_mine and v_claim.state = 'open' then null
                   when v_claim.state = 'open' then 'another run'
                   when v_claim.state = 'settled' then 'already played'
                   else 'forfeit' end,
    'day', v_today);
end;
  $fn$;

  create function private.play_finish(p_game text, p_claim text, p_pays boolean, p_scale text, p_run uuid, p_step integer,
                                      p_score integer, p_correct integer, p_player_name text, p_mode text)
  returns jsonb
  language plpgsql
  security invoker
  set search_path = ''
  as $fn$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_today date := public.et_day(now());
  v_door boolean := p_mode = 'door';
  v_season boolean := p_claim = 'week-one';
  v_step integer := case when p_claim = 'week-one' then p_step else 0 end;
  v_tag text := case when p_mode = 'door' then p_scale end;
  v_cap numeric;
  v_score integer;
  v_correct integer;
  v_claim private.ranked_claims%rowtype;
  v_reason text;
  v_n integer;
  v_games integer;
  v_total integer;
  v_streak integer;
  v_longest integer;
  v_points numeric;
begin
  if v_user is null then
    raise exception 'record_play needs a signed in user';
  end if;
  if p_mode is null or p_mode not in ('door', 'shim') then
    raise exception 'play_finish: unknown mode %', p_mode;
  end if;

  -- for fun: one unscored board row, nothing else
  if not p_pays then
    if v_door then
      perform private.play_board_row(p_game, null, null, null, p_player_name);
    end if;
    return jsonb_build_object('ranked', false, 'reason', 'fun');
  end if;

  -- 1. the clamp, counted, never refused
  if v_door then
    select k.cap into v_cap from public.game_scale_caps k
     where k.game = p_game and k.scale = p_scale and k.valid_from <= v_now and v_now < k.valid_until;
  else
    select h.hard_max into v_cap from private.game_hard_max h where h.game = p_game;
  end if;
  if v_cap is null then
    perform private.play_count(p_game, 'no open cap');
    if v_door then
      perform private.play_board_row(p_game, null, null, null, p_player_name);
    end if;
    return jsonb_build_object('ranked', false, 'reason', 'no open cap');
  end if;
  v_score := least(greatest(coalesce(p_score, 0), 0), ceil(v_cap)::integer);
  if v_score <> coalesce(p_score, 0) then
    perform private.play_count(p_game, 'clamped');
  end if;
  v_correct := least(greatest(coalesce(p_correct, 0), 0), 1000);

  -- 2. the claim for this run
  if v_season then
    select * into v_claim from private.ranked_claims c
     where c.user_id = v_user and c.game = p_game and c.run_id = p_run and c.step = v_step
     order by c.et_day desc
     limit 1
       for update;
  else
    select * into v_claim from private.ranked_claims c
     where c.user_id = v_user and c.game = p_game and c.run_id = p_run
       and c.et_day between v_today - 1 and v_today
     order by c.et_day desc
     limit 1
       for update;
  end if;
  if found then
    if v_claim.state = 'settled' then
      return jsonb_build_object('ranked', true, 'day', v_claim.et_day,
                                'points', private.play_points(p_game, v_claim.et_day), 'repeat', true);
    elsif v_claim.state = 'forfeit' then
      v_reason := 'forfeit';
    elsif not v_season and v_claim.et_day < v_today and v_claim.claimed_at <= v_now - interval '24 hours' then
      update private.ranked_claims c set state = 'forfeit', score = 0, settled_at = v_now
       where c.user_id = v_user and c.game = p_game and c.et_day = v_claim.et_day;
      v_reason := 'expired';
    end if;
  elsif exists (select 1 from private.ranked_claims c where c.user_id = v_user and c.game = p_game and c.et_day = v_today) then
    v_reason := case when exists (select 1 from private.ranked_claims c
                                   where c.user_id = v_user and c.game = p_game and c.et_day = v_today and c.state = 'open')
                     then 'another run' else 'already played' end;
  elsif v_season and exists (select 1 from private.ranked_claims c
                              where c.user_id = v_user and c.game = p_game and c.state = 'open' and c.step > 0) then
    v_reason := 'another season';
  else
    insert into private.ranked_claims (user_id, game, et_day, run_id, step, state, claimed_at)
    values (v_user, p_game, v_today, p_run, v_step, 'open', v_now)
    returning * into v_claim;
  end if;

  -- 3. a season closes once per save
  if v_reason is null and v_season then
    insert into private.season_closes (user_id, game, save_id, season, closed_at)
    values (v_user, p_game, p_run, v_step, v_now)
    on conflict do nothing;
    get diagnostics v_n = row_count;
    if v_n = 0 then
      update private.ranked_claims c set state = 'forfeit', score = 0, settled_at = v_now
       where c.user_id = v_user and c.game = p_game and c.et_day = v_claim.et_day;
      v_reason := 'season closed';
    end if;
  end if;

  -- 5. practice: one unscored board row
  if v_reason is not null then
    if v_door then
      perform private.play_board_row(p_game, null, null, null, p_player_name);
    end if;
    return jsonb_build_object('ranked', false, 'reason', v_reason);
  end if;

  -- 4. the ranked settle, one transaction, one now()
  insert into public.user_game_scores (user_id, game_type, score, correct_answers, puzzle_date, score_scale, ranked_day)
  values (v_user, p_game, v_score, v_correct, v_claim.et_day, v_tag, v_claim.et_day);
  if v_door then
    perform private.play_board_row(p_game, v_score, v_tag, v_claim.et_day, p_player_name);
  end if;
  insert into public.daily_completions (user_id, game_slug, date)
  values (v_user, p_game, v_claim.et_day)
  on conflict (user_id, game_slug, date) do nothing;
  select count(*) into v_games from public.daily_completions d where d.user_id = v_user and d.date = v_today;
  insert into public.user_scores as s (user_id, games_played_today, last_played_at, updated_at, current_streak, longest_streak)
  values (v_user, greatest(v_games, 1), v_now, v_now, 1, 1)
  on conflict (user_id) do update set
    games_played_today = excluded.games_played_today,
    current_streak = case
      when public.et_day(s.last_played_at) = v_today then coalesce(s.current_streak, 0)
      when public.et_day(s.last_played_at) = v_today - 1 then coalesce(s.current_streak, 0) + 1
      else 1
    end,
    longest_streak = greatest(
      coalesce(s.longest_streak, 0),
      case
        when public.et_day(s.last_played_at) = v_today then coalesce(s.current_streak, 0)
        when public.et_day(s.last_played_at) = v_today - 1 then coalesce(s.current_streak, 0) + 1
        else 1
      end
    ),
    last_played_at = v_now,
    updated_at = v_now
  returning total_points, current_streak, longest_streak into v_total, v_streak, v_longest;
  if not v_door then
    insert into public.user_best_scores as b (user_id, game_type, best_score)
    values (v_user, p_game, v_score)
    on conflict (user_id, game_type) do update set
      best_score = excluded.best_score,
      achieved_at = v_now
    where excluded.best_score > b.best_score;
  end if;
  update private.ranked_claims c set state = 'settled', score = v_score, settled_at = v_now
   where c.user_id = v_user and c.game = p_game and c.et_day = v_claim.et_day;
  v_points := private.play_points(p_game, v_claim.et_day);
  return jsonb_build_object('ranked', true, 'day', v_claim.et_day, 'points', v_points)
      || case when v_door then '{}'::jsonb
              else jsonb_build_object('total_points', v_total, 'current_streak', v_streak,
                                      'longest_streak', v_longest, 'games_played_today', greatest(v_games, 1)) end;
end;
  $fn$;

  revoke all on function private.play_count(text, text) from public, anon, authenticated;
  revoke all on function private.play_board_row(text, integer, text, date, text) from public, anon, authenticated;
  revoke all on function private.play_points(text, date) from public, anon, authenticated;
  revoke all on function private.play_start(text, text, boolean, uuid, integer) from public, anon, authenticated;
  revoke all on function private.play_finish(text, text, boolean, text, uuid, integer, integer, integer, text, text) from public, anon, authenticated;

  -- 4. the door
  create function public.record_play(
    p_game text,
    p_phase text,
    p_run uuid,
    p_step integer,
    p_score integer,
    p_correct integer,
    p_player_name text
  )
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
  as $fn$
declare
  v_user uuid := auth.uid();
  v_rule public.game_rules%rowtype;
begin
  -- 1. a signed in user, and a well formed call
  if v_user is null then
    raise exception 'record_play needs a signed in user';
  end if;
  if p_game is null or length(p_game) < 1 or length(p_game) > 64 then
    raise exception 'record_play refused: a game key is 1 to 64 characters'
      using errcode = '22023';
  end if;
  if p_phase is null or p_phase not in ('start', 'finish') then
    raise exception 'record_play refused: the phase is start or finish, not %', coalesce(p_phase, 'null')
      using errcode = '22023';
  end if;
  if p_run is null then
    raise exception 'record_play refused: a run id is required'
      using errcode = '22023';
  end if;

  -- 2. the game must be in game_rules
  select * into v_rule from public.game_rules r where r.game = p_game;
  if not found then
    perform private.play_count(p_game, 'unknown game');
    if p_phase = 'finish' then
      perform private.play_board_row(p_game, null, null, null, p_player_name);
    end if;
    return jsonb_build_object('ranked', false, 'reason', 'old client');
  end if;
  if v_rule.claim = 'week-one' and (p_step is null or p_step < 1) then
    raise exception 'record_play refused: a season number starts at 1, not %', coalesce(p_step::text, 'null')
      using errcode = '22023';
  end if;

  -- 3. one call at a time per player
  perform pg_advisory_xact_lock(hashtextextended('record_play ' || v_user::text, 0));

  if p_phase = 'start' then
    return private.play_start(v_rule.game, v_rule.claim, v_rule.pays, p_run, p_step);
  end if;
  return private.play_finish(v_rule.game, v_rule.claim, v_rule.pays, v_rule.scale, p_run, p_step,
                             p_score, p_correct, p_player_name, 'door');
end;
  $fn$;
  revoke all on function public.record_play(text, text, uuid, integer, integer, integer, text) from public, anon, authenticated, service_role;
  grant execute on function public.record_play(text, text, uuid, integer, integer, integer, text) to authenticated;

  -- 5. the board insert: two tagged columns, and the name rule
  grant insert (score_scale, ranked_day) on table public.game_completions to anon, authenticated;
  alter policy "Anyone can log a completion" on public.game_completions
    with check (
      length(game) between 1 and 64
      and length(player_name) between 1 and 40
      and (score_scale is null or score_scale in (select s.scale from public.score_scales s))
      and (ranked_day is null or ranked_day between public.et_day(now()) - 1 and public.et_day(now()))
      and not public.name_is_owned(player_name, auth.uid())
    );

  -- ---------------------------------------------------------------
  -- PROOFS. Any failure raises, and the whole block rolls back.
  -- ---------------------------------------------------------------
  v_door := to_regprocedure('public.record_play(text,text,uuid,integer,integer,integer,text)');
  v_owned := to_regprocedure('public.name_is_owned(text,uuid)');

  -- every body E3 wrote: LF only, no execute, no format(
  select string_agg(n.nspname || '.' || p.proname, ', ') into v_bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where ((n.nspname = 'public' and p.proname in ('record_play', 'name_is_owned'))
          or (n.nspname = 'private' and p.proname = any (v_internals)))
     and (position(chr(13) in p.prosrc) > 0 or p.prosrc ~* '\mexecute\M' or p.prosrc ~* '\mformat\s*\(');
  if v_bad is not null then
    raise exception 'Round 677 E3 proof: a body carries a carriage return (the file reached the database with CRLF line endings: apply it with LF) or builds SQL at run time: %. Nothing was changed.', v_bad;
  end if;

  -- the door: one signature, definer, empty search_path, authenticated only
  if (select count(*) from pg_proc where proname = 'record_play' and pronamespace = 'public'::regnamespace) <> 1
     or not (select prosecdef from pg_proc where oid = v_door)
     or (select proconfig from pg_proc where oid = v_door) is distinct from array['search_path=""']
     or pg_get_userbyid((select proowner from pg_proc where oid = v_door)) <> 'postgres' then
    raise exception 'Round 677 E3 proof: record_play is not one SECURITY DEFINER signature owned by postgres with search_path pinned empty.';
  end if;
  if has_function_privilege('anon', v_door, 'EXECUTE') or not has_function_privilege('authenticated', v_door, 'EXECUTE')
     or exists (select 1 from pg_proc p, aclexplode(p.proacl) x where p.oid = v_door and x.grantee = 0) then
    raise exception 'Round 677 E3 proof: record_play EXECUTE is not authenticated only.';
  end if;

  -- name_is_owned: one signature, definer, STABLE, empty search_path, both
  -- client roles (the insert policy calls it as the inserting role), not PUBLIC
  if (select count(*) from pg_proc where proname = 'name_is_owned' and pronamespace = 'public'::regnamespace) <> 1
     or not (select prosecdef from pg_proc where oid = v_owned)
     or (select provolatile from pg_proc where oid = v_owned) <> 's'
     or (select proconfig from pg_proc where oid = v_owned) is distinct from array['search_path=""']
     or not has_function_privilege('anon', v_owned, 'EXECUTE') or not has_function_privilege('authenticated', v_owned, 'EXECUTE')
     or exists (select 1 from pg_proc p, aclexplode(p.proacl) x where p.oid = v_owned and x.grantee = 0) then
    raise exception 'Round 677 E3 proof: name_is_owned is not one STABLE SECURITY DEFINER signature with search_path empty, executable by anon and authenticated and not by PUBLIC.';
  end if;

  -- the internals: invoker, empty search_path, no client role may call them
  select string_agg(p.oid::regprocedure::text, ', ') into v_bad
    from pg_proc p
   where p.pronamespace = 'private'::regnamespace and p.proname = any (v_internals)
     and (p.prosecdef or p.proconfig is distinct from array['search_path=""']
          or has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE')
          or exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where x.grantee = 0));
  if v_bad is not null or (select count(*) from pg_proc where pronamespace = 'private'::regnamespace and proname = any (v_internals)) <> 5 then
    raise exception 'Round 677 E3 proof: the door''s internals are not five INVOKER functions no client role may call (%).', coalesce(v_bad, 'a count other than 5');
  end if;

  -- the tables
  select string_agg(t, ', ') into v_bad
    from unnest(array['public.game_rules', 'private.ranked_claims', 'private.season_closes', 'private.play_refusals']) t
   where not (select relrowsecurity from pg_class where oid = t::regclass);
  if v_bad is not null then
    raise exception 'Round 677 E3 proof: RLS is off on %.', v_bad;
  end if;
  foreach v_r in array v_roles loop
    if has_table_privilege(v_r, 'private.ranked_claims', 'SELECT') or has_table_privilege(v_r, 'private.season_closes', 'SELECT')
       or has_table_privilege(v_r, 'private.play_refusals', 'SELECT')
       or not has_table_privilege(v_r, 'public.game_rules', 'SELECT')
       or has_table_privilege(v_r, 'public.game_rules', 'INSERT') or has_table_privilege(v_r, 'public.game_rules', 'UPDATE')
       or has_table_privilege(v_r, 'public.game_rules', 'DELETE') or has_table_privilege(v_r, 'public.game_rules', 'TRUNCATE') then
      raise exception 'Round 677 E3 proof: % can read a private door table, or cannot read game_rules, or can write it.', v_r;
    end if;
  end loop;
  if exists (select 1 from public.game_rules) then
    raise exception 'Round 677 E3 proof: game_rules is not empty (E3b seeds it).';
  end if;
  if (select count(*) from pg_indexes where schemaname = 'private' and indexname = 'ranked_claims_one_open_season'
         and indexdef ilike 'create unique index%(user_id, game)%where%state = ''open''%step > 0%') <> 1 then
    raise exception 'Round 677 E3 proof: the one open season claim index is not there as written.';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'profiles' and indexdef ilike '%(lower(display_name))%')
     or not exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'profiles' and indexdef ilike '%(lower(username))%') then
    raise exception 'Round 677 E3 proof: profiles has no index on lower(display_name) or lower(username).';
  end if;

  -- the board insert
  foreach v_r in array v_roles loop
    if (select string_agg(a.attname::text, ',' order by a.attname::text collate "C")
          from pg_attribute a
         where a.attrelid = 'public.game_completions'::regclass and a.attnum > 0 and not a.attisdropped
           and has_column_privilege(v_r, a.attrelid, a.attnum, 'INSERT')) is distinct from 'game,player_name,ranked_day,score,score_scale' then
      raise exception 'Round 677 E3 proof: % may insert game_completions columns other than exactly game, player_name, ranked_day, score, score_scale.', v_r;
    end if;
  end loop;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'game_completions' and cmd <> 'SELECT') <> 1 then
    raise exception 'Round 677 E3 proof: game_completions does not have exactly one write policy.';
  end if;
  select with_check into v_check from pg_policies
   where schemaname = 'public' and tablename = 'game_completions' and policyname = 'Anyone can log a completion' and cmd = 'INSERT'
     and roles::text = '{anon,authenticated}';
  if v_check is null or position('length(game)' in v_check) = 0 or position('length(player_name)' in v_check) = 0
     or position('name_is_owned(player_name, auth.uid())' in v_check) = 0 or position('score_scales' in v_check) = 0
     or position('et_day(now())' in v_check) = 0 then
    raise exception 'Round 677 E3 proof: the game_completions insert policy is not the one written here (%).', v_check;
  end if;

  -- executed as each client role, touching no row: the reads work, the full
  -- board insert shape passes every privilege check its policy makes, the
  -- private tables are shut, and anon cannot call the door
  foreach v_r in array v_roles loop
    perform set_config('role', v_r, true);
    perform 1 from public.game_rules limit 1;
    perform 1 from public.profiles limit 1;
    insert into public.game_completions (game, score, player_name, score_scale, ranked_day)
    select 'e3-probe', 1, 'e3-probe', null, null where false;
    begin
      perform 1 from private.ranked_claims limit 1;
      v_bad := concat_ws(', ', v_bad, v_r || ' read private.ranked_claims');
    exception when insufficient_privilege then null;
    end;
    if v_r = 'anon' then
      begin
        perform public.record_play('e3-probe', 'start', '00000000-0000-0000-0000-000000000677'::uuid, 0, null, null, null);
        v_bad := concat_ws(', ', v_bad, 'anon called record_play');
      exception when insufficient_privilege then null;
      end;
    end if;
    perform set_config('role', v_me, true);
  end loop;
  if v_bad is not null then
    raise exception 'Round 677 E3 proof, executed: %', v_bad;
  end if;

  -- the ledger row
  select coalesce((select seq from private.economy_steps where step = 'E3'), (select max(seq) + 1 from private.economy_steps)) into v_seq;
  v_installed := jsonb_build_object(
    'record_play_def_md5', md5(pg_get_functiondef(v_door)),
    'name_is_owned_def_md5', md5(pg_get_functiondef(v_owned)),
    'internals_def_md5', (select jsonb_object_agg(p.proname::text, md5(pg_get_functiondef(p.oid)))
                            from pg_proc p where p.pronamespace = 'private'::regnamespace and p.proname = any (v_internals)),
    'gc_policy_check', v_check,
    'gc_policy_check_md5', md5(v_check),
    'gc_column_acl', (select jsonb_object_agg(a.attname::text, a.attacl::text) from pg_attribute a
                       where a.attrelid = 'public.game_completions'::regclass and a.attacl is not null),
    'profile_indexes_made', to_jsonb(v_made_idx),
    'tables', jsonb_build_array('public.game_rules', 'private.ranked_claims', 'private.season_closes', 'private.play_refusals'));
  insert into private.economy_steps (step, seq, installed, prior)
  values ('E3', v_seq, v_installed, v_prior)
  on conflict (step) do update
    set applied_at = now(), undone_at = null, installed = excluded.installed, prior = excluded.prior;

  raise notice 'Round 677 E3 applied: record_play (the door) and name_is_owned in place, game_rules empty, the board insert takes score_scale and ranked_day and refuses an owned name. record_play md5 %.',
    v_installed->>'record_play_def_md5';
end
$e3$;
