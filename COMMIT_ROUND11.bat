@echo off
REM Round 11: MLB Franchise Grid — second Grid port (task #24).
REM Data: NEW Supabase view mlb_grid_players (Lahman aggregate; franchID =
REM stable franchise identity across relocations, so Ruth's Boston Braves
REM year counts as ATL). Pool = complete careers only (last season <= 2019,
REM Lahman copy ends 2021) with 500+ games = 3,264 rows; colliding names
REM carry a career-span suffix (two Frank Thomases disambiguated).
REM Verified: worst pair MIN x STL = 50 shared; worst cell MIN x 300 HR = 12.
REM Page copy warns "legends era" so nobody guesses active stars.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/MlbGrid.tsx ^
  src/lib/mlbGrid.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND11.bat

git commit -m "Add MLB Franchise Grid (Lahman franchID view, legends-era pool, name collisions disambiguated; second Grid port)"
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
