@echo off
REM Round 5: NFL Higher or Lower — second Higher/Lower sport port (task #23).
REM Pool: career rushing+receiving TDs from nflfastr_player_stats, REG only,
REM aggregated by stable player_id, careers starting 2000+ only (coverage
REM begins 1999, so earlier debuts would have silently truncated totals).
REM QBs excluded (thrown TDs are a different stat). Verified exact: LT 162,
REM Peterson 126, Fitzgerald 121, Gates 116, Calvin Johnson 84.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/NflHigherLower.tsx ^
  src/hooks/useNflHL.ts ^
  src/data/nflHLPlayers.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND5.bat

git commit -m "Add NFL Higher or Lower (career TDs, complete-careers-only pool verified vs nflfastr; second H/L sport port)"
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
