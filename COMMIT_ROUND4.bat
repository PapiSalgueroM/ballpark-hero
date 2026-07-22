@echo off
REM Round 4: NBA Higher or Lower — first sport port from task #23.
REM Pool baked from bref_nba_player_seasons with per-season MAX aggregation
REM (bref stores traded seasons as combined 2TM rows PLUS per-team rows; naive
REM sums double-count). Verified: Kareem 38,387 / Jordan 32,292 / Wilt 31,419.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/NbaHigherLower.tsx ^
  src/hooks/useNbaHL.ts ^
  src/data/nbaHLPlayers.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND4.bat

git commit -m "Add NBA Higher or Lower (top-80 career scorers, verified vs bref; first Higher/Lower sport port)"
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
