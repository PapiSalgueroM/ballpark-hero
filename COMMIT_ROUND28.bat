@echo off
REM Round 28: #12 hard mode, tranche 3 — the Career Path family (nba,
REM baseball, hockey, nfl). Hard = the two easiest clues stay hidden
REM (Position/Country or Draft leads; NFL variant hides the easiest leading
REM clues with an always-keep-one guard). DISPLAY-ONLY: the clue-level
REM action log and scoring are untouched, so daily replay is safe and the
REM toggle works in both modes. Soccer flagship career game excluded — it
REM already ships easy/hard natively.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/hooks/useNbaCareer.ts ^
  src/hooks/useBaseballCareer.ts ^
  src/hooks/useHockeyCareer.ts ^
  src/hooks/useNFLCareer.ts ^
  src/pages/NbaCareer.tsx ^
  src/pages/BaseballCareer.tsx ^
  src/pages/HockeyCareer.tsx ^
  src/pages/NFLCareer.tsx ^
  COMMIT_ROUND28.bat

git commit -m "Hard mode for 4 Career Path games (easiest clues hidden; display-only, scoring and daily persistence untouched)"
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
