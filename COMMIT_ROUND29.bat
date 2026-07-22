@echo off
REM Round 29: fixes+cleanup batch.
REM  - Grid/Connect4 clients now honor the validators' new FAIL-CLOSED contract:
REM    grids treat {unverified:true} as a no-penalty "try again" (no wrong-guess
REM    burned, no red flash); nba/nfl/nhl/mlb Connect4 catch blocks no longer
REM    "allow on error" (a network/parse failure rejects with a retry message).
REM    (The 8 edge validators themselves were redeployed fail-closed via the
REM    Supabase MCP; that is server-side and not part of this git push.)
REM  - NBA autocomplete: shared search now matches split first/last names and
REM    surfaces stars (player_id-ascending prominence), so "LeBron"/"Kobe" resolve.
REM  - Player Stock Market: identity prefers person_key with player_name fallback
REM    (no-op today, forward-compatible with task #15).
REM  - docs: task #15 player-identity closure + collision-candidate backlog.
REM Career Path hard mode (commit fc53e47) is already on origin/main and ships
REM with this batch's publish.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/lib/playerSearch.ts ^
  src/lib/playerStockMarket.ts ^
  src/hooks/useSoccerGrid.ts ^
  src/hooks/useFootballGrid.ts ^
  src/hooks/useCollegeGrid.ts ^
  src/hooks/useNbaConnect4.ts ^
  src/hooks/useNflConnect4.ts ^
  src/hooks/useNhlConnect4.ts ^
  src/hooks/useMlbConnect4.ts ^
  docs/PLAYER_IDENTITY_KEYS_TASK15.md ^
  COMMIT_ROUND29.bat

git commit -m "Grids/Connect4 fail closed when answer-check is offline (grids don't burn a guess; Connect4 stops allow-on-error); NBA autocomplete matches first/full name and surfaces stars; stock market prefers person_key; task #15 identity doc"
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
