@echo off
REM Round 6: F1 Higher or Lower — third Higher/Lower sport port (task #23).
REM Pool: career Grand Prix WINS (not points — scoring systems changed too much
REM across eras) from f1_driver_standings, all 42 drivers with 8+ wins.
REM Verified canonical: Hamilton 105, Schumacher 91, Vettel 53, Prost 51,
REM Senna 41, Fangio 24, Moss 16, Ascari 13.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/F1HigherLower.tsx ^
  src/hooks/useF1HL.ts ^
  src/data/f1HLDrivers.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND6.bat

git commit -m "Add F1 Higher or Lower (career GP wins, 42 drivers verified vs canonical records; third H/L sport port)"
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
