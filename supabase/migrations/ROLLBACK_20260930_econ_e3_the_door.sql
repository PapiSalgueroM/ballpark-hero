-- UNDO for 20260930_econ_e3_the_door.sql (Round 677, economy step E3).
--
-- Only run it if E3 caused a problem (E3's APPLY steps 4 and 7 say when).
-- Undo newest first: E3c's undo (ROLLBACK_20260930_econ_e3c_one_ranked_day.sql)
-- must have run, or E3c never applied.
--
-- It puts back exactly what E3 changed, read from E3's own ledger row
-- (private.economy_steps, step E3):
--   the game_completions insert policy's check, as L1 left it (written below
--   as fixed SQL, then proved equal to the text E3 recorded in prior);
--   the column INSERT grant on score_scale and ranked_day taken back, so
--   the column grants equal what E3 recorded in prior (L1's);
--   record_play, name_is_owned and the five internals dropped;
--   game_rules, ranked_claims, season_closes and play_refusals dropped;
--   the profile name indexes dropped, only those E3 made.
-- Then E3 is marked undone, so E3 can be applied again.
--
-- It refuses, before any write, unless E3 is live, no later step is live,
-- every function E3 installed still has the md5 it recorded, the insert
-- policy is still E3's, and the door has recorded nothing: once
-- ranked_claims or season_closes hold a row, the door is in use and dropping
-- them would lose which seasons a save has closed. That is a decision, not a
-- rollback: copy the rows out first and write the undo for that case.
--
-- One DO block, one transaction, fixed SQL (the drops and the policy text are
-- literal). Like E3 it takes game_completions first and gives up after 1 s.
--
-- REHEARSED IN PGLITE: scripts/simEconomyMigrations.mjs applies E3, runs this,
-- and requires the catalog to equal the one before E3, object for object,
-- then applies E3 again and requires the first apply's catalog.
--
-- APPLY: as E3's APPLY step 2 and 3 (name econ_e3_undo, LF line endings),
-- then get_advisors, then node scripts/simPlayDoor.mjs after refreshing its
-- fixture from production. Record why in docs/PROJECT-STATE.md.

do $u3$
declare
  v_row record;
  v_bad text;
begin
  set local lock_timeout = '1s';

  -- PRECONDITIONS, reads only
  if to_regclass('private.economy_steps') is null then
    raise exception 'E3 undo: private.economy_steps does not exist. Nothing was changed.';
  end if;
  select * into v_row from private.economy_steps where step = 'E3';
  if not found or v_row.undone_at is not null then
    raise exception 'E3 undo: E3 is not live in the ledger. Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where seq > v_row.seq and undone_at is null) then
    raise exception 'E3 undo: a later economy step is live (%); undo it first (newest first). Nothing was changed.',
      (select string_agg(step, ', ' order by seq) from private.economy_steps where seq > v_row.seq and undone_at is null);
  end if;
  if to_regprocedure('public.record_play(text,text,uuid,integer,integer,integer,text)') is null
     or md5(pg_get_functiondef(to_regprocedure('public.record_play(text,text,uuid,integer,integer,integer,text)'))) is distinct from v_row.installed->>'record_play_def_md5'
     or to_regprocedure('public.name_is_owned(text,uuid)') is null
     or md5(pg_get_functiondef(to_regprocedure('public.name_is_owned(text,uuid)'))) is distinct from v_row.installed->>'name_is_owned_def_md5'
     or (select jsonb_object_agg(p.proname::text, md5(pg_get_functiondef(p.oid)))
           from pg_proc p where p.pronamespace = 'private'::regnamespace
            and p.proname in ('play_count', 'play_board_row', 'play_points', 'play_start', 'play_finish'))
        is distinct from v_row.installed->'internals_def_md5' then
    raise exception 'E3 undo: a function E3 installed is missing or changed since (md5 against the ledger). Read it before going on. Nothing was changed.';
  end if;
  if (select with_check from pg_policies where schemaname = 'public' and tablename = 'game_completions' and policyname = 'Anyone can log a completion')
     is distinct from v_row.installed->>'gc_policy_check' then
    raise exception 'E3 undo: the game_completions insert policy is not the one E3 wrote. Read pg_policies before going on. Nothing was changed.';
  end if;
  if exists (select 1 from private.ranked_claims) or exists (select 1 from private.season_closes) then
    raise exception 'E3 undo: the door has recorded claims (ranked_claims % rows, season_closes % rows). Dropping them loses which seasons each save has closed. Copy them out and write the undo for that case. Nothing was changed.',
      (select count(*) from private.ranked_claims), (select count(*) from private.season_closes);
  end if;
  if coalesce(v_row.prior->>'gc_policy_check', '') = '' then
    raise exception 'E3 undo: the ledger does not hold the policy check E3 replaced. Nothing was changed.';
  end if;

  -- WRITES
  lock table public.game_completions in access exclusive mode;

  alter policy "Anyone can log a completion" on public.game_completions
    with check (length(game) between 1 and 64 and length(player_name) between 1 and 40);
  revoke insert (score_scale, ranked_day) on table public.game_completions from anon, authenticated;

  drop function public.record_play(text, text, uuid, integer, integer, integer, text);
  drop function public.name_is_owned(text, uuid);
  drop function private.play_finish(text, text, boolean, text, uuid, integer, integer, integer, text, text);
  drop function private.play_start(text, text, boolean, uuid, integer);
  drop function private.play_board_row(text, integer, text, date, text);
  drop function private.play_points(text, date);
  drop function private.play_count(text, text);
  drop table public.game_rules;
  drop table private.ranked_claims;
  drop table private.season_closes;
  drop table private.play_refusals;
  if v_row.installed->'profile_indexes_made' ? 'profiles_lower_display_name' then
    drop index public.profiles_lower_display_name;
  end if;
  if v_row.installed->'profile_indexes_made' ? 'profiles_lower_username' then
    drop index public.profiles_lower_username;
  end if;

  -- PROOFS
  if (select with_check from pg_policies where schemaname = 'public' and tablename = 'game_completions' and policyname = 'Anyone can log a completion')
     is distinct from v_row.prior->>'gc_policy_check' then
    raise exception 'E3 undo proof: the insert policy check is not the one E3 replaced.';
  end if;
  if coalesce((select jsonb_object_agg(a.attname::text, a.attacl::text) from pg_attribute a
                where a.attrelid = 'public.game_completions'::regclass and a.attacl is not null), '{}'::jsonb)
     is distinct from v_row.prior->'gc_column_acl' then
    raise exception 'E3 undo proof: the column grants on game_completions are not the ones E3 found.';
  end if;
  if coalesce((select jsonb_agg(indexname::text order by indexname) from pg_indexes where schemaname = 'public' and tablename = 'profiles'), '[]'::jsonb)
     is distinct from v_row.prior->'profile_indexes' then
    raise exception 'E3 undo proof: the profile indexes are not the ones E3 found.';
  end if;
  select string_agg(x, ', ') into v_bad
    from unnest(array['public.game_rules', 'private.ranked_claims', 'private.season_closes', 'private.play_refusals']) x
   where to_regclass(x) is not null;
  if v_bad is not null
     or exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname in ('record_play', 'name_is_owned'))
     or exists (select 1 from pg_proc where pronamespace = 'private'::regnamespace
                 and proname in ('play_count', 'play_board_row', 'play_points', 'play_start', 'play_finish')) then
    raise exception 'E3 undo proof: an object E3 made is still there (%).', coalesce(v_bad, 'a function');
  end if;

  update private.economy_steps set undone_at = now() where step = 'E3';
  raise notice 'E3 undone: the board insert is L1''s again, the door and its tables are gone.';
end
$u3$;
