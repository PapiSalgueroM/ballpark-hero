@echo off
REM Round 13: NFL Connections — second Connections port (task #26), clone of
REM the NBA Connections stack. 4 launch puzzles, every fact verified against
REM nfl_player_team_stints (2002+ coverage rule), nfl_draft_picks, and
REM nflfastr_player_stats sums. Traps caught during authoring: "Chris
REM Johnson" is a merged multi-player identity (dropped), Jamaal Charles
REM really played DEN (pulled from the Chiefs group), Antonio Brown's 13,209
REM receiving yards would have made the Steelers group ambiguous (pulled).
REM Cloud table nfl_connections_puzzles created + seeded with the same 4.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/NflConnections.tsx ^
  src/hooks/useNflConnections.ts ^
  src/lib/fetchNflConnectionsPuzzles.ts ^
  src/data/nflConnectionsPuzzles.ts ^
  src/components/nfl-connections/NflConnectionsHowToPlay.tsx ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND13.bat

git commit -m "Add NFL Connections (4 DB-verified puzzles, cloud pool + fallback; second Connections port)"
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
