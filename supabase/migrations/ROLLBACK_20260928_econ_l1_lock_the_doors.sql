-- UNDO for 20260928_econ_l1_lock_the_doors.sql (Round 673, economy step L1).
--
-- Only run it if L1 caused a problem (the apply steps in L1's header say
-- when). It puts back exactly what L1 replaced, read from L1's own ledger row
-- (private.economy_steps, column prior), not from memory:
--   record_auth_completion back to the definition it had before L1 (the
--   Round 569 body, SECURITY INVOKER, md5 5ae76ef7cbf874d58d65ee9050e2023c),
--   executed from the pg_get_functiondef text L1 recorded; the table grants
--   anon and authenticated held on the six tables; the six client write
--   policies on the four account tables, recreated from their recorded
--   commands, roles and expressions; the game_completions insert policy's old
--   WITH CHECK; the column grants on game_completions as they were (none).
--   It drops private.game_hard_max, which only L1's save reads. Then it marks
--   L1 undone, so L1 can be applied again.
--
-- That reopens the write hole L1 closed, and takes the save's refusals away
-- with it, on purpose: this is the way back, not a fix.
--
-- It refuses, before any write, unless L1 is live, no later economy step is
-- live (undo runs newest first), the save and the write policies are still
-- exactly what L1 installed (md5 against the ledger), and
-- private.game_hard_max exists. It proves the restore before the block ends:
-- every table ACL and the save's definition md5 equal the recorded prior, the
-- write policies equal the recorded list, and private.game_hard_max is gone.
-- One DO block, one transaction. Like L1 it takes game_completions first,
-- while holding nothing else, and gives up after 1 s of waiting for it.
--
-- REHEARSED IN PGLITE: scripts/simEconomyMigrations.mjs section 7 applies L1,
-- runs this, and requires the catalog to equal the one before L1, object for
-- object, then applies L1 again and requires the first apply's catalog.
--
-- The dynamic statements below take their table, role and privilege words
-- only from fixed lists in this block, and their policy expressions and the
-- save's definition only from the ledger row L1 wrote from pg_policies and
-- pg_get_functiondef. This is a migration run by the lead, never a function a
-- client can reach.
--
-- APPLY: the timing of L1's APPLY step 2 (just after a refresh-player-ranks
-- run ends), then apply_migration, name econ_l1_undo, query = this whole file
-- with LF line endings; then get_advisors (security); then
-- node scripts/simAuthSave.mjs and node scripts/simPlayDoor.mjs, which will
-- now report the door open (that is what undo means) and fail while the
-- fixture says production. Record why in docs/PROJECT-STATE.md.

do $u1$
declare
  v_save oid := to_regprocedure('public.record_auth_completion(text,integer,integer)');
  v_six constant text[] := array['daily_completions', 'game_completions', 'game_score_caps',
                                 'user_best_scores', 'user_game_scores', 'user_scores'];
  v_row record;
  v_g record;
  v_p jsonb;
  v_roles text;
  v_bad text;
