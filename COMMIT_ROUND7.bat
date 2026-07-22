@echo off
REM Round 7: MLB Higher or Lower — fourth Higher/Lower sport port (task #23).
REM Pool: career HOME RUNS from lahman_batting joined to lahman_people.
REM Lahman copy ends 2021, so pool = careers finished by 2019 only (active
REM players would show truncated totals as "career" numbers). Verified
REM canonical: Bonds 762, Aaron 755, Ruth 714, A-Rod 696, Mays 660.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/MlbHigherLower.tsx ^
  src/hooks/useMlbHL.ts ^
  src/data/mlbHLPlayers.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND7.bat

git commit -m "Add MLB Higher or Lower (career HRs, retired-legends pool verified vs Lahman; fourth H/L sport port)"
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
