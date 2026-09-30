-- UNDO for 20260930_econ_e3c_one_ranked_day.sql (Round 677, economy step E3c).
--
-- Drops the one ranked day index and marks E3c undone, so E3's undo can run
-- (newest first) or E3c can be applied again. Three statements, each through
-- execute_sql ON ITS OWN, in order (DROP INDEX CONCURRENTLY cannot run in a
-- transaction): a read only precondition check, the drop, the proof and the
-- ledger mark. It refuses unless E3c is live, no later step is live, and the
-- index is the one E3c recorded.
--
-- REHEARSED IN PGLITE by scripts/simEconomyMigrations.mjs.

-- STATEMENT 1 of 3
do $u3c1$
declare
  v_row record;
begin
  if to_regclass('private.economy_steps') is null then
    raise exception 'E3c undo: private.economy_steps does not exist. Nothing was changed.';
  end if;
  select * into v_row from private.economy_steps where step = 'E3c';
  if not found or v_row.undone_at is not null then
    raise exception 'E3c undo: E3c is not live in the ledger. Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where seq > v_row.seq and undone_at is null) then
    raise exception 'E3c undo: a later economy step is live; undo it first (newest first). Nothing was changed.';
  end if;
  if to_regclass('public.ugs_one_ranked_day') is null
     or pg_get_indexdef(to_regclass('public.ugs_one_ranked_day')) is distinct from v_row.installed->>'index_def' then
    raise exception 'E3c undo: public.ugs_one_ranked_day is missing or not the index E3c recorded. Read it before going on. Nothing was changed.';
  end if;
end
$u3c1$;

-- STATEMENT 2 of 3
drop index concurrently if exists public.ugs_one_ranked_day;

-- STATEMENT 3 of 3
do $u3c3$
begin
  if to_regclass('public.ugs_one_ranked_day') is not null then
    raise exception 'E3c undo proof: public.ugs_one_ranked_day is still there. Run statement 2.';
  end if;
  if not exists (select 1 from private.economy_steps where step = 'E3c' and undone_at is null) then
    raise exception 'E3c undo proof: E3c is not live in the ledger, so there is nothing to mark.';
  end if;
  update private.economy_steps set undone_at = now() where step = 'E3c';
  raise notice 'E3c undone: the one ranked day index is dropped.';
end
$u3c3$;
