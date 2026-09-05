-- Round 459: conquest-soccer-imperialism joins the leaderboard allowlist.
-- APPLIED 2026-09-05 (the row was written live with the round; this file
-- records it beside its round the way every earlier allowlist addition is,
-- so a fresh database can be rebuilt from the migrations alone).
--
-- Round 360 made public.game_score_caps the authority the ranking inner joins
-- against, so a key absent from this table earns zero forever and says nothing
-- about it. scripts/simLeaderboardCaps.mjs section 1 fails the build for any
-- game the source can record under with no row here.
--
-- THE NUMBER IS A CEILING BY CONSTRUCTION, NOT A MAX OVER SEEDS. The soccer
-- map has 154 regions at 3 points each, 13 calls at 25 each, 200 for the crown
-- and 50 for the playoffs, so a run that annexes every region, calls every
-- game right and takes the crown scores exactly 1037 and nothing can score
-- more; scripts/simSoccerConquest.mjs section 7 reads this row back and holds
-- it equal to that ceiling. A 300 season replay reached 1001 at most.
insert into public.game_score_caps (game, max_score, note)
values ('conquest-soccer-imperialism', 1037, 'Round 459: the perfect run on the soccer map, 154 regions at 3, 13 calls at 25, the crown at 200 and the playoffs at 50. A ceiling by construction; the best of 300 replayed seasons reached 1001.')
on conflict (game) do nothing;
