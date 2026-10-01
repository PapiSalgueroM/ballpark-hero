-- Round 720: Contract Chaos is allowlisted with no score. UNAPPLIED, for the
-- release manager to apply when this round lands on main.
--
-- What it changes: one row in public.game_score_caps for the key
-- 'contract-chaos', with max_score null. Nothing else.
--
-- Why: scripts/simLeaderboardCaps.mjs section 1 reads every completion key the
-- source can send and fails on any key with no row here. Contract Chaos records
-- a play with no score (useGameCompletion with an undefined score, the Round 644
-- unscored row) while the points economy is rebuilt, so it needs a row but no
-- ceiling, the same shape wonderkid-factory has carried since 2026-08-26.
-- When the game starts sending a score, give it its engine ceiling of 100
-- (growth 30, minutes 25, trophies 25, money 20, each capped in
-- src/lib/contractChaos.ts).

insert into public.game_score_caps (game, max_score, note)
values ('contract-chaos', null, 'Round 720: unscored plays while the points economy is rebuilt; engine ceiling is 100')
on conflict (game) do nothing;
