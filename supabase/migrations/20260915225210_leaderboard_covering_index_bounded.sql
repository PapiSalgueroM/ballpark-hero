-- Applied on 2026-09-15 at 22:52 UTC as migration 20260915225210.
-- Existing indexes and public role timeouts remain unchanged.
-- Normal score writes can wait while this non-concurrent index builds.
-- Fail instead of waiting more than 500ms for the table lock or 5s for the build.
BEGIN;
SET LOCAL lock_timeout = '500ms';
SET LOCAL statement_timeout = '5s';
CREATE INDEX idx_game_completions_et_day_game_cover
ON public.game_completions (
  ((created_at AT TIME ZONE 'America/New_York')::date), game
)
INCLUDE (player_name, score, created_at)
WHERE score IS NOT NULL AND score > 0;
COMMIT;
