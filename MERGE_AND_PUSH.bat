@echo off
REM Merge origin/main into local main, favoring LOCAL on conflicts, then push.
REM
REM WHY -X ours IS CORRECT HERE (2026-07-21): local and remote contain PARALLEL
REM implementations of the same work. The 7/15 local push silently never reached
REM GitHub, so the same fixes (remove 4 weak games, flag renders, Career Ladder
REM search) were redone through the Lovable editor as remote commits. Local is
REM the superset: it has all of that PLUS the login fix, Dart Draft v2, and the
REM 8 new games. -X ours resolves the double-implemented hunks to the local
REM version while still taking remote-only changes (sitemap trim) cleanly.
REM Verified before writing this: remote-only work touches ONLY 11 files, none
REM of them Anthony's uncommitted local edits.
cd /d %~dp0

echo === Merging origin/main (favoring local on conflicts) ===
git pull --no-rebase --no-edit --autostash -X ours origin main
if errorlevel 1 (
  echo.
  echo *** MERGE FAILED - see above. Nothing pushed. ***
  pause
  exit /b 1
)

echo.
echo === Pushing to GitHub ===
git push origin main
if errorlevel 1 (
  echo.
  echo *** PUSH FAILED - see the error above. ***
  pause
  exit /b 1
)

echo.
echo SUCCESS. All 4 local commits + the 8-games commit are on GitHub.
echo Lovable rebuilds the PREVIEW in ~1-2 min: ballpark-hero.lovable.app
echo *** douknowball.com does NOT update until you Publish. ***
pause
