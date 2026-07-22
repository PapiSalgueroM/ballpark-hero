@echo off
REM Round 27: #12 hard mode, tranche 2 — the Higher/Lower family (7 games:
REM cfb, f1, hockey, mlb, nba, nfl, tennis). Hard = greedy close-gap pair
REM selection on each sport's stat (careerPassYds/careerWins/careerPoints/
REM careerHrs/careerPoints/careerTds/slams). SELECTION-ONLY: scoring
REM untouched. UNLIMITED-ONLY by design: daily pairs must stay canonical
REM because stored daily actions replay against the seed-derived pair list —
REM changing pairs mid-daily would corrupt reconstruction. The 😈 chip
REM switches to unlimited and rebuilds pairs. Soccer /higher-lower and
REM /higher-lower-transfers are DIFFERENT mechanics (pick-a-stat, transfer
REM fees) — excluded from this tranche, noted in task #12.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/hooks/useCfbHL.ts ^
  src/hooks/useF1HL.ts ^
  src/hooks/useHockeyHL.ts ^
  src/hooks/useMlbHL.ts ^
  src/hooks/useNbaHL.ts ^
  src/hooks/useNflHL.ts ^
  src/hooks/useTennisHL.ts ^
  src/pages/CfbHigherLower.tsx ^
  src/pages/F1HigherLower.tsx ^
  src/pages/HockeyHigherLower.tsx ^
  src/pages/MlbHigherLower.tsx ^
  src/pages/NbaHigherLower.tsx ^
  src/pages/NflHigherLower.tsx ^
  src/pages/TennisHigherLower.tsx ^
  COMMIT_ROUND27.bat

git commit -m "Hard mode for 7 Higher/Lower games (close-gap pair selection, unlimited-only; scoring and daily persistence untouched)"
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
