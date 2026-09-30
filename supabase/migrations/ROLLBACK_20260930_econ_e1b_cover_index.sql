-- Round 675: the undo of economy step E1b (the cover index).
--
-- NOT PART OF THE CHAIN. THREE STATEMENTS, EACH ITS OWN execute_sql CALL, IN
-- ORDER (DROP INDEX CONCURRENTLY cannot run inside a transaction block).
-- Statement 2 on its own also clears an index a failed build left behind
-- with no ledger row; statements 1 and 3 are for undoing a live E1b.
-- Rehearsed in PGlite by scripts/simEconomyMigrations.mjs.

-- STATEMENT 1 of 3: refuse unless E1b is live and nothing after it is.
do $e1b_undo_check$
begin
  set local lock_timeout = '3s';
  if to_regclass('private.economy_steps') is null
     or not exists (select 1 from private.economy_steps where step = 'E1b' and undone_at is null) then
    raise exception 'E1b undo: E1b is not live in the ledger. Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where seq > 3 and undone_at is null) then
    raise exception 'E1b undo: a later economy step is live; undo it first (newest first). Nothing was changed.';
  end if;
  if to_regclass('public.idx_gc_scored_day_cover') is null
     or md5(pg_get_indexdef('public.idx_gc_scored_day_cover'::regclass))
        <> (select installed->>'index_def_md5' from private.economy_steps where step = 'E1b') then
    raise exception 'E1b undo: the index is missing or not the one E1b built. Read it before going on. Nothing was changed.';
  end if;
end
$e1b_undo_check$;

-- STATEMENT 2 of 3: the drop. It does not block reads or writes.
drop index concurrently if exists public.idx_gc_scored_day_cover;

-- STATEMENT 3 of 3: prove it is gone and mark E1b undone.
do $e1b_undo$
begin
  set local lock_timeout = '3s';
  if to_regclass('public.idx_gc_scored_day_cover') is not null then
    raise exception 'E1b undo proof: the index is still there. Run statement 2.';
  end if;
  if not exists (select 1 from private.economy_steps where step = 'E1b' and undone_at is null) then
    raise exception 'E1b undo: E1b is not live in the ledger, so there is nothing to mark.';
  end if;
  update private.economy_steps set undone_at = now() where step = 'E1b';
  raise notice 'E1b undone: the index is gone and E1b is marked undone.';
end
$e1b_undo$;
