@echo off
REM Round 9: CFB Higher or Lower — sixth Higher/Lower sport port (task #23).
REM Pool: career college passing yards from cfb_qb_stats (NCAA official
REM convention: pre-2002 bowls not counted — Brees 10,909, Manning 11,201).
REM Verified anchors: Keenum 19217, Gabriel 18722, Detmer 15031, Brady 4773.
REM Excluded: pre-1980 career starts (Elway/Marino/Kelly truncated at the
REM scrape's 1980 floor) + the Maryland "Josh Allen" name collision.
REM NASCAR H/L was investigated and is DATA-BLOCKED: nascar_driver_careers
REM is a null-riddled infobox scrape and nascar_race_results both misses
REM ~19 pre-1970 seasons (Petty 89 vs canonical 200) and overcounts modern
REM drivers with exhibition races (Earnhardt 91 vs 76). No clean axis.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/pages/CfbHigherLower.tsx ^
  src/hooks/useCfbHL.ts ^
  src/data/cfbHLPlayers.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND9.bat

git commit -m "Add CFB Higher or Lower (college passing yards, NCAA-official convention; sixth H/L sport port)"
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
