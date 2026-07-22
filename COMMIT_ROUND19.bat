@echo off
REM Round 19: Missing Five pool 4 -> 6. Both 2023 Finals Game 5 lineups
REM added, verified against basketball-reference box score 202306120DEN
REM (Starters tables): Nuggets Jokic/Murray/KCP/Porter/Gordon and Heat
REM Adebayo/Butler/Strus/Vincent/Love (Love's mid-series reinsertion is the
REM documented adjustment; undrafted Vincent+Strus are the story).
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/lib/missingFive.ts ^
  COMMIT_ROUND19.bat

git commit -m "Missing Five: add both verified 2023 Finals G5 lineups (pool 4 -> 6)"
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
