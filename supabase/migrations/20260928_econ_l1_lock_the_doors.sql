-- Round 673, economy step L1: lock the doors.
--
-- Spec: docs/design/POINTS-ECONOMY-V2.md on the points-economy branch,
-- sections 2, 5 (L1), 9 (the chain, row L1) and 13 (Round 673).
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The lead applies it after the
-- round's adversarial review, with the steps under APPLY below. It does not
-- wait for any release: it changes nothing a player sees and does not change
-- what any game pays.
--
-- =====================================================================
-- WHAT WAS WRONG, read only on production 2026-09-28
-- =====================================================================
-- anon and authenticated held INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES
-- and TRIGGER on user_scores, user_game_scores, user_best_scores,
-- daily_completions, game_completions and game_score_caps. Row level
-- security was the only barrier, and on the account tables it said only
-- auth.uid() = user_id, over every column:
--   user_scores       INSERT and UPDATE policies: a player could PATCH their
--                     own total_points and streaks straight through the API.
--   user_game_scores  INSERT policy, no bound on score, created_at client
--                     suppliable.
--   user_best_scores  INSERT and UPDATE policies.
--   daily_completions INSERT policy.
--   game_completions  INSERT WITH CHECK (true) for anon and authenticated, and
--                     the table grant covered created_at and completed_on, so
--                     anyone could post a backdated board row under any name.
-- pg_graphql is installed and executable by anon and authenticated, so the
-- same grants were reachable as GraphQL mutations too. No sign the holes
-- have been used yet (section 2 of the spec). They are open.
--
-- =====================================================================
-- WHAT THIS DOES, in one DO block, so it is one statement and one
-- transaction: every precondition is read before the first write, every
-- result is proved before the block ends, and any failure anywhere rolls
-- the whole thing back with nothing changed.
-- =====================================================================
--   1. private.economy_steps, the ledger every later economy step checks
--      (L1 is its first row). RLS on, no policies, no grants.
--   2. public.record_auth_completion(text, integer, integer) becomes SECURITY
--      DEFINER. Its body is NOT touched: the Round 569 arithmetic stays
--      verbatim (raw add to total_points, UTC day), so a signed in save lands
--      exactly as it does today. Its refusals stay as they are in that body
--      (no signed in user, no game slug). search_path stays pinned empty.
--      EXECUTE stays authenticated only. Because the owner (postgres) bypasses
--      row level security, the body's own auth.uid() scoping is now the whole
--      of its safety, and it takes the player from auth.uid() and never from
--      a parameter.
--   3. revoke INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER on the
--      six tables from anon and authenticated. SELECT is kept, so every read
--      in the site keeps working.
--   4. drop the six client write policies on the four account tables:
--      user_scores_ins, user_scores_upd, user_game_scores_ins,
--      user_best_scores_ins, user_best_scores_upd, daily_completions_ins.
--      The read policies stay.
--   5. game_completions: grant INSERT on (game, score, player_name) only, the
--      exact columns src/lib/completions.ts sends, so created_at and
--      completed_on come from their defaults (the server stamps the time),
--      and its insert policy's WITH CHECK (true) becomes length bounds:
--      game 1 to 64 characters, player_name 1 to 40. NO SCORE BOUND and no
--      refusal of any save: what a play is worth is Round 675's, not this.
--      Measured before choosing the bounds, read only, 2026-09-28: longest
--      game key sent in 30 days 27, longest player_name 21, 0 empty or null
--      names; longest profile display_name 12, username 16 (the profile form
--      allows 3 to 20). A guest handle is at most 21 by construction.
--
-- =====================================================================
-- PRECONDITIONS, every one read before any write. Any drift refuses.
-- =====================================================================
--   a. The ledger holds no live L1 and no live later step. (After an undo,
--      L1 may be applied again: its row is marked undone.)
--   b. record_auth_completion(text, integer, integer) exists once in public
--      (no overload), is owned by postgres, and md5(pg_get_functiondef) is
--      5ae76ef7cbf874d58d65ee9050e2023c: the Round 569 body, SECURITY INVOKER,
--      read on production 2026-09-28. Never a comment marker.
--   c. No Round 644, 646 or 648 object exists: private.r644_state,
--      private.r644_soccer_scores_bak, private.r646_caps_bak,
--      public.game_score_cap_history. Those files are superseded by the spec
--      and never applied; 644's now refuses once this ledger exists.
--   d. user_game_scores.created_at and game_completions.created_at default to
--      now(), and game_completions.completed_on has a default (read from
--      pg_attrdef): the client stops being able to send them, so the defaults
--      are the only source.
--   e. The six tables exist, have RLS on, are not FORCE RLS, are owned by the
--      save's owner (so the DEFINER save bypasses RLS on them), and carry no
--      user trigger (a trigger would run as the writer and could need a grant
--      this takes away).
--   f. The write policies (every non SELECT policy) on the six tables are
--      exactly the seven read on 2026-09-28, by name, command, roles and
--      expressions.
--
-- =====================================================================
-- PROVED BEFORE THE BLOCK ENDS
-- =====================================================================
--   the save is DEFINER, search_path pinned empty, body byte identical
--   (md5 of prosrc unchanged), one signature, anon and PUBLIC cannot execute
--   it, authenticated can; has_table_privilege is false for INSERT, UPDATE,
--   DELETE, TRUNCATE, REFERENCES and TRIGGER on all six tables for anon and
--   authenticated; no column level UPDATE or REFERENCES anywhere; column
--   INSERT only on game_completions and only game, player_name, score
--   (so has_column_privilege is false on created_at and completed_on); SELECT
--   still held and the read policies unchanged; no write policy left on the
--   four account tables or game_score_caps; the one on game_completions is
--   the bounded one. Then, executed as anon and as authenticated: a read of
--   each table works, the client's insert shape passes the privilege check,
--   a direct UPDATE of user_scores (and every other direct write) is refused
--   for want of privilege, and a board row with a 41 character name, an
--   empty game or a 65 character game is refused by the bound. Those three
--   probes can never persist: if one were accepted, the block raises and the
--   whole migration rolls back with the row.
--
-- =====================================================================
-- APPLY (the lead, after the round's adversarial review)
-- =====================================================================
--   1. Read only, before: the migration checks its own preconditions, but
--      look first so a refusal is not a surprise:
--        select md5(pg_get_functiondef('public.record_auth_completion(text,integer,integer)'::regprocedure)),
--               to_regclass('private.economy_steps'), to_regclass('private.r644_state'),
--               to_regclass('private.r646_caps_bak'), to_regclass('public.game_score_cap_history');
--      Expect 5ae76ef7cbf874d58d65ee9050e2023c and four nulls.
--   2. apply_migration, name econ_l1_lock_the_doors, query = this whole file.
--      If it fails on lock_timeout (3 s, the five minute player_ranks refresh
--      holds game_completions), it changed nothing: apply again a minute later.
--   3. get_advisors, type security. Expect exactly one NEW finding, a WARN
--      that authenticated can execute the SECURITY DEFINER function
--      public.record_auth_completion. That is the design: it is the door. An
--      INFO about RLS with no policy on private.economy_steps, if listed, is
--      also by design. Anything else new is a stop: apply the undo (below).
--   4. Read only, after:
--        select step, seq, applied_at, undone_at from private.economy_steps;
--      One row, L1, seq 1, undone_at null.
--   5. node scripts/simPlayDoor.mjs --query prints the catalog query. Run it
--      through execute_sql (read only), put its JSON in
--      scripts/data/playDoorCatalog.json as "catalog", set "source" to
--      "production" and "captured" to the date, and commit that. Then
--      node scripts/simPlayDoor.mjs must end green with the live probes shut.
--      Until the fixture says production, a shut door fails the harness on
--      purpose, so nobody forgets this step.
--   6. node scripts/simAuthSave.mjs and node scripts/simLeaderboardCaps.mjs
--      green (both probe the live database as anon).
--   7. Within the hour, read only, that saves still land:
--        select count(*) from public.user_game_scores where created_at > '<apply time>';
--        select count(*) from public.game_completions where created_at > '<apply time>';
--      Both grow at their usual rates (game_completions 14,000 to 25,000 a
--      day). get_logs service api: rpc/record_auth_completion answers 200 and
--      POST /rest/v1/game_completions shows no new 4xx. A spike of 401 or 403
--      on game_completions is a stop: apply the undo.
--
-- UNDO: supabase/migrations/ROLLBACK_20260928_econ_l1_lock_the_doors.sql.
-- It restores the grants and policies from this step's ledger row, sets the
-- save back to SECURITY INVOKER (whose definition then md5s to 5ae76ef7...
-- again), and marks L1 undone, so L1 can be applied again.
--
-- NOT IN THIS FILE, on purpose: daily_badges (Round 694 closes it), any score
-- bound or clamp (Round 675 and the door in 677), any Eastern day change
-- (677, 689), anything that values a row.

do $l1$
declare
  v_save oid := to_regprocedure('public.record_auth_completion(text,integer,integer)');
  v_six constant text[] := array['daily_completions', 'game_completions', 'game_score_caps',
                                 'user_best_scores', 'user_game_scores', 'user_scores'];
  v_roles constant text[] := array['anon', 'authenticated'];
  v_revoked constant text[] := array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
  -- Every non SELECT policy on the six tables, read on production 2026-09-28,
  -- in the order the query below produces (table, then name, byte order).
  v_writes_expected constant jsonb := $json$[
    {"t": "daily_completions", "n": "daily_completions_ins", "cmd": "INSERT", "roles": "{public}", "using": null, "check": "(auth.uid() = user_id)"},
    {"t": "game_completions", "n": "Anyone can log a completion", "cmd": "INSERT", "roles": "{anon,authenticated}", "using": null, "check": "true"},
    {"t": "user_best_scores", "n": "user_best_scores_ins", "cmd": "INSERT", "roles": "{public}", "using": null, "check": "(auth.uid() = user_id)"},
    {"t": "user_best_scores", "n": "user_best_scores_upd", "cmd": "UPDATE", "roles": "{public}", "using": "(auth.uid() = user_id)", "check": "(auth.uid() = user_id)"},
    {"t": "user_game_scores", "n": "user_game_scores_ins", "cmd": "INSERT", "roles": "{public}", "using": null, "check": "(auth.uid() = user_id)"},
    {"t": "user_scores", "n": "user_scores_ins", "cmd": "INSERT", "roles": "{public}", "using": null, "check": "(auth.uid() = user_id)"},
    {"t": "user_scores", "n": "user_scores_upd", "cmd": "UPDATE", "roles": "{public}", "using": "(auth.uid() = user_id)", "check": "(auth.uid() = user_id)"}
  ]$json$;
  v_me text := current_user;
  v_ledger_exists boolean := to_regclass('private.economy_steps') is not null;
  v_owner oid;
  v_prior jsonb;
  v_installed jsonb;
  v_reads_before text;
  v_bad text;
  v_r text;
  v_gc_policy record;
begin
  set local lock_timeout = '3s';

  -- ---------------------------------------------------------------
  -- PRECONDITIONS. Reads only. Nothing below this block writes until
  -- every one of them has passed.
  -- ---------------------------------------------------------------

  -- a. the ledger
  if v_ledger_exists then
    if exists (select 1 from private.economy_steps where step = 'L1' and undone_at is null) then
      raise exception 'Round 673 L1: already applied (private.economy_steps holds a live L1 row). Nothing was changed.';
    end if;
    if exists (select 1 from private.economy_steps where step <> 'L1' and undone_at is null) then
      raise exception 'Round 673 L1: a later economy step is applied and not undone, so L1 cannot be applied under it. Nothing was changed.';
    end if;
  end if;

  -- b. the save is the Round 569 body, INVOKER, one signature, owned by postgres
  if v_save is null then
    raise exception 'Round 673 L1: public.record_auth_completion(text, integer, integer) does not exist. Nothing was changed.';
  end if;
  if (select count(*) from pg_proc where proname = 'record_auth_completion' and pronamespace = 'public'::regnamespace) <> 1 then
    raise exception 'Round 673 L1: record_auth_completion has more than one signature in public (an overload makes every 3 argument call ambiguous). Nothing was changed.';
  end if;
  if md5(pg_get_functiondef(v_save)) <> '5ae76ef7cbf874d58d65ee9050e2023c' then
    raise exception 'Round 673 L1: record_auth_completion is not the Round 569 body read on 2026-09-28 (md5 % , expected 5ae76ef7cbf874d58d65ee9050e2023c). Something changed it; re-read it before going on. Nothing was changed.',
      md5(pg_get_functiondef(v_save));
  end if;
  select proowner into v_owner from pg_proc where oid = v_save;
  if pg_get_userbyid(v_owner) <> 'postgres' then
    raise exception 'Round 673 L1: record_auth_completion is owned by %, not postgres. Nothing was changed.', pg_get_userbyid(v_owner);
  end if;

  -- c. no Round 644, 646 or 648 object
  if to_regclass('private.r644_state') is not null
     or to_regclass('private.r644_soccer_scores_bak') is not null
     or to_regclass('private.r646_caps_bak') is not null
     or to_regclass('public.game_score_cap_history') is not null then
    raise exception 'Round 673 L1: a Round 644, 646 or 648 object exists, so one of those superseded files has run. The chain assumes none has. Nothing was changed.';
  end if;

  -- e. (before d, which names the tables) the six tables
  select string_agg(n, ', ') into v_bad from unnest(v_six) n where to_regclass('public.' || n) is null;
  if v_bad is not null then
    raise exception 'Round 673 L1: missing table(s): %. Nothing was changed.', v_bad;
  end if;
  select string_agg(c.relname::text, ', ') into v_bad
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_six)
     and (not c.relrowsecurity or c.relforcerowsecurity or c.relowner <> v_owner);
  if v_bad is not null then
    raise exception 'Round 673 L1: RLS off, FORCE RLS on, or an owner other than the save''s on: %. The DEFINER save relies on its owner bypassing RLS. Nothing was changed.', v_bad;
  end if;
  select string_agg(c.relname::text || '.' || t.tgname::text, ', ') into v_bad
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
   where not t.tgisinternal and c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_six);
  if v_bad is not null then
    raise exception 'Round 673 L1: user trigger(s) on the tables: %. None existed on 2026-09-28; read them before going on. Nothing was changed.', v_bad;
  end if;

  -- d. the defaults the server stamps with
  if (select pg_get_expr(d.adbin, d.adrelid) from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
       where d.adrelid = 'public.user_game_scores'::regclass and a.attname = 'created_at') is distinct from 'now()'
     or (select pg_get_expr(d.adbin, d.adrelid) from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
          where d.adrelid = 'public.game_completions'::regclass and a.attname = 'created_at') is distinct from 'now()'
     or not exists (select 1 from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
                     where d.adrelid = 'public.game_completions'::regclass and a.attname = 'completed_on') then
    raise exception 'Round 673 L1: user_game_scores.created_at or game_completions.created_at does not default to now(), or game_completions.completed_on has no default. The client will not be able to send them after this. Nothing was changed.';
  end if;

  -- f. the write policies, exactly as read
  if (select coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual, 'check', with_check)
                                order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)
        from pg_policies
       where schemaname = 'public' and tablename::text = any (v_six) and cmd <> 'SELECT')
     is distinct from v_writes_expected then
    raise exception 'Round 673 L1: the write policies on the six tables are not the seven read on 2026-09-28. Read pg_policies before going on. Nothing was changed.';
  end if;

  -- ---------------------------------------------------------------
  -- WRITES
  -- ---------------------------------------------------------------

  -- the text everything below replaces, so the undo restores it exactly
  select md5(coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual)
                                order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)::text)
    into v_reads_before
    from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd = 'SELECT';
  v_prior := jsonb_build_object(
    'save_def', pg_get_functiondef(v_save),
    'save_def_md5', md5(pg_get_functiondef(v_save)),
    'save_src_md5', (select md5(prosrc) from pg_proc where oid = v_save),
    'save_acl', (select proacl::text from pg_proc where oid = v_save),
    'table_acl', (select jsonb_object_agg(c.relname::text, c.relacl::text) from pg_class c
                   where c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_six)),
    'gc_column_acl', coalesce((select jsonb_object_agg(a.attname::text, a.attacl::text) from pg_attribute a
                                where a.attrelid = 'public.game_completions'::regclass and a.attacl is not null), '{}'::jsonb),
    'write_policies', (select jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'permissive', permissive,
                                                           'roles', to_jsonb(roles), 'using', qual, 'check', with_check)
                                        order by tablename::text collate "C", policyname::text collate "C")
                         from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd <> 'SELECT'),
    'read_policies_md5', v_reads_before);

  -- 1. the ledger
  if not v_ledger_exists then
    create table private.economy_steps (
      step text primary key,
      seq integer unique not null,
      applied_at timestamptz not null default now(),
      undone_at timestamptz,
      installed jsonb not null,
      prior jsonb not null
    );
    alter table private.economy_steps enable row level security;
    revoke all on table private.economy_steps from public, anon, authenticated;
    comment on table private.economy_steps is
      'Points economy V2 migration ledger (docs/design/POINTS-ECONOMY-V2.md section 9). One row per step: installed holds the md5 of everything the step created or replaced, prior the text it replaced, so an undo restores it exactly. Each step requires the previous one live and refuses if its own row is live.';
  end if;

  -- 2. the save runs as its owner. Body untouched.
  alter function public.record_auth_completion(text, integer, integer) security definer;
  revoke all on function public.record_auth_completion(text, integer, integer) from public;
  revoke all on function public.record_auth_completion(text, integer, integer) from anon;
  grant execute on function public.record_auth_completion(text, integer, integer) to authenticated;

  -- 3. no direct write grant on the six tables
  revoke insert, update, delete, truncate, references, trigger
    on table public.user_scores, public.user_game_scores, public.user_best_scores,
             public.daily_completions, public.game_completions, public.game_score_caps
    from anon, authenticated;

  -- 4. no client write policy on the four account tables
  drop policy user_scores_ins on public.user_scores;
  drop policy user_scores_upd on public.user_scores;
  drop policy user_game_scores_ins on public.user_game_scores;
  drop policy user_best_scores_ins on public.user_best_scores;
  drop policy user_best_scores_upd on public.user_best_scores;
  drop policy daily_completions_ins on public.daily_completions;

  -- 5. the board insert: three columns, bounded lengths, no score bound
  grant insert (game, score, player_name) on table public.game_completions to anon, authenticated;
  alter policy "Anyone can log a completion" on public.game_completions
    with check (length(game) between 1 and 64 and length(player_name) between 1 and 40);

  -- ---------------------------------------------------------------
  -- PROOFS. Any failure raises, and the whole block rolls back.
  -- ---------------------------------------------------------------

  -- the save
  if not (select prosecdef from pg_proc where oid = v_save) then
    raise exception 'Round 673 L1 proof: record_auth_completion is not SECURITY DEFINER.';
  end if;
  if (select proconfig from pg_proc where oid = v_save) is distinct from array['search_path=""'] then
    raise exception 'Round 673 L1 proof: record_auth_completion search_path is not pinned empty.';
  end if;
  if (select md5(prosrc) from pg_proc where oid = v_save) <> v_prior->>'save_src_md5' then
    raise exception 'Round 673 L1 proof: the body of record_auth_completion changed; it must stay the Round 569 arithmetic verbatim.';
  end if;
  if (select count(*) from pg_proc where proname = 'record_auth_completion' and pronamespace = 'public'::regnamespace) <> 1 then
    raise exception 'Round 673 L1 proof: record_auth_completion has more than one signature.';
  end if;
  if has_function_privilege('anon', v_save, 'EXECUTE')
     or not has_function_privilege('authenticated', v_save, 'EXECUTE')
     or exists (select 1 from pg_proc p, aclexplode(p.proacl) x where p.oid = v_save and x.grantee = 0) then
    raise exception 'Round 673 L1 proof: record_auth_completion EXECUTE is not authenticated only.';
  end if;

  -- table and column privileges
  select string_agg(r || ' ' || p || ' ' || t, ', ') into v_bad
    from unnest(v_roles) r, unnest(v_six) t, unnest(v_revoked) p
   where has_table_privilege(r, 'public.' || t, p);
  if v_bad is not null then
    raise exception 'Round 673 L1 proof: table write privilege still held: %', v_bad;
  end if;
  select string_agg(r || ' ' || p || ' ' || t, ', ') into v_bad
    from unnest(v_roles) r, unnest(v_six) t, unnest(array['UPDATE', 'REFERENCES']) p
   where has_any_column_privilege(r, 'public.' || t, p);
  if v_bad is not null then
    raise exception 'Round 673 L1 proof: column level privilege still held: %', v_bad;
  end if;
  select string_agg(r || ' INSERT ' || t, ', ') into v_bad
    from unnest(v_roles) r, unnest(v_six) t
   where t <> 'game_completions' and has_any_column_privilege(r, 'public.' || t, 'INSERT');
  if v_bad is not null then
    raise exception 'Round 673 L1 proof: column INSERT held outside game_completions: %', v_bad;
  end if;
  foreach v_r in array v_roles loop
    if (select string_agg(a.attname::text, ',' order by a.attname::text collate "C")
          from pg_attribute a
         where a.attrelid = 'public.game_completions'::regclass and a.attnum > 0 and not a.attisdropped
           and has_column_privilege(v_r, a.attrelid, a.attnum, 'INSERT')) is distinct from 'game,player_name,score' then
      raise exception 'Round 673 L1 proof: % may insert game_completions columns other than exactly game, player_name, score.', v_r;
    end if;
  end loop;
  select string_agg(r || ' ' || t, ', ') into v_bad
    from unnest(v_roles) r, unnest(v_six) t
   where not has_table_privilege(r, 'public.' || t, 'SELECT');
  if v_bad is not null then
    raise exception 'Round 673 L1 proof: SELECT lost: %', v_bad;
  end if;

  -- policies
  if exists (select 1 from pg_policies where schemaname = 'public' and cmd <> 'SELECT'
              and tablename::text = any (array['user_scores', 'user_game_scores', 'user_best_scores', 'daily_completions', 'game_score_caps'])) then
    raise exception 'Round 673 L1 proof: a write policy is left on an account table or game_score_caps.';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'game_completions' and cmd <> 'SELECT') <> 1 then
    raise exception 'Round 673 L1 proof: game_completions does not have exactly one write policy.';
  end if;
  select policyname, cmd, roles::text as roles, with_check into v_gc_policy
    from pg_policies where schemaname = 'public' and tablename = 'game_completions' and cmd <> 'SELECT';
  if v_gc_policy.policyname <> 'Anyone can log a completion' or v_gc_policy.cmd <> 'INSERT'
     or v_gc_policy.roles <> '{anon,authenticated}' or v_gc_policy.with_check = 'true'
     or position('length(game)' in v_gc_policy.with_check) = 0
     or position('length(player_name)' in v_gc_policy.with_check) = 0 then
    raise exception 'Round 673 L1 proof: the game_completions insert policy is not the bounded one (%).', v_gc_policy.with_check;
  end if;
  if (select md5(coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual)
                                    order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)::text)
        from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd = 'SELECT') <> v_reads_before then
    raise exception 'Round 673 L1 proof: a read policy changed.';
  end if;

  -- executed as each client role. Every write below either touches no row
  -- (where false) or must be refused; an accepted bound probe raises P0673,
  -- which rolls its own row back, and then the whole block.
  v_bad := null;
  foreach v_r in array v_roles loop
    perform set_config('role', v_r, true);

    perform 1 from public.user_scores limit 1;
    perform 1 from public.user_game_scores limit 1;
    perform 1 from public.user_best_scores limit 1;
    perform 1 from public.daily_completions limit 1;
    perform 1 from public.game_completions limit 1;
    perform 1 from public.game_score_caps limit 1;

    -- the live client's board insert, exactly its columns
    insert into public.game_completions (game, score, player_name) select 'l1-probe', 1, 'l1-probe' where false;

    begin
      update public.user_scores set total_points = total_points where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may UPDATE user_scores');
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.user_scores (user_id) select null::uuid where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may INSERT user_scores');
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.user_game_scores (user_id, game_type, score) select null::uuid, 'x', 0 where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may INSERT user_game_scores');
    exception when insufficient_privilege then null;
    end;
    begin
      update public.user_best_scores set best_score = best_score where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may UPDATE user_best_scores');
    exception when insufficient_privilege then null;
    end;
    begin
      delete from public.daily_completions where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may DELETE daily_completions');
    exception when insufficient_privilege then null;
    end;
    begin
      update public.game_score_caps set max_score = max_score where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may UPDATE game_score_caps');
    exception when insufficient_privilege then null;
    end;
    begin
      update public.game_completions set score = score where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may UPDATE game_completions');
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.game_completions (game, player_name, created_at) select 'x', 'x', now() where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may set game_completions.created_at');
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.game_completions (game, player_name, completed_on) select 'x', 'x', current_date where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may set game_completions.completed_on');
    exception when insufficient_privilege then null;
    end;

    -- the bound, on rows that must be refused
    begin
      insert into public.game_completions (game, score, player_name) values ('l1-bound-probe', 0, repeat('x', 41));
      raise exception using errcode = 'P0673', message = 'accepted';
    exception
      when insufficient_privilege then null;
      when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, v_r || ' posted a 41 character name');
    end;
    begin
      insert into public.game_completions (game, score, player_name) values ('', 0, 'l1-bound-probe');
      raise exception using errcode = 'P0673', message = 'accepted';
    exception
      when insufficient_privilege then null;
      when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, v_r || ' posted an empty game');
    end;
    begin
      insert into public.game_completions (game, score, player_name) values (repeat('g', 65), 0, 'l1-bound-probe');
      raise exception using errcode = 'P0673', message = 'accepted';
    exception
      when insufficient_privilege then null;
      when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, v_r || ' posted a 65 character game');
    end;

    perform set_config('role', v_me, true);
  end loop;
  if v_bad is not null then
    raise exception 'Round 673 L1 proof, executed: %', v_bad;
  end if;

  -- the ledger row
  if has_table_privilege('anon', 'private.economy_steps', 'SELECT') or has_table_privilege('authenticated', 'private.economy_steps', 'SELECT')
     or not (select relrowsecurity from pg_class where oid = 'private.economy_steps'::regclass) then
    raise exception 'Round 673 L1 proof: private.economy_steps is reachable by a client role or has RLS off.';
  end if;
  v_installed := jsonb_build_object(
    'save_def_md5', md5(pg_get_functiondef(v_save)),
    'save_src_md5', (select md5(prosrc) from pg_proc where oid = v_save),
    'save_acl', (select proacl::text from pg_proc where oid = v_save),
    'table_acl_md5', (select jsonb_object_agg(c.relname::text, md5(c.relacl::text)) from pg_class c
                       where c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_six)),
    'gc_column_acl', coalesce((select jsonb_object_agg(a.attname::text, a.attacl::text) from pg_attribute a
                                where a.attrelid = 'public.game_completions'::regclass and a.attacl is not null), '{}'::jsonb),
    'write_policies_md5', (select md5(coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual, 'check', with_check)
                                                         order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)::text)
                             from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd <> 'SELECT'),
    'read_policies_md5', v_reads_before);
  insert into private.economy_steps (step, seq, installed, prior)
  values ('L1', 1, v_installed, v_prior)
  on conflict (step) do update
    set applied_at = now(), undone_at = null, installed = excluded.installed, prior = excluded.prior;

  raise notice 'Round 673 L1 applied: record_auth_completion is SECURITY DEFINER (body unchanged), direct writes revoked on six tables, six write policies dropped, the board insert bounded to three columns and two lengths. Save md5 now %.',
    v_installed->>'save_def_md5';
end
$l1$;
