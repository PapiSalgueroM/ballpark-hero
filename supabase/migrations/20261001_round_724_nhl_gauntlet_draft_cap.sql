-- Round 724: Gauntlet Draft NHL earns leaderboard points. UNAPPLIED, for the
-- release manager to apply when this round lands on main.
--
-- What it changes: one row in public.game_score_caps for the key
-- 'nhl-gauntlet-draft', with max_score 100. Nothing else.
--
-- Why: public.game_denominators is an inner join in global_leaderboard and
-- global_rank, so a game with no row here is silently dropped from every board
-- and every rank, and scripts/simLeaderboardCaps.mjs section 1 fails on any
-- completion key the source can send without one. Round 541 had to backfill
-- the NBA, NFL and MLB drafts for exactly this, so the fifth sport ships with
-- its row.
--
-- The number is not an estimate. src/lib/gauntletEngine.ts fixes scoring at 16
-- points a round survived plus 20 for the trophy, over a ladder every sport
-- config must hold at five rounds (scripts/simGauntletEngine.mjs section 3), so
-- a champion lands on exactly 100 and 100 is the true ceiling, the same as the
-- other four gauntlet drafts.

insert into public.game_score_caps (game, max_score, note)
values ('nhl-gauntlet-draft', 100, 'Round 724: engine ceiling, 16 a round over 5 rounds plus 20 for the trophy')
on conflict (game) do nothing;
