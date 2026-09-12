-- Round 541: the three sport gauntlet drafts earn leaderboard points.
--
-- APPLIED TO PRODUCTION 2026-09-11 through the Supabase MCP. This file is the
-- record of what ran and was written after the fact, which is the wrong order
-- and is noted here rather than hidden.
--
-- WHAT WAS WRONG. public.game_score_caps is an allowlist, not a tuning table:
-- global_leaderboard and global_rank INNER JOIN public.game_denominators, so a
-- game key with no row there is dropped from every board and every rank, with
-- nothing anywhere saying so. That is deliberate and it is the defence the
-- 20260830 migration describes against somebody inventing a game key and
-- posting completions under it.
--
-- The cost of the same design is that a genuinely new game ships earning
-- nothing. Soccer's /gauntlet-draft has had a cap of 100 since 2026-08-30. The
-- NBA and NFL boards shipped in Round 520 without one, and the MLB board
-- shipped in Round 538 without one, so every player who finished any of the
-- three earned exactly zero and nothing told them.
--
-- THE NUMBER IS NOT AN ESTIMATE. src/lib/gauntletEngine.ts fixes scoring at 16
-- points a round survived plus 20 for the trophy, over a ladder every sport
-- config is required to hold at exactly five rounds, so a champion lands on
-- 100 and 100 is the true ceiling in all four sports. That is why soccer's cap
-- is 100 and why these match it rather than being frozen from observed play.
--
-- NOTHING IS BACKFILLED AND NOTHING NEEDS TO BE. Both boards derive on read, so
-- the completions already stored under these keys start counting the moment
-- the row exists.
--
-- WHAT WAS DELIBERATELY NOT ADDED, because a missing cap is not always a bug.
-- The same sweep surfaced three other keys with no cap row and they are all
-- correct as they are: `draft-duel` had its cap DROPPED on purpose in Round 480
-- (an invented key, never recorded by any code in this repo, see
-- 20260906_drop_draft_duel_cap.sql), and `nascar-driver`, `nrl-my-career` and
-- `qa-test` are not games in src/data/gameRegistry.ts at all. Adding a cap to
-- any of those would hand points to a key no shipped game writes.

insert into public.game_score_caps (game, max_score, note)
values
  ('nba-gauntlet-draft', 100, 'engine ceiling: 16 a round over 5 rounds plus 20 for the trophy'),
  ('nfl-gauntlet-draft', 100, 'engine ceiling: 16 a round over 5 rounds plus 20 for the trophy'),
  ('mlb-gauntlet-draft', 100, 'engine ceiling: 16 a round over 5 rounds plus 20 for the trophy')
on conflict (game) do update
  set max_score = excluded.max_score,
      note = excluded.note,
      updated_at = now();
