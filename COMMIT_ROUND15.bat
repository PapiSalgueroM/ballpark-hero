@echo off
REM Round 15: NBA Career Path — closes task #25 (Career Path existed for
REM soccer/NFL/baseball/hockey; NBA was the only gap). Direct clone of the
REM HockeyCareer stack. 20 authored puzzles: team memberships, career
REM points/rebounds/assists and draft slots all verified against
REM nba_player_stats / nba_players_extended_v2 / nba_draft_picks during this
REM session (Ewing's Jamaica birthplace comes from the DB); active players
REM use "+"-style totals so numbers don't go stale.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/NbaCareer.tsx ^
  src/hooks/useNbaCareer.ts ^
  src/data/nbaCareerPlayers.ts ^
  src/components/nba-career/NbaCareerHowToPlay.tsx ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND15.bat

git commit -m "Add NBA Career Path (20 DB-verified player puzzles; closes the Career Path port series)"
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
