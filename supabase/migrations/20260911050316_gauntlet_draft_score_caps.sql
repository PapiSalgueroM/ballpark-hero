-- Round 541: the three sport gauntlet drafts earn leaderboard points.
--
-- public.game_denominators is an inner join in global_leaderboard and
-- global_rank, so a game with no game_score_caps row is silently dropped from
-- every board and every rank. Soccer's /gauntlet-draft has had a cap of 100
-- since 2026-08-30. The NBA and NFL boards shipped in Round 520 without one,
-- and the MLB board shipped in Round 538 without one, so every player who
-- finished any of the three earned exactly nothing and nothing told them.
--
-- The number is not an estimate. src/lib/gauntletEngine.ts fixes scoring at 16
-- points a round survived plus 20 for the trophy, over a ladder every sport
-- config is required to hold at five rounds, so a champion lands on exactly
-- 100 and 100 is the true ceiling in all four sports. That is why soccer's cap
-- is 100 and why these match it rather than being frozen from live data.

insert into public.game_score_caps (game, max_score, note)
values
  ('nba-gauntlet-draft', 100, 'engine ceiling: 16 a round over 5 rounds plus 20 for the trophy'),
  ('nfl-gauntlet-draft', 100, 'engine ceiling: 16 a round over 5 rounds plus 20 for the trophy'),
  ('mlb-gauntlet-draft', 100, 'engine ceiling: 16 a round over 5 rounds plus 20 for the trophy')
on conflict (game) do update
  set max_score = excluded.max_score,
      note = excluded.note,
      updated_at = now();
