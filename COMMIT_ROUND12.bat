@echo off
REM Round 12: NBA Connections — Connections port (task #26), clone of the
REM Baseball Connections stack (data + fetch + hook + page + how-to dialog).
REM 4 launch puzzles, EVERY fact verified vs nba_player_stats /
REM nba_players_extended_v2 / nba_draft_picks (Yao's #1 via nba_draft_picks).
REM Within-puzzle uniqueness enforced: caught + dodged Rondo-played-LAL,
REM Baron-Davis-played-NYK, Durant-is-#2-pick, Manute-Bol-country=USA traps.
REM Cloud table nba_connections_puzzles created + seeded (same 4 puzzles);
REM in-repo data file is the offline fallback, mirroring baseball.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/NbaConnections.tsx ^
  src/hooks/useNbaConnections.ts ^
  src/lib/fetchNbaConnectionsPuzzles.ts ^
  src/data/nbaConnectionsPuzzles.ts ^
  src/components/nba-connections/NbaConnectionsHowToPlay.tsx ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND12.bat

git commit -m "Add NBA Connections (4 DB-verified puzzles, cloud pool + fallback; Connections port)"
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
