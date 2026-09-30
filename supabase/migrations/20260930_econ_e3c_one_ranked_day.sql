-- Round 677, economy step E3c: one ranked result per account, game and day,
-- held by a unique index on user_game_scores.
--
-- Spec: docs/design/POINTS-ECONOMY-V2.md sections 5 (E3c) and 9 (row E3c).
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The lead applies it right after E3.
--
-- WHY THREE STATEMENTS AND NOT ONE DO BLOCK. CREATE INDEX CONCURRENTLY cannot
-- run inside a transaction, a function or a DO block, and a query string of
-- several statements runs as one implicit transaction. So each STATEMENT below
-- goes through execute_sql ON ITS OWN, in order:
--   1. a read only DO block: every precondition, raising on any failure;
--   2. the index, built CONCURRENTLY so saves are not blocked while it builds;
--   3. a DO block that proves the index valid and as written, and records the
--      ledger row.
-- If statement 2 fails part way it leaves an INVALID index behind: statement 3
-- refuses on it, and the way on is
--   drop index concurrently public.ugs_one_ranked_day;
-- then statements 1 to 3 again.
--
-- Nothing a visitor writes can hold this off: user_game_scores is written
-- only by the save and the door since L1, and only the door fills ranked_day,
-- so the duplicate check in statement 1 reads a table no visitor can write.
--
-- REHEARSED IN PGLITE by scripts/simEconomyMigrations.mjs, statement by
-- statement, with its undo (ROLLBACK_20260930_econ_e3c_one_ranked_day.sql).

-- STATEMENT 1 of 3
do $e3c1$
begin
  if to_regclass('private.economy_steps') is null
     or not exists (select 1 from private.economy_steps where step = 'E3' and undone_at is null) then
    raise exception 'Round 677 E3c: E3 is not live in the ledger. Apply E3 first. Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where step = 'E3c' and undone_at is null) then
    raise exception 'Round 677 E3c: already applied (private.economy_steps holds a live E3c row). Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where seq > (select seq from private.economy_steps where step = 'E3') and step <> 'E3c' and undone_at is null) then
    raise exception 'Round 677 E3c: a step after E3 is live. Nothing was changed.';
  end if;
  if to_regclass('public.ugs_one_ranked_day') is not null then
    raise exception 'Round 677 E3c: public.ugs_one_ranked_day already exists (an earlier statement 2 that failed leaves it INVALID): drop index concurrently public.ugs_one_ranked_day; then run statement 1 again. Nothing was changed.';
  end if;
  if exists (select 1 from public.user_game_scores where ranked_day is not null
              group by user_id, game_type, ranked_day having count(*) > 1) then
    raise exception 'Round 677 E3c: user_game_scores holds two ranked rows for one account, game and day, which the door should never write. Read them before going on. Nothing was changed.';
  end if;
end
$e3c1$;

-- STATEMENT 2 of 3
create unique index concurrently ugs_one_ranked_day on public.user_game_scores (user_id, game_type, ranked_day) where ranked_day is not null;

-- STATEMENT 3 of 3
do $e3c3$
declare
  v_idx oid := to_regclass('public.ugs_one_ranked_day');
  v_def text;
  v_seq integer;
begin
  if v_idx is null then
    raise exception 'Round 677 E3c proof: public.ugs_one_ranked_day does not exist. Run statement 2.';
  end if;
  if not (select indisvalid and indisready and indisunique from pg_index where indexrelid = v_idx) then
    raise exception 'Round 677 E3c proof: public.ugs_one_ranked_day is not a valid unique index (a build that failed part way). drop index concurrently public.ugs_one_ranked_day; then statements 1 to 3 again.';
  end if;
  v_def := pg_get_indexdef(v_idx);
  if v_def is distinct from 'CREATE UNIQUE INDEX ugs_one_ranked_day ON public.user_game_scores USING btree (user_id, game_type, ranked_day) WHERE (ranked_day IS NOT NULL)' then
    raise exception 'Round 677 E3c proof: the index is not the one written here (%).', v_def;
  end if;
  if exists (select 1 from private.economy_steps where step = 'E3c' and undone_at is null) then
    raise exception 'Round 677 E3c proof: a live E3c row is already recorded.';
  end if;
  select coalesce((select seq from private.economy_steps where step = 'E3c'), (select max(seq) + 1 from private.economy_steps)) into v_seq;
  insert into private.economy_steps (step, seq, installed, prior)
  values ('E3c', v_seq, jsonb_build_object('index_def', v_def, 'index_def_md5', md5(v_def)), '{}'::jsonb)
  on conflict (step) do update
    set applied_at = now(), undone_at = null, installed = excluded.installed, prior = excluded.prior;
  raise notice 'Round 677 E3c applied: %', v_def;
end
$e3c3$;
