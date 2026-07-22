@echo off
REM Round 26: Missing Eleven 8 -> 10 with Super Bowl XLV (both sides, pfr
REM #vis/home_starters DOM x Wikipedia Starting lineups, 11/11 each):
REM - PIT jumbo look: 1 WR / 2 TE / FB; Doug Legursky started C (Pouncey
REM   injured); Brown/Wallace off the bench.
REM - GB four-wide, no TE; rookie James Starks at RB (Grant on IR).
REM Tiebreak attempts for the two dropped lineups (XLII NYG, SB 50 CAR):
REM footballdb boxscore id scheme didn't resolve (one fair attempt) - both
REM stay documented in the lib as source-disputed.
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
  COMMIT_ROUND26.bat

git commit -m "Missing Eleven 8->10: Super Bowl XLV both sides (Legursky/jumbo, Starks/four-wide) - pfr+wiki 11/11"
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
