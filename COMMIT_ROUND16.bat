@echo off
REM Round 16: (a) LIVE-BUG FIX — nba-connect4-validate had been overwritten
REM with a clone of nba-validate-player (required teamName, 400'd every
REM request), so EVERY NBA Connect 4 guess was rejected since ~July 10.
REM Rewritten to the attribute-pair contract with full NBA attribute
REM definitions; deployed as v7 via MCP. The repo copy here matches deployed.
REM (b) MLB Connect 4 — final port (task #22): new mlb-connect4-validate
REM edge function (deployed v1 via MCP), boards (cell feasibility spot-
REM checked, incl. Rays x MVP = Jose Canseco), types/hook/page/how-to.
REM Hook imports SUPABASE_URL/KEY from client.ts per CLAUDE.md (no literals).
REM Free-text submission enabled so modern stars validate (autocomplete pool
REM is the retired-legends view).
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  supabase/functions/nba-connect4-validate/index.ts ^
  supabase/functions/mlb-connect4-validate/index.ts ^
  src/pages/MlbConnect4.tsx ^
  src/hooks/useMlbConnect4.ts ^
  src/data/mlbConnect4Boards.ts ^
  src/types/mlbConnect4.ts ^
  src/components/mlb-connect4/MlbConnect4HowToPlay.tsx ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND16.bat

git commit -m "Fix NBA Connect 4 validator (was rejecting every guess) + add MLB Connect 4 (final port, task #22)"
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

echo.
echo SUCCESS. Preview rebuilds ~1-2 min; publish needed for douknowball.com.
pause
