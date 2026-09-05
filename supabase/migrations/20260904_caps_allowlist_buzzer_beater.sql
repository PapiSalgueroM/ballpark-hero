-- Round 445: buzzer-beater joins the leaderboard allowlist.
-- APPLIED 2026-09-04.
--
-- Round 360 made public.game_score_caps the authority the ranking inner joins
-- against, so a key absent from this table earns zero forever and says nothing
-- about it. scripts/simLeaderboardCaps.mjs section 1 fails the build for any
-- game the source can record under with no row here, which is why this lands
-- with the game rather than after somebody plays it. Round 421's addendum is
-- the other way round and the reason to bother: higher-lower-transfers was
-- found by section 4, after two players had already lost their points.
--
-- THE NUMBER IS MEASURED, NOT GUESSED. maxRunScore over the real daily seeds
-- for 800 consecutive dates from 2026-01-01 puts a flawless ten from ten
-- between 2917 and 3012, so the cap is the highest of them. A skilled player
-- who solves every shot lands around 1590, and the best single fixed release
-- that exists lands around 292. Same method Round 433 used for free-kick,
-- whose cap is 3424 on the same reasoning.
insert into public.game_score_caps (game, max_score, note)
values ('buzzer-beater', 3012, 'Round 445: a perfect ten from ten. Measured over 800 consecutive real dates of the daily seed, a flawless run pays 2917 to 3012, so the cap is the highest of them; a skilled player lands near 1590.')
on conflict (game) do nothing;
