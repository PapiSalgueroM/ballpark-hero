@echo off
REM Round 14: NHL Connections — third Connections port (task #26), clone of
REM the NBA/NFL Connections stack. 4 launch puzzles, every fact verified
REM against nhl_player_stats. Authoring traps documented in the data file:
REM Jagr (9 teams) and Corey Perry (8) are unusable near franchise groups;
REM Penguins legends break every stat group (Crosby/Lemieux 600+ goals AND
REM 1000+ assists), so nhlconn-001 is all-franchise; Gilmour's 1,414 points
REM forced Caufield into the Canadiens group. Cloud table
REM nhl_connections_puzzles created + seeded with the same 4.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/NhlConnections.tsx ^
  src/hooks/useNhlConnections.ts ^
  src/lib/fetchNhlConnectionsPuzzles.ts ^
  src/data/nhlConnectionsPuzzles.ts ^
  src/components/nhl-connections/NhlConnectionsHowToPlay.tsx ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND14.bat

git commit -m "Add NHL Connections (4 DB-verified puzzles, cloud pool + fallback; third Connections port)"
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
