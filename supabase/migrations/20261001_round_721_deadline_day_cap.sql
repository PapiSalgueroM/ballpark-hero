-- Round 721: Deadline Day is allowlisted with no score. UNAPPLIED, for the
-- release manager to apply when this round lands on main.
--
-- What it changes: one row in public.game_score_caps for the key
-- 'deadline-day', with max_score null. Nothing else.
--
-- Why: scripts/simLeaderboardCaps.mjs section 1 reads every completion key the
-- source can send and fails on any key with no row here. Deadline Day records
-- a play with no score (useGameCompletion with an undefined score, the Round
-- 644 unscored row) once the window shuts, while the points economy is
-- rebuilt, so it needs a row but no ceiling, the same shape contract-chaos took
-- in Round 720 and manager-hot-seat in Round 719. When the game starts sending
-- a score, give it its engine ceiling of 100 (needs 50, value for money 30,
-- budget left 20, each capped in src/lib/deadlineDay.ts).

insert into public.game_score_caps (game, max_score, note)
values ('deadline-day', null, 'Round 721: unscored plays while the points economy is rebuilt; engine ceiling is 100')
on conflict (game) do nothing;