begin
  set local lock_timeout = '1s';

  -- PRECONDITIONS, reads only
  if to_regclass('private.economy_steps') is null then
    raise exception 'L1 undo: private.economy_steps does not exist, so L1 was never applied. Nothing was changed.';
  end if;
  select * into v_row from private.economy_steps where step = 'L1';
  if not found or v_row.undone_at is not null then
    raise exception 'L1 undo: L1 is not live in the ledger. Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where seq > v_row.seq and undone_at is null) then
    raise exception 'L1 undo: a later economy step is live; undo it first (newest first). Nothing was changed.';
  end if;
  if v_save is null or md5(pg_get_functiondef(v_save)) <> v_row.installed->>'save_def_md5' then
    raise exception 'L1 undo: record_auth_completion is not what L1 installed, so something changed it since. Read it before going on. Nothing was changed.';
  end if;
  if coalesce(v_row.prior->>'save_def', '') = '' or md5(v_row.prior->>'save_def') is distinct from v_row.prior->>'save_def_md5' then
    raise exception 'L1 undo: the ledger does not hold the save definition L1 replaced. Nothing was changed.';
  end if;
  if (select md5(coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual, 'check', with_check)
                                    order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)::text)
        from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd <> 'SELECT')
     <> v_row.installed->>'write_policies_md5' then
    raise exception 'L1 undo: the write policies are not what L1 left. Read pg_policies before going on. Nothing was changed.';
  end if;
  if to_regclass('private.game_hard_max') is null then
    raise exception 'L1 undo: private.game_hard_max is gone, but L1 is live and its save reads it. Read the catalog before going on. Nothing was changed.';
  end if;

  -- WRITES
  lock table public.game_completions in access exclusive mode;

  -- the save, exactly as it was: the definition L1 recorded, which carries
  -- no SECURITY DEFINER, so it comes back INVOKER. Its grants are untouched
  -- by CREATE OR REPLACE.
  execute v_row.prior->>'save_def';
  drop table private.game_hard_max;

  -- table grants, exactly the write privileges the prior ACLs gave the two client roles
  for v_g in
    select t.key as tbl, x.privilege_type as priv, r.rolname::text as role
      from jsonb_each_text(v_row.prior->'table_acl') t
     cross join lateral aclexplode(t.value::aclitem[]) x
      join pg_roles r on r.oid = x.grantee
     where t.key = any (v_six)
       and r.rolname in ('anon', 'authenticated')
       and x.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  loop
    execute format('grant %s on table public.%I to %I', v_g.priv, v_g.tbl, v_g.role);
  end loop;

  -- column grants: take L1's away, then put back any the prior held
  revoke insert (game, score, player_name) on table public.game_completions from anon, authenticated;
  for v_g in
    select c.key as col, x.privilege_type as priv, r.rolname::text as role
      from jsonb_each_text(v_row.prior->'gc_column_acl') c
     cross join lateral aclexplode(c.value::aclitem[]) x
      join pg_roles r on r.oid = x.grantee
     where r.rolname in ('anon', 'authenticated')
       and x.privilege_type in ('INSERT', 'UPDATE', 'REFERENCES', 'SELECT')
  loop
    execute format('grant %s (%I) on table public.game_completions to %I', v_g.priv, v_g.col, v_g.role);
  end loop;

  -- policies: the dropped ones back, the game_completions check back
  for v_p in select value from jsonb_array_elements(v_row.prior->'write_policies')
  loop
    if v_p->>'t' <> all (v_six) or v_p->>'cmd' not in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
       or v_p->>'permissive' not in ('PERMISSIVE', 'RESTRICTIVE') then
      raise exception 'L1 undo: the ledger holds a policy this undo does not recognise (%). Nothing was changed.', v_p;
    end if;
    if v_p->>'t' = 'game_completions' then
      execute format('alter policy %I on public.game_completions with check (%s)', v_p->>'n', v_p->>'check');
    else
      select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ')
        into v_roles from jsonb_array_elements_text(v_p->'roles') r;
      execute format('create policy %I on public.%I as %s for %s to %s%s%s',
        v_p->>'n', v_p->>'t', v_p->>'permissive', v_p->>'cmd', v_roles,
        case when v_p->>'using' is null then '' else ' using (' || (v_p->>'using') || ')' end,
        case when v_p->>'check' is null then '' else ' with check (' || (v_p->>'check') || ')' end);
    end if;
  end loop;

  -- PROOFS
  if md5(pg_get_functiondef(v_save)) <> v_row.prior->>'save_def_md5' then
    raise exception 'L1 undo proof: record_auth_completion does not match its prior definition.';
  end if;
  if (select prosecdef from pg_proc where oid = v_save) then
    raise exception 'L1 undo proof: record_auth_completion is still SECURITY DEFINER.';
  end if;
  if (select proacl::text from pg_proc where oid = v_save) is distinct from v_row.prior->>'save_acl' then
    raise exception 'L1 undo proof: record_auth_completion''s grants differ from the prior.';
  end if;
  if to_regclass('private.game_hard_max') is not null then
    raise exception 'L1 undo proof: private.game_hard_max is still there.';
  end if;
  select string_agg(c.relname::text, ', ') into v_bad
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_six)
     and c.relacl::text is distinct from v_row.prior->'table_acl'->>c.relname::text;
  if v_bad is not null then
    raise exception 'L1 undo proof: table ACL differs from the prior on: %', v_bad;
  end if;
  if (select jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'permissive', permissive,
                                          'roles', to_jsonb(roles), 'using', qual, 'check', with_check)
                       order by tablename::text collate "C", policyname::text collate "C")
        from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd <> 'SELECT')
     is distinct from v_row.prior->'write_policies' then
    raise exception 'L1 undo proof: the write policies differ from the prior.';
  end if;
  if exists (select 1 from pg_attribute a where a.attrelid = 'public.game_completions'::regclass
              and a.attacl is not null and cardinality(a.attacl) > 0
              and not (v_row.prior->'gc_column_acl' ? a.attname::text)) then
    raise exception 'L1 undo proof: a column grant on game_completions is left that the prior did not have.';
  end if;

  update private.economy_steps set undone_at = now() where step = 'L1';
  raise notice 'L1 undone: record_auth_completion is the Round 569 save again (SECURITY INVOKER, no refusals), private.game_hard_max dropped, grants and policies restored from the ledger.';
end
$u1$;
