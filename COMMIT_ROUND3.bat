@echo off
REM Round 3: revive World Cup as unlimited-first (bug fixed earlier) + remove
REM the dead soccer_career_clubs fetch (/soccer-career errored on every load
REM querying a table that no longer exists; the bundled roster IS the source).
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

echo.
git add ^
  src/pages/SoccerCareer.tsx ^
  src/hooks/useWorldCup.ts ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND3.bat

git commit -m "Revive World Cup Legends unlimited-first (clue bug fixed); drop dead soccer_career_clubs fetch that errored every /soccer-career load"
if errorlevel 1 (
  echo Nothing to commit, or commit failed.
  pause
  exit /b 1
)

echo.
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
