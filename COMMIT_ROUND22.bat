@echo off
REM Round 22: Chrome-render sourcing UNBLOCKED sports-reference (comment-hidden
REM tables readable from live DOM). Two deliverables:
REM 1) Missing Eleven (/missing-eleven) — NFL Missing XI port. SB LI starting
REM    offenses (NE + ATL), pfr #vis/home_starters DOM + Wikipedia "Starting
REM    lineups" table, 22/22 match. Traps: Dion Lewis (not Blount/White),
REM    rookie Malcolm Mitchell, Toilolo (not Hooper).
REM 2) Missing Five grown 6 -> 10: 2013 G7 (Ginobili STARTED, Splitter bench;
REM    Mike Miller STARTED, Ray Allen bench) + 2008 G6 (Radmanovic trap;
REM    Perkins 13min shoulder). Each two-source: bref Starters DOM + NBA.com
REM    official box starters block.
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
  src/pages/MissingEleven.tsx ^
  src/lib/missingFive.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND22.bat

git commit -m "Add Missing Eleven (SB LI offenses, pfr+wiki verified) + grow Missing Five to 10 (2013 G7 / 2008 G6, bref+NBA.com verified)"
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
