-- Round 675: the undo of economy step E1 (scales and worth).
--
-- NOT PART OF THE CHAIN. Run by the lead only to take E1 back, through
-- apply_migration, as one DO block. Rehearsed in PGlite by
-- scripts/simEconomyMigrations.mjs: the catalog after this equals the catalog
-- before E1, object for object (only the ledger row remains, marked undone),
-- a second undo refuses, and E1 applies again to the catalog of its first
-- apply.
--
-- It refuses, changing nothing, when:
--   * E1 is not live in the ledger;
--   * a later step is live (E1b included): undo those first, newest first;
--   * the E1b index still exists (its undo drops it);
--   * et_day or either view is not what E1 installed (something changed it);
--   * any row carries a score_scale or a ranked_day: dropping the columns
--     would lose them. Only E3 opens those columns to a client, and its undo
--     comes first, so this refusal means rows written since then need a
--     decision, not an undo.
-- E1 replaced nothing, so the undo only drops what E1 created. No stored
-- score is touched, before or after.

do $e1_undo$
declare
  v_row record;
begin
  set local lock_timeout = '3s';

  if to_regclass('private.economy_steps') is null then
    raise exception 'E1 undo: private.economy_steps does not exist, so E1 was never applied. Nothing was changed.';
  end if;
  select * into v_row from private.economy_steps where step = 'E1';
  if not found or v_row.undone_at is not null then
    raise exception 'E1 undo: E1 is not live in the ledger. Nothing was changed.';
  end if;
  if exists (select 1 from private.economy_steps where seq > v_row.seq and undone_at is null) then
    raise exception 'E1 undo: a later economy step is live; undo it first (newest first). Nothing was changed.';
  end if;
  if to_regclass('public.idx_gc_scored_day_cover') is not null then
    raise exception 'E1 undo: the E1b index public.idx_gc_scored_day_cover exists; drop it with E1b''s undo first. Nothing was changed.';
  end if;
  if to_regprocedure('public.et_day(timestamptz)') is null or to_regclass('public.scored_plays') is null or to_regclass('public.scored_days') is null
     or md5(pg_get_functiondef('public.et_day(timestamptz)'::regprocedure)) <> v_row.installed->>'et_day_md5'
     or md5(pg_get_viewdef('public.scored_plays'::regclass)) <> v_row.installed->>'scored_plays_md5'
     or md5(pg_get_viewdef('public.scored_days'::regclass)) <> v_row.installed->>'scored_days_md5' then
    raise exception 'E1 undo: et_day or a view is not what E1 installed, so something changed it since. Read it before going on. Nothing was changed.';
  end if;

  lock table public.game_completions in access exclusive mode;
  lock table public.user_game_scores in access exclusive mode;
  if exists (select 1 from public.game_completions where score_scale is not null or ranked_day is not null)
     or exists (select 1 from public.user_game_scores where score_scale is not null or ranked_day is not null) then
    raise exception 'E1 undo: rows carry a score_scale or a ranked_day, and dropping the columns would lose them. Nothing was changed.';
  end if;

  drop view public.scored_days;
  drop view public.scored_plays;
  drop table public.legacy_scale_rules;
  drop table public.game_scale_caps;
  drop table public.score_scales;
  alter table public.game_completions drop column score_scale, drop column ranked_day;
  alter table public.user_game_scores drop column score_scale, drop column ranked_day;
  drop function public.et_day(timestamptz);

  if to_regprocedure('public.et_day(timestamptz)') is not null
     or to_regclass('public.score_scales') is not null or to_regclass('public.game_scale_caps') is not null
     or to_regclass('public.legacy_scale_rules') is not null or to_regclass('public.scored_plays') is not null
     or to_regclass('public.scored_days') is not null
     or exists (select 1 from pg_attribute a
                 where a.attrelid in ('public.game_completions'::regclass, 'public.user_game_scores'::regclass)
                   and a.attname in ('score_scale', 'ranked_day') and not a.attisdropped) then
    raise exception 'E1 undo proof: an object E1 created is still there.';
  end if;

  update private.economy_steps set undone_at = now() where step = 'E1';
  raise notice 'E1 undone: et_day, score_scales, game_scale_caps, legacy_scale_rules, scored_plays, scored_days and the four columns are gone; E1 is marked undone and can be applied again.';
end
$e1_undo$;
