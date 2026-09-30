-- STAND-IN for economy steps E1, E1b and E2 (Rounds 675 and 676), loaded by
-- scripts/simEconomyMigrations.mjs into PGlite after L1, so Round 677's E3
-- can be rehearsed before those rounds land. NOT A MIGRATION. It is never
-- applied anywhere but PGlite, and its ledger rows say so ("stand_in": true).
--
-- It installs the shapes docs/design/POINTS-ECONOMY-V2.md section 5 defines
-- for E1 and nothing else, because this is exactly what E3 assumes E1 and E2
-- installed (E3 checks each before any write):
--   public.et_day(timestamptz) returns date, IMMUTABLE, executable by anon
--     and authenticated (the board insert policy calls it);
--   public.score_scales (scale primary key), readable by anon and
--     authenticated (the board insert policy reads it);
--   public.game_scale_caps (game, scale, valid_from, valid_until, cap), the
--     periods the door clamps a score to;
--   public.legacy_scale_rules, the two rules section 5 lists;
--   score_scale text and ranked_day date on game_completions and
--     user_game_scores, nullable, no default, no client grant;
--   public.scored_plays and public.scored_days, section 5's text, the only
--     place a score becomes points (the door reads a settled day back here);
--   ledger rows E1, E1b and E2, live.
-- E2's own objects (the board functions on scored_days, account_ranks,
-- account_points, account_bests) are not here: E3 reads none of them, it only
-- requires E2's ledger row.
--
-- Legacy periods: one per game in game_score_caps from -infinity, at its
-- max_score, or 100 where production's cap is NULL (E1 freezes those at the
-- live view's denominator; the stand-in only needs a positive number). The dp
-- and g periods and the game_rules rows are E3b's (Round 691); the harness
-- inserts the few it needs as test data.
--
-- When Rounds 675 and 676 land, the harness should load their migrations here
-- instead, and E3's rehearsal must stay green on them unchanged.

create function public.et_day(p_at timestamptz) returns date
  language sql immutable parallel safe
  as $$ select (p_at at time zone 'America/New_York')::date $$;

create table public.score_scales (scale text primary key, note text not null);
alter table public.score_scales enable row level security;
revoke insert, update, delete, truncate, references, trigger on table public.score_scales from anon, authenticated;
create policy "score scales are public read" on public.score_scales for select to anon, authenticated using (true);
insert into public.score_scales (scale, note) values
  ('legacy', 'every row recorded before its game carried a tag'),
  ('644', 'Soccer Career''s legacy score out of 100, Player Bingo scored'),
  ('g', 'raw, valued at the engine ceiling'),
  ('dp', 'day points, 0 to 100');

create table public.game_scale_caps (
  game text references public.game_score_caps(game) on delete cascade,
  scale text references public.score_scales(scale),
  valid_from timestamptz not null default '-infinity',
  valid_until timestamptz not null default 'infinity',
  cap numeric not null check (cap >= 1),
  note text not null,
  primary key (game, scale, valid_from),
  check (valid_from < valid_until)
);
alter table public.game_scale_caps enable row level security;
revoke insert, update, delete, truncate, references, trigger on table public.game_scale_caps from anon, authenticated;
create policy "scale caps are public read" on public.game_scale_caps for select to anon, authenticated using (true);
insert into public.game_scale_caps (game, scale, cap, note)
select game, 'legacy', coalesce(max_score, 100), 'stand-in legacy period'
  from public.game_score_caps;

create table public.legacy_scale_rules (
  game text primary key,
  from_ts timestamptz not null,
  max_score integer,
  scale text references public.score_scales(scale),
  note text not null
);
alter table public.legacy_scale_rules enable row level security;
revoke insert, update, delete, truncate, references, trigger on table public.legacy_scale_rules from anon, authenticated;
create policy "legacy scale rules are public read" on public.legacy_scale_rules for select to anon, authenticated using (true);
insert into public.legacy_scale_rules (game, from_ts, max_score, scale, note) values
  ('soccer-career', '2026-09-23 00:24:53+00', 100, '644', 'stand-in P644'),
  ('player-bingo', '-infinity', null, '644', 'stand-in');

alter table public.game_completions add column score_scale text, add column ranked_day date;
alter table public.user_game_scores add column score_scale text, add column ranked_day date;

create view public.scored_plays with (security_invoker = true) as
with src as (
  select 'board'::text as surface, gc.player_name as who, gc.game, gc.score, gc.created_at,
         coalesce(gc.ranked_day, public.et_day(gc.created_at)) as day, gc.score_scale
    from public.game_completions gc
   where gc.score > 0 and gc.player_name is not null
  union all
  select 'account', s.user_id::text, s.game_type, s.score, s.created_at,
         coalesce(s.ranked_day, public.et_day(s.created_at)), s.score_scale
    from public.user_game_scores s
   where s.score > 0)
select src.surface, src.who, src.game, src.day, src.created_at,
       coalesce(src.score_scale, r.scale, 'legacy') as scale,
       100.0 * least(src.score, k.cap)::numeric / k.cap as worth
  from src
  left join public.legacy_scale_rules r
    on src.score_scale is null and r.game = src.game and src.created_at >= r.from_ts
   and (r.max_score is null or src.score <= r.max_score)
  join public.game_scale_caps k
    on k.game = src.game and k.scale = coalesce(src.score_scale, r.scale, 'legacy')
   and src.created_at >= k.valid_from and src.created_at < k.valid_until
 where src.day <= public.et_day(now());

create view public.scored_days with (security_invoker = true) as
select surface, who, game, day, max(worth) as points from public.scored_plays group by 1, 2, 3, 4;

revoke insert, update, delete, truncate, references, trigger on table public.scored_plays, public.scored_days from anon, authenticated;

insert into private.economy_steps (step, seq, installed, prior) values
  ('E1', 2, '{"stand_in": true}', '{}'),
  ('E1b', 3, '{"stand_in": true}', '{}'),
  ('E2', 4, '{"stand_in": true}', '{}');
