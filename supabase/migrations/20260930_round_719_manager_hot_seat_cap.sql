-- Round 719: Manager Hot Seat is allowlisted with no score. UNAPPLIED, for the
-- release manager to apply when this round lands on main.
--
-- What it changes: one row in public.game_score_caps for the key
-- 'manager-hot-seat', with max_score null. Nothing else.
--
-- Why: scripts/simLeaderboardCaps.mjs section 1 reads every completion key the
-- source can send and fails on any key with no row here. Manager Hot Seat
-- records a play with no score (useGameCompletion with an undefined score, the
-- Round 644 unscored row) once the verdict lands: the game ends in survive,
-- reprieve or the sack, not in a number, so it needs a row but no ceiling, the
-- same shape contract-chaos took in Round 720 and wonderkid-factory has carried
-- since 2026-08-26. If the game ever starts sending a score, set the ceiling
-- from src/lib/managerHotSeat.ts and measure it in scripts/simManagerHotSeat.mjs
-- before changing this row.

insert into public.game_score_caps (game, max_score, note)
values ('manager-hot-seat', null, 'Round 719: unscored plays; the run ends in a verdict, not a score')
on conflict (game) do nothing;
