@echo off
REM Round 17: NFL Connect 4 — bonus Connect 4 port on the fixed attribute-
REM pair architecture. New nfl-connect4-validate edge function (deployed v1
REM via MCP; franchise-lineage rules incl. the Browns-history-stayed-in-
REM Cleveland carve-out), 6 curated boards (toughest cells spot-checked and
REM documented in the boards file: Chargers x SB MVP = Drew Brees, Jaguars x
REM SB Champion = Mark Brunell...). Autocomplete pool = nfl_player_team_stints
REM (2002+, incl. actives); free-text enabled for pre-2002 legends.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  supabase/functions/nfl-connect4-validate/index.ts ^
  src/pages/NflConnect4.tsx ^
  src/hooks/useNflConnect4.ts ^
  src/data/nflConnect4Boards.ts ^
  src/types/nflConnect4.ts ^
  src/components/nfl-connect4/NflConnect4HowToPlay.tsx ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND17.bat

git commit -m "Add NFL Connect 4 (attribute-pair validator + 6 feasibility-checked boards)"
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
