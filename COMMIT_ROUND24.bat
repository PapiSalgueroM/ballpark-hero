@echo off
REM Round 24: Missing-pool bulk-out via the Chrome sports-reference route.
REM - Missing Eleven 2 -> 8: +SB XLIX (NE Vereen/Hoomanawanui, SEA Lockette),
REM   +SB XLII NE only (Maroney/Kyle Brady; Giants DROPPED - pfr vs wiki
REM   disagree on 11th starter), +SB 50 DEN only (Panthers DROPPED - 6-OL vs
REM   3-WR disagreement), +SB LVII both (Pacheco/Noah Gray; Kelce Bowl).
REM   All shipped lineups matched pfr starters DOM x Wikipedia 11/11.
REM - Missing Five 10 -> 12: 2011 Finals G6 (Barea started for DAL; undrafted
REM   Joel Anthony started C for MIA) - bref Starters + NBA.com official box.
REM - Missing Nine 6 -> 8: 1986 WS G6 (Clemens started; Ojeda not Gooden;
REM   Buckner/Mookie) - baseball-almanac box 198610250NYN + in-box events.
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
  COMMIT_ROUND24.bat

git commit -m "Grow Missing pools: Eleven 2->8 (XLIX/XLII/50/LVII), Five 10->12 (2011 G6), Nine 6->8 (1986 G6) - all two-source verified"
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
