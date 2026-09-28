-- Round 648, file 2 of 2: every stored total becomes the profile's rule over
-- its records, one row per game per Eastern day, the day's best, capped.
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT, and never run against any database
-- by it. The release manager applies it through the Supabase MCP
-- (apply_migration) after review, and runs get_advisors afterwards.
--
-- APPLY 20260928_round_648_profile_clamp.sql FIRST, AS ITS OWN MIGRATION, AND
-- LET IT COMMIT. That file replaces record_auth_completion; this one locks
-- user_scores against writers while it recomputes. A save that queues behind
-- the lock runs whatever save is committed when it gets its turn, so the new
-- save has to be the committed one before the lock is taken. Run in the same
-- transaction as file 1, every queued save would run the OLD save, add its raw
-- score on top of the recomputed total, and leave that total off the rule.
-- The block below refuses in that case: it checks that the save carries file
-- 1's marker AND that it was not written by this transaction.
--
-- RERUNNABLE, and must be rerun whenever a cap in game_score_caps changes:
-- the save adds each play at the cap of its day, so a changed cap leaves the
-- stored totals on the old one until this runs again.
--
-- THE RULE is file 1's (and src/lib/pointsRule.ts's): the sum over
-- (game_type, (created_at at time zone 'America/New_York')::date) of
-- least(max(score), cap), the cap from public.game_score_caps (NULL is no
-- ceiling, no row is nothing). The day is the Eastern day Round 537 moved the
-- World Leaderboard to (20260911_leaderboard_eastern_day.sql), never the UTC
-- puzzle_date. File 1's header has the reasons for both.
--
-- HOW IT RUNS. The caps are copied out of game_score_caps into a temporary
-- table BEFORE the lock, so nothing but one grouped aggregate over
-- user_game_scores runs while writers wait. user_scores is then locked
-- against writers (readers, the profile's rank count among them, are not
-- blocked). A save that is waiting holds its user_game_scores row
-- uncommitted and its per player lock; this statement does not see that row,
-- and once the lock lifts the save (file 1's, committed) adds that row's
-- improvement on top of the recomputed total, which is the rule over every
-- row. Every total that changes is backed up first, in the same transaction.
do $r648_recompute$
declare
  v_def text;
  v_same_tx boolean;
  v_changed integer;
  v_accounts integer;
  v_before bigint;
  v_after bigint;
begin
  v_def := pg_get_functiondef('public.record_auth_completion(text,integer,integer)'::regprocedure);
  if position('round 648 profile rule (eastern day)' in lower(v_def)) = 0 then
    raise exception 'Round 648 recompute: record_auth_completion is not the save 20260928_round_648_profile_clamp.sql writes, so the save would move the totals off the rule again straight after the recompute. Apply that file first. Nothing was changed.';
  end if;
  select (p.xmin::text)::bigint = pg_catalog.txid_current() % 4294967296
    into v_same_tx
    from pg_catalog.pg_proc p
   where p.oid = 'public.record_auth_completion(text,integer,integer)'::regprocedure;
  if v_same_tx then
    raise exception 'Round 648 recompute: record_auth_completion was replaced in this same transaction, so every save that queues behind the lock below would run the old save. Apply 20260928_round_648_profile_clamp.sql as its own migration, let it commit, then apply this file. Nothing was changed.';
  end if;
  if to_regclass('private.r646_caps_bak') is null then
    raise exception 'Round 648 recompute: Round 646 has not been applied, so the caps are not yet each game''s real ceiling. Nothing was changed.';
  end if;
  if not exists (select 1 from public.game_score_caps) then
    raise exception 'Round 648 recompute: public.game_score_caps is empty. Nothing was changed.';
  end if;

  create table if not exists private.r648_totals_bak (
    user_id uuid not null,
    total_points integer,
    recomputed_to integer,
    backed_up_at timestamptz not null default now()
  );
  revoke all on private.r648_totals_bak from public, anon, authenticated;

  create temporary table r648_caps on commit drop as
    select c.game,
           case when c.max_score is null then null else greatest(c.max_score, 1) end as cap
      from public.game_score_caps c;

  lock table public.user_scores in exclusive mode;

  create temporary table r648_model on commit drop as
    select u.user_id, coalesce(t.total, 0)::integer as total
      from public.user_scores u
      left join (
        select d.user_id, sum(d.worth) as total
          from (
            select s.user_id,
                   case when k.cap is null then max(s.score)
                        else least(max(s.score), k.cap) end as worth
              from public.user_game_scores s
              join r648_caps k on k.game = s.game_type
             group by s.user_id, s.game_type, (s.created_at at time zone 'America/New_York')::date, k.cap
          ) d
         group by d.user_id
      ) t on t.user_id = u.user_id;

  insert into private.r648_totals_bak (user_id, total_points, recomputed_to)
    select u.user_id, u.total_points, m.total
      from public.user_scores u
      join r648_model m on m.user_id = u.user_id
     where u.total_points is distinct from m.total;

  select coalesce(sum(u.total_points), 0), coalesce(sum(m.total), 0)
    into v_before, v_after
    from public.user_scores u
    join r648_model m on m.user_id = u.user_id;

  update public.user_scores u
     set total_points = m.total,
         updated_at = now()
    from r648_model m
   where m.user_id = u.user_id
     and u.total_points is distinct from m.total;
  get diagnostics v_changed = row_count;

  select count(*) into v_accounts from r648_model;
  raise notice 'Round 648 recompute: % of % stored totals recomputed by the rule, % points before and % after; the previous values are in private.r648_totals_bak.', v_changed, v_accounts, v_before, v_after;
  drop table if exists r648_model;
  drop table if exists r648_caps;
end
$r648_recompute$;

-- To put every total back exactly as it was before the most recent run:
--   update public.user_scores u
--      set total_points = b.total_points
--     from (select distinct on (user_id) user_id, total_points
--             from private.r648_totals_bak
--            order by user_id, backed_up_at desc) b
--    where b.user_id = u.user_id;
-- and put record_auth_completion back as file 1's footer says.
