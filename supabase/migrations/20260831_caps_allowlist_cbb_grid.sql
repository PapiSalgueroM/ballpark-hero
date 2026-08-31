-- Round 368: the College Basketball Grid joins the leaderboard allowlist.
-- APPLIED 2026-08-31.
--
-- Round 360 made game_score_caps the authority the World Leaderboard trusts: a
-- game absent from it earns nothing, which is what kills the invented-key
-- attack. The cost of that is a quieter failure mode, a new game silently
-- scoring zero, which is exactly what happened to nba-stat-line between Rounds
-- 352 and 361 and is why simLeaderboardCaps exists.
--
-- It worked. Running the fence before shipping this round reported cbb-grid as
-- the one uncovered key out of the 127 the source can send, on the day the game
-- was built rather than weeks later once somebody had played it and wondered
-- where their points went.
--
-- NULL denominator, so it falls back to the 99th percentile of its own scores
-- once it has any, exactly like every other game that ships before it is played.
insert into public.game_score_caps (game, max_score, note)
values ('cbb-grid', null, 'allowlisted Round 368 on the day the game shipped')
on conflict (game) do nothing;
