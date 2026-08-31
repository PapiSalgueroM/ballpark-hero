-- Round 361: two games were earning nothing, and Round 360's own fence found it.
-- APPLIED 2026-08-30.
--
-- Round 360 built the allowlist from two halves: every key with recorded scores
-- (from the data) and every key the source can send (from the source). The
-- source half matched useGameCompletion('literal' and recordCompletion('/literal'
-- only, and this codebase does not always write it that way. Five pages pass a
-- `const SLUG`, three perfect lineup variants pass `config.gameId`, two calls
-- are split across lines, and WorldCupPredictor uses double quotes.
--
-- That gap was invisible for every game that already had scores, because the
-- data half covered them. It was not invisible for a game that shipped without
-- any: nba-stat-line arrived in Round 352 and fell through BOTH halves, so when
-- someone finally played it their points counted for nothing and no error was
-- raised anywhere. world-cup-bracket is the same shape.
--
-- Caught by simLeaderboardCaps section 4, which reads the completions table
-- rather than the source. That is the argument for never drawing both sides of
-- a check from the same place: section 1 was blind here precisely because it
-- shared the source half's blind spot. The extractor is widened in the same
-- round, so section 1 now sees 126 keys where it saw 115.
--
-- NULL denominator, so each falls back to the 99th percentile of its own scores
-- once it has any, exactly like every other game that ships before it is played.
insert into public.game_score_caps (game, max_score, note)
values
  ('nba-stat-line', null, 'allowlisted Round 361: shipped in 352, missed by the source scan'),
  ('world-cup-bracket', null, 'allowlisted Round 361: recordCompletion uses double quotes')
on conflict (game) do nothing;
