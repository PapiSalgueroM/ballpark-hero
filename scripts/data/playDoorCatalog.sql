-- simPlayDoor's catalog read (Round 673). READ ONLY: one SELECT of catalog
-- functions and of the two private tables economy step L1 creates
-- (private.economy_steps and private.game_hard_max), so it runs from L1 on.
-- Run it through the Supabase MCP execute_sql (never through a function the
-- browser can reach), and put its one JSON value in
-- scripts/data/playDoorCatalog.json as "catalog". simPlayDoor refuses a
-- fixture whose query_md5 is not the md5 of this file, so edit both together;
-- node scripts/simEconomyMigrations.mjs --write-fixture recaptures the
-- rehearsal fixture from PGlite.
with recursive six(t) as (values ('daily_completions'), ('game_completions'), ('game_score_caps'),
                       ('user_best_scores'), ('user_game_scores'), ('user_scores')),
     cr(r) as (values ('anon'), ('authenticated')),
     pv(p) as (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')),
     -- every view or materialized view that reads one of the six, directly or
     -- through another view: a write through one runs as the view's owner
     -- unless the view is security_invoker
     dep(oid) as (
       select c.oid from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname::text in (select t from six)
       union
       select rw.ev_class from pg_rewrite rw
         join pg_depend d on d.classid = 'pg_rewrite'::regclass and d.objid = rw.oid and d.refclassid = 'pg_class'::regclass
         join dep on dep.oid = d.refobjid
        where rw.ev_class <> d.refobjid)
select jsonb_build_object(
  'table_privileges', (select jsonb_object_agg(cr.r || ' ' || six.t,
      coalesce((select jsonb_agg(pv.p order by pv.p) from pv where has_table_privilege(cr.r, 'public.' || six.t, pv.p)), '[]'::jsonb))
    from cr, six),
  'column_privileges', (select jsonb_object_agg(cr.r || ' ' || six.t,
      coalesce((select jsonb_agg(pv.p order by pv.p) from pv
                 where pv.p in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES') and has_any_column_privilege(cr.r, 'public.' || six.t, pv.p)), '[]'::jsonb))
    from cr, six),
  'gc_insert_columns', (select jsonb_object_agg(cr.r,
      (select coalesce(jsonb_agg(a.attname::text order by a.attname::text collate "C"), '[]'::jsonb)
         from pg_attribute a
        where a.attrelid = 'public.game_completions'::regclass and a.attnum > 0 and not a.attisdropped
          and has_column_privilege(cr.r, a.attrelid, a.attnum, 'INSERT')))
    from cr),
  'policies', (select coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text,
                                                            'using', qual, 'check', with_check)
                                         order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)
                 from pg_policies where schemaname = 'public' and tablename::text in (select t from six)),
  'definers', (select coalesce(jsonb_agg(jsonb_build_object(
                   'fn', f.oid::regprocedure::text,
                   'name', f.proname::text,
                   'md5', md5(pg_get_functiondef(f.oid)),
                   'config', f.proconfig,
                   'owner', pg_get_userbyid(f.proowner),
                   'execute_in_body', f.prosrc ~* '\mexecute\M',
                   'format_in_body', f.prosrc ~* '\mformat\s*\(',
                   'anon_exec', has_function_privilege('anon', f.oid, 'EXECUTE'),
                   'authenticated_exec', has_function_privilege('authenticated', f.oid, 'EXECUTE'),
                   'public_exec', exists (select 1 from aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) x where x.grantee = 0))
                 order by f.oid::regprocedure::text), '[]'::jsonb)
                 from pg_proc f where f.pronamespace = 'public'::regnamespace and f.prosecdef),
  'outside_definers', (select coalesce(jsonb_agg(jsonb_build_object(
                   'fn', f.oid::regprocedure::text,
                   'schema', n.nspname::text,
                   'owner', pg_get_userbyid(f.proowner),
                   'config', f.proconfig,
                   'anon_exec', has_function_privilege('anon', f.oid, 'EXECUTE'),
                   'authenticated_exec', has_function_privilege('authenticated', f.oid, 'EXECUTE'),
                   'public_exec', exists (select 1 from aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) x where x.grantee = 0))
                 order by f.oid::regprocedure::text), '[]'::jsonb)
                 from pg_proc f join pg_namespace n on n.oid = f.pronamespace
                where f.prosecdef and n.nspname not in ('public', 'pg_catalog', 'information_schema')),
  'views', (select coalesce(jsonb_agg(jsonb_build_object(
                   'view', n.nspname || '.' || c.relname,
                   'kind', c.relkind::text,
                   'security_invoker', coalesce((select bool_or(o ~* '^security_invoker=(true|on|yes|1)$') from unnest(c.reloptions) o), false),
                   'updatable', (pg_relation_is_updatable(c.oid, false) & 28) <> 0,
                   'anon_write', has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE'),
                   'authenticated_write', has_table_privilege('authenticated', c.oid, 'INSERT') or has_table_privilege('authenticated', c.oid, 'UPDATE') or has_table_privilege('authenticated', c.oid, 'DELETE'))
                 order by n.nspname || '.' || c.relname), '[]'::jsonb)
              from dep join pg_class c on c.oid = dep.oid join pg_namespace n on n.oid = c.relnamespace
             where c.relkind in ('v', 'm')),
  'rules', (select coalesce(jsonb_agg(jsonb_build_object('rel', n.nspname || '.' || c.relname, 'rule', r.rulename::text,
                                                         'event', r.ev_type::text, 'instead', r.is_instead)
                                      order by n.nspname || '.' || c.relname, r.rulename::text), '[]'::jsonb)
              from pg_rewrite r join pg_class c on c.oid = r.ev_class join pg_namespace n on n.oid = c.relnamespace
             where r.rulename <> '_RETURN' and n.nspname not in ('pg_catalog', 'information_schema')),
  'door_signatures', (select jsonb_object_agg(n, (select count(*) from pg_proc f where f.proname = n and f.pronamespace = 'public'::regnamespace))
                        from unnest(array['record_auth_completion', 'record_play', 'name_is_owned', 'claim_daily_badge']) n),
  'save', (select jsonb_build_object('definer', f.prosecdef, 'config', f.proconfig, 'md5', md5(pg_get_functiondef(f.oid)), 'src_md5', md5(f.prosrc),
                                     'tail_md5', md5(substr(f.prosrc, strpos(f.prosrc, '  insert into public.user_game_scores ('))))
             from pg_proc f where f.oid = to_regprocedure('public.record_auth_completion(text,integer,integer)')),
  'ledger', (select coalesce(jsonb_agg(jsonb_build_object('step', step, 'seq', seq, 'live', undone_at is null, 'installed', installed) order by seq), '[]'::jsonb)
               from private.economy_steps),
  'ledger_guard', jsonb_build_object(
    'rls', (select relrowsecurity from pg_class where oid = 'private.economy_steps'::regclass),
    'anon_select', has_table_privilege('anon', 'private.economy_steps', 'SELECT'),
    'authenticated_select', has_table_privilege('authenticated', 'private.economy_steps', 'SELECT')),
  'hard_max', jsonb_build_object(
    'rls', (select relrowsecurity from pg_class where oid = 'private.game_hard_max'::regclass),
    'anon_select', has_table_privilege('anon', 'private.game_hard_max', 'SELECT'),
    'authenticated_select', has_table_privilege('authenticated', 'private.game_hard_max', 'SELECT'),
    'rows', (select count(*) from private.game_hard_max),
    'caps_rows', (select count(*) from public.game_score_caps),
    'uncovered', (select count(*) from public.game_score_caps c where not exists (select 1 from private.game_hard_max h where h.game = c.game)),
    'md5', (select md5(jsonb_object_agg(h.game, jsonb_build_array(h.hard_max, h.basis))::text) from private.game_hard_max h))
) as catalog;
