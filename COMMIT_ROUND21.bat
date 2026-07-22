@echo off
REM Round 21: Missing Nine — the MLB Missing XI port (task #39). World Series
REM starting nines shown IN BATTING ORDER with one name blanked; 3 guesses,
REM hint ladder, 100/70/40 — same mechanic as /missing-five.
REM Sourcing note: sports-reference hides "Starting Lineups" in HTML comments,
REM so all 6 lineups were verified against baseball-almanac.com box scores
REM (starters = un-indented batting rows) + corroborated by in-box event lines
REM and the SABR recap for 2016 G7. Traps double-confirmed: Gibson did NOT
REM start 1988 G1 (Hatcher did), Contreras (not Ross) caught 2016 G7,
REM Spencer (not Knoblauch) started LF in 2001 G7.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/lib/missingNine.ts ^
  src/pages/MissingNine.tsx ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND21.bat

git commit -m "Add Missing Nine (World Series batting orders; box-score-verified with Gibson/Contreras/Spencer traps)"
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
