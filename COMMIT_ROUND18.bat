@echo off
REM Round 18: Missing Five — the NBA port of Missing XI (task #39). Four
REM launch lineups, every one verified against the basketball-reference
REM box-score Starters table + a second source (Wikipedia game-article box
REM order), per the Missing XI content-verification discipline. The traps
REM ARE the content and were double-confirmed: Festus Ezeli started G7 2016
REM (Bogut injured), Toni Kukoc started G6 1998 (Rodman off the bench that
REM night), Adam Keefe started at center for the Jazz the same game.
REM Guess-checking is local against the lineup's candidates (no DB
REM dependency, so 90s role players absent from nba_player_stats work).
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
  src/lib/missingFive.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND18.bat

git commit -m "Add Missing Five (NBA Missing XI port; 4 box-score-verified lineups incl. Ezeli/Kukoc/Keefe traps)"
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
