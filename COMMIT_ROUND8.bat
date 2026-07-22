@echo off
REM Round 8: Tennis Higher or Lower — fifth Higher/Lower sport port (task #23)
REM + tie-scoring fix across ALL five existing HL hooks.
REM Pool: career Grand Slam singles titles from tennis_grand_slam_winners,
REM with marriage-name merges (Margaret Smith+Court=24, Helen Wills x3=19,
REM Osborne+duPont=6) and disputed-count players excluded (Lenglen, Cochet,
REM Goolagong, pre-1920 era). Men + women share one pool by design.
REM Tie fix: old `>=` logic marked the right-side pick wrong on exact-equal
REM stats (e.g. three 521-HR careers in MLB, Nadal/Graf 22). Ties now score
REM correct for either pick in hockey/NBA/NFL/F1/MLB/tennis hooks.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/TennisHigherLower.tsx ^
  src/hooks/useTennisHL.ts ^
  src/data/tennisHLPlayers.ts ^
  src/hooks/useF1HL.ts ^
  src/hooks/useHockeyHL.ts ^
  src/hooks/useNbaHL.ts ^
  src/hooks/useNflHL.ts ^
  src/hooks/useMlbHL.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND8.bat

git commit -m "Add Tennis Higher or Lower (Grand Slam titles, name-merge verified) + fix tie scoring in all HL games"
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
