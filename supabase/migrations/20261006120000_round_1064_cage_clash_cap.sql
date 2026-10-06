-- Round 1064: Cage Clash leaderboard cap. UNAPPLIED, for the release lane.
-- The engine's earnedScore clamps normal finished fights to 0 through 100.
-- Its upper bounds are 50 for a win, 15 for a finish, 20 for damage and
-- 15 for defense. Practice does not record a completion or earn points.
-- This adds only the missing allowlist row, preserving any existing row.

insert into public.game_score_caps (game, max_score, note)
values ('cage-clash', 100, 'Round 1064: finished fight engine ceiling of 100; practice earns no points')
on conflict (game) do nothing;
