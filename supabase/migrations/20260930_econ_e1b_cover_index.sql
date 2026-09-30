-- Round 675, economy step E1b: the index the one worth view reads by day.
--
-- Spec: docs/design/POINTS-ECONOMY-V2.md on the points-economy branch,
-- sections 5 (E1b) and 9 (row E1b).
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The lead applies it after E1, the
-- same day, after the round's adversarial review.
--
-- THREE STATEMENTS, EACH ITS OWN execute_sql CALL, IN ORDER. CREATE INDEX
-- CONCURRENTLY cannot run inside a transaction block, and a query string of
-- several statements is one implicit transaction, so it cannot share a call
-- (or a DO block, or apply_migration) with anything. Statement 1 refuses on
-- the chain before anything is built; statement 2 builds without blocking
-- writes; statement 3 proves the index and writes the ledger row. If
-- statement 2 or 3 fails, an index may be left behind (INVALID after a failed
-- build): run the undo's statement 2 (ROLLBACK_20260930_econ_e1b_cover_index.sql)
-- and start again from statement 1.
--
-- WHAT IT IS FOR. E2 (Round 676) rebuilds the World Leaderboard on
-- public.scored_days, which filters by coalesce(ranked_day, et_day(created_at)).
-- Round 537's covering index keys on the Eastern date of created_at alone, so
-- it cannot serve that filter. This index keys on exactly the view's day
-- expression (et_day is inlined by the planner on both sides) and carries
-- every column the view reads, so a day's board is an index scan.
-- Round 537's index (idx_game_completions_et_day_game_cover) is NOT dropped
-- here: the live board reads it until E2, and it goes only after the refresh
-- plan is seen using this one (spec section 5).
--
-- REHEARSED IN PGLITE by scripts/simEconomyMigrations.mjs: refused before E1,
-- built after it, the proof's plan using the index, a second apply refused,
-- E1's undo refused while it lives, its own undo, and the reapply.

-- STATEMENT 1 of 3: the chain, before anything is built.
do $e1b_check$
begin
  set local lock_timeout = '3s';
  if to_regclass('private.economy_steps') is null
     or not exists (select 1 from private.economy_steps where step = 'E1' and seq = 2 and undone_at is null) then
    raise exception 'Round 675 E1b: E1 is not live in the ledger. E1b follows E1. Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where step = 'E1b' and undone_at is null) then
    raise exception 'Round 675 E1b: already applied (private.economy_steps holds a live E1b row). Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where seq > 3 and undone_at is null) then
    raise exception 'Round 675 E1b: a later economy step is live. Nothing was changed.';
  end if;
  if to_regclass('public.idx_gc_scored_day_cover') is not null then
    raise exception 'Round 675 E1b: public.idx_gc_scored_day_cover already exists with no live E1b row (a failed build leaves one INVALID). Drop it with the undo''s statement 2, then start again. Nothing was changed.';
  end if;
  if md5(pg_get_functiondef('public.et_day(timestamptz)'::regprocedure))
       <> (select installed->>'et_day_md5' from private.economy_steps where step = 'E1')
     or md5(pg_get_viewdef('public.scored_plays'::regclass))
       <> (select installed->>'scored_plays_md5' from private.economy_steps where step = 'E1') then
    raise exception 'Round 675 E1b: et_day or scored_plays is not what E1 installed, so the index would not match the view. Nothing was changed.';
  end if;
end
$e1b_check$;

-- STATEMENT 2 of 3: the build. It does not block reads or writes.
create index concurrently idx_gc_scored_day_cover on public.game_completions
  ((coalesce(ranked_day, public.et_day(created_at))), game)
  include (player_name, score, created_at, score_scale)
  where score > 0;

-- STATEMENT 3 of 3: the proof and the ledger row.
do $e1b$
declare
  v_def text;
  v_ok boolean;
  v_plan text := '';
  v_line text;
begin
  set local lock_timeout = '3s';
  if not exists (select 1 from private.economy_steps where step = 'E1' and seq = 2 and undone_at is null)
     or exists (select 1 from private.economy_steps where step = 'E1b' and undone_at is null) then
    raise exception 'Round 675 E1b proof: E1 is not live, or E1b already is. Nothing was recorded.';
  end if;
  select pg_get_indexdef(i.indexrelid), i.indisvalid and i.indisready and i.indrelid = 'public.game_completions'::regclass
    into v_def, v_ok
    from pg_index i where i.indexrelid = to_regclass('public.idx_gc_scored_day_cover');
  if v_def is null then
    raise exception 'Round 675 E1b proof: public.idx_gc_scored_day_cover does not exist. Run statement 2. Nothing was recorded.';
  end if;
  if not v_ok then
    raise exception 'Round 675 E1b proof: the index is INVALID or not on game_completions (a failed or cancelled build). Drop it with the undo''s statement 2 and start again. Nothing was recorded.';
  end if;
  if position('coalesce(ranked_day, et_day(created_at)), game)' in lower(v_def)) = 0
     or position('include (player_name, score, created_at, score_scale)' in lower(v_def)) = 0
     or position('where (score > 0)' in lower(v_def)) = 0 then
    raise exception 'Round 675 E1b proof: the index is not the one this file builds: %', v_def;
  end if;
  -- The view's day filter can be served by the index. Sequential scans are
  -- switched off for this one plan, so the answer is about whether the
  -- expression matches, not about how many rows the table holds today.
  set local enable_seqscan = off;
  for v_line in execute 'explain select count(*) from public.scored_plays where surface = ''board'' and day = public.et_day(now())' loop
    v_plan := v_plan || v_line || E'\n';
  end loop;
  reset enable_seqscan;
  if position('idx_gc_scored_day_cover' in v_plan) = 0 then
    raise exception 'Round 675 E1b proof: the view''s day filter does not use the index, so it does not match the view. Plan: %', v_plan;
  end if;
  insert into private.economy_steps (step, seq, installed, prior)
  values ('E1b', 3, jsonb_build_object('index_def_md5', md5(v_def)), jsonb_build_object('replaced', 'nothing: E1b only adds'))
  on conflict (step) do update
    set applied_at = now(), undone_at = null, installed = excluded.installed, prior = excluded.prior;
  raise notice 'Round 675 E1b applied: % is valid and serves the view''s day filter.', v_def;
end
$e1b$;
