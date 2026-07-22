@echo off
REM Round 2: Mystery Box game + repo housekeeping (backlog doc, merge script).
REM Typecheck-gated; explicit file list; rebase-with-autostash before push so
REM Anthony's uncommitted edits are preserved and remote drift is absorbed.
cd /d %~dp0

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 (
  echo *** TYPECHECK FAILED - nothing committed. ***
  pause
  exit /b 1
)
echo Typecheck clean.

echo.
echo === Staging ===
git add ^
  src/pages/MysteryBox.tsx ^
  src/components/mystery-box ^
  src/hooks/useMysteryBox.ts ^
  src/lib/fetchPackPool.ts ^
  src/App.tsx ^
  src/data/gameRegistry.ts ^
  docs/GAME_BACKLOG.md ^
  MERGE_AND_PUSH.bat ^
  COMMIT_ROUND2.bat

git commit -m "Add Mystery Box (15 packs, keep-or-bin, daily-seeded 4-3-3); check in game backlog doc + merge helper"
if errorlevel 1 (
  echo Nothing to commit, or commit failed.
  pause
  exit /b 1
)

echo.
echo === Sync with remote (rebase, autostash) ===
git pull --rebase --autostash origin main
if errorlevel 1 (
  echo *** REBASE CONFLICT - aborting clean. Commit intact, not pushed. ***
  git rebase --abort 2>nul
  pause
  exit /b 1
)

echo.
echo === Pushing ===
git push origin main
if errorlevel 1 (
  echo *** PUSH FAILED ***
  pause
  exit /b 1
)

echo.
echo SUCCESS. Preview rebuilds ~1-2 min. Publish still needed for douknowball.com.
pause
