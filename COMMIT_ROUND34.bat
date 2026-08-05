@echo off
REM Round 34 (2026-08-05): ships everything from the July session that never
REM went live PLUS today's owner P0 list:
REM  - Auth: direct-Supabase login/signup modal, distinct signup copy
REM  - Stats: streak/today/rank shown to signed-in players only; guests get
REM    a sign-up nudge on home and on every game navbar
REM  - Lovable badge scrubbed from the published page
REM  - Deleted: grade transfer, perfect lineup, WC legends, guess the club,
REM    guess the value, deal or no deal, draft guesser (redirects in place)
REM  - Home scroll position restored when backing out of a game
REM  - Report button now relays to douknowball1@gmail.com via edge function
REM  - RankEm game + HockeyCareer build fix + validator fail-closed sources
cd /d %~dp0
if exist .git\index.lock del /f .git\index.lock

echo === Unpacking payload ===
tar -xf _round34_payload.zip
if errorlevel 1 (
  echo *** UNPACK FAILED ***
  pause
  exit /b 1
)

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  CLAUDE.md ^
  docs/ANTHONY_TODO.md ^
  docs/COMPETITOR_INTEL.md ^
  docs/GAME_ORDER_THE_LIST_SPEC.md ^
  docs/SESSION_2026-07-22_BUILD_FIX_AND_CONTENT.md ^
  index.html ^
  src/App.tsx ^
  src/components/auth/AuthModal.tsx ^
  src/components/game/GameNavbar.tsx ^
  src/components/game/ReportQuestion.tsx ^
  src/data/gameRegistry.ts ^
  src/hooks/useCareerGame.ts ^
  src/hooks/useCbbProgram.ts ^
  src/hooks/useFootballConnect4.ts ^
  src/hooks/useLineupBuilder.ts ^
  src/hooks/useNascarChain.ts ^
  src/hooks/useNascarDriver.ts ^
  src/hooks/useNbaChain.ts ^
  src/hooks/useNbaLineup.ts ^
  src/hooks/useTennisChain.ts ^
  src/hooks/useTennisPlayer.ts ^
  src/hooks/useUfcGame.ts ^
  src/lib/missingXi.ts ^
  src/lib/orderTheList.ts ^
  src/pages/HockeyCareer.tsx ^
  src/pages/Index.tsx ^
  src/pages/Profile.tsx ^
  src/pages/RankEm.tsx ^
  supabase/functions/college-grid-validate/index.ts ^
  supabase/functions/football-connect4-validate/index.ts ^
  supabase/functions/football-grid-validate/index.ts ^
  supabase/functions/mlb-connect4-validate/index.ts ^
  supabase/functions/nba-connect4-validate/index.ts ^
  supabase/functions/nfl-connect4-validate/index.ts ^
  supabase/functions/nhl-connect4-validate/index.ts ^
  supabase/functions/soccer-grid-validate/index.ts ^
  supabase/functions/report-relay/index.ts ^
  COMMIT_ROUND34.bat

git commit -m "Round 34: working auth modal + signed-in-only stats (streak/today/rank), badge scrub, 7 games deleted w/ redirects, home scroll restore, report relay to owner email, RankEm + HockeyCareer fix, validator sources synced"
if errorlevel 1 (
  echo Nothing to commit, or commit failed.
  pause
  exit /b 1
)

git pull --rebase --autostash origin main
if errorlevel 1 (
  echo *** REBASE CONFLICT - aborting clean. ***
  git rebase --abort 2>nul
  pause
  exit /b 1
)

git push origin main
if errorlevel 1 (
  echo *** PUSH FAILED ***
  pause
  exit /b 1
)

del _round34_payload.zip 2>nul
echo.
echo ===== SUCCESS. Preview rebuilds in ~2 min, then Claude publishes. =====
pause
