@echo off
REM Round 23: Player Stock Market (task #36) — the last substantial unbuilt
REM concept with data support. Six real players at a seeded real past year
REM (2010-2025) with real market values + 3-year sparkline from
REM player_market_values (141k rows, 2004-2026, USD). Buy exactly 3; the
REM market advances one REAL year; portfolio return scored 0-100 against the
REM optimal C(6,3) trio. Everything DB-derived at runtime — nothing authored.
REM Data sanity-checked: Mbappe 4M->97M->216M, Salah 29M->43M->162M; identical
REM year-pairs are 9-26%% (real plateaus, not duplicated years).
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)

git add ^
  src/lib/playerStockMarket.ts ^
  src/pages/PlayerStockMarket.tsx ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  COMMIT_ROUND23.bat

git commit -m "Add Player Stock Market (buy 3 at real past market values; real next-year returns; DB-derived, seeded daily)"
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
