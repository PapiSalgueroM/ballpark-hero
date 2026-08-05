@echo off
REM Round 37 (2026-08-05, overnight): Rebuild Challenge goes box2box.
REM  - Coach step: keep the caretaker free, or pay for one of three coaches
REM    (cost scales with club size, better coach lifts your final rating)
REM  - Board objectives: two management demands dealt per club; miss one at
REM    the end and the board force-sells a player as the penalty
REM  - Financial events: money news fires as the window unfolds, good and bad
REM  - Two AI rival managers rebuild similar clubs and post their windows;
REM    final screen is a 3-way table with your placement
REM  - Pitch view: your XI on an actual pitch in formation, tap to sign
cd /d %~dp0
if exist .git\index.lock del /f .git\index.lock
echo === Unpacking payload ===
tar -xf _round37_payload.zip
if errorlevel 1 ( echo *** UNPACK FAILED *** & pause & exit /b 1 )
echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 ( echo *** TYPECHECK FAILED - nothing committed. *** & pause & exit /b 1 )
git add ^
  docs/COMPETITOR_INTEL.md ^
  docs/GAME_ORDER_THE_LIST_SPEC.md ^
  docs/SESSION_2026-07-22_BUILD_FIX_AND_CONTENT.md ^
  src/components/rebuild/RebuildBoard.tsx ^
  src/data/golfLegends.ts ^
  src/data/nflHLCategories.ts ^
  src/hooks/useGolfHL.ts ^
  src/hooks/useRebuild.ts ^
  src/lib/fantasyCriteria.ts ^
  src/lib/nameFold.ts ^
  src/lib/orderTheList.ts ^
  src/lib/rebuildDeck.ts ^
  src/pages/GolfHigherLower.tsx ^
  src/pages/GuessTheGolfer.tsx ^
  src/pages/RankEm.tsx ^
  supabase/functions/report-relay/index.ts ^
  COMMIT_ROUND37.bat
git commit -m "Round 37: Rebuild Challenge box2box expansion - coach hire step, board objective cards with forced-sale penalties, financial event feed, two AI rival managers with a 3-way results table, pitch formation view"
if errorlevel 1 ( echo Nothing to commit, or commit failed. & pause & exit /b 1 )
git pull --rebase --autostash origin main
if errorlevel 1 ( echo *** REBASE CONFLICT - aborting clean. *** & git rebase --abort 2>nul & pause & exit /b 1 )
git push origin main
if errorlevel 1 ( echo *** PUSH FAILED *** & pause & exit /b 1 )
del _round37_payload.zip 2>nul
echo.
echo ===== SUCCESS. =====
pause
