@echo off
REM Round 20: NHL Connect 4 — the last Connect 4 port. New
REM nhl-connect4-validate edge function (deployed v1 via MCP) with hockey
REM lineage rules (Nordiques=Avalanche, Whalers=Hurricanes, Thrashers=Jets,
REM original-Jets-are-NOT-todays-Jets) + trophy/milestone definitions.
REM 6 curated boards; toughest cells feasibility-proven and documented in
REM the boards file (Maple Leafs x 500 goals = Sundin, Golden Knights x
REM Undrafted = Marchessault, Blue Jackets x Cup = Gaborik...). Young
REM franchises deliberately avoid HOF/#1-pick rows (empty intersections).
REM Autocomplete = nhl_player_stats skaters; free text enabled for goalies.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  supabase/functions/nhl-connect4-validate/index.ts ^
  src/pages/NhlConnect4.tsx ^
  src/hooks/useNhlConnect4.ts ^
  src/data/nhlConnect4Boards.ts ^
  src/types/nhlConnect4.ts ^
  src/components/nhl-connect4/NhlConnect4HowToPlay.tsx ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND20.bat

git commit -m "Add NHL Connect 4 (final Connect 4 port; lineage-aware validator + 6 feasibility-checked boards)"
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
