@echo off
REM Round 10: NBA Franchise Grid — first Grid port (task #24), direct clone
REM of the HockeyGrid recipe (lib/hockeyGrid.ts + pages/HockeyGrid.tsx).
REM Data: nba_player_stats (3,227 career rows, 0 dup names, 0 null teams,
REM current through 2025-26; LeBron/Kareem/Jordan/KG/Shaq rows verified).
REM Pool: 16 single-code franchises only (no relocation aliases needed —
REM WAS/Nets/Hornets/Kings/Clippers/OKC/Grizzlies excluded on purpose).
REM Verified margins: worst pair CHI x MIA = 25 shared players; worst
REM achievement POR x 5k rebounds = 33 qualifiers.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/NbaGrid.tsx ^
  src/lib/nbaGrid.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND10.bat

git commit -m "Add NBA Franchise Grid (Immaculate-style 3x3 on nba_player_stats, 16 alias-free franchises; first Grid port)"
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
