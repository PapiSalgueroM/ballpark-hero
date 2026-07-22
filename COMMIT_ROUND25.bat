@echo off
REM Round 25: Hard mode (task #12, first tranche) for the Missing family —
REM /missing-five, /missing-nine, /missing-eleven. Toggle chip under the
REM daily/unlimited pill. Hard = no hint ladder, no autocomplete suggestions,
REM position labels hidden until reveal. Presentation-only: scoring
REM (100/70/40) and daily persistence untouched, so toggling mid-game can't
REM corrupt a saved daily. Remaining #12 tranches (career-path family,
REM grids, higher/lower) documented in the task.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/MissingFive.tsx ^
  src/pages/MissingNine.tsx ^
  src/pages/MissingEleven.tsx ^
  COMMIT_ROUND25.bat

git commit -m "Add hard mode to Missing Five/Nine/Eleven (no hints, no suggestions, positions hidden; scoring unchanged)"
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
