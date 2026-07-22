@echo off
REM Round 30: grow Missing lineups (deterministic, two-source verified).
REM  - Missing Eleven +4: Super Bowl LIV (SF 49ers, KC Chiefs) and Super Bowl
REM    LII (PHI Eagles, NE Patriots) - pfr Chrome-DOM #vis/#home_starters +
REM    Wikipedia "Starting lineups" tables, 11/11 match each. Now 14 lineups
REM    across 8 distinct Super Bowls.
REM  - Missing Five +2: 2019 NBA Finals Game 6 (TOR Raptors, GSW Warriors) -
REM    basketball-reference Starters + Wikipedia "2019 NBA Finals" recap.
REM  - Missing Nine +2: 2013 World Series Game 6 (BOS Red Sox, STL Cardinals) -
REM    baseball-reference box starters + Wikipedia "2013 World Series" recap.
REM All content is local (no DB/edge-function dependency). This push also
REM rebuilds the Lovable preview from HEAD, recovering today's fc53e47 (career
REM hard mode) + 4d7b906 (grid/connect4 fail-closed, NBA autocomplete) which
REM the prior preview build had NOT picked up (verified stale before this).
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/lib/missingEleven.ts ^
  src/lib/missingFive.ts ^
  src/lib/missingNine.ts ^
  COMMIT_ROUND30.bat

git commit -m "Grow Missing lineups: Eleven +4 (SB LIV + SB LII, both sides, pfr+wiki 11/11) -> 14 across 8 Super Bowls; Five +2 (2019 Finals G6 TOR/GSW); Nine +2 (2013 WS G6 BOS/STL) - all two-source verified"
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
