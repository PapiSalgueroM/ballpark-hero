-- Round 1075: Court Life leaderboard cap. UNAPPLIED, for the release lane.
-- Completed six-game seasons earn up to 50 for results, 20 for points,
-- 20 for teamwork and 10 for ball security. Unfinished seasons earn none.
insert into public.game_score_caps (game, max_score, note)
values ('court-life', 100, 'Round 1075: completed six-game career season ceiling of 100')
on conflict (game) do nothing;
