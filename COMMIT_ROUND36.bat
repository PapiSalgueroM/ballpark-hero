@echo off
REM Round 36 (2026-08-05, overnight): NFL night + crowd features.
REM  - NFL Higher/Lower: SIX stat categories now (pass yds, pass TDs, rush
REM    yds, rec yds, receptions, TDs scored), tie pairs banned in normal mode
REM  - NFL Career Path: real Unlimited mode, no more page reloads
REM  - NFL Connections: 4 new niche puzzles (SB MVPs, Heisman winners,
REM    unretirements, DWTS, undrafted, number 12s, Peyton targets, SB return
REM    TDs, iconic catches, 22-sack club, NFL brothers, number 1 picks,
REM    2k rushers, 5k passers, early retirements)
REM  - Missing Eleven: suggestion bar searches the whole league roster
REM  - Rarity Round: shows the crowd's most-picked answers + your rank
REM    among everyone who played today
REM  - Squad Deal: fifth board (Home Kit) + a banker that actually tempts
REM  - Tier List: never shares players with Overrated/Underrated again
cd /d %~dp0
if exist .git\index.lock del /f .git\index.lock
echo === Unpacking payload ===
tar -xf _round36_payload.zip
if errorlevel 1 ( echo *** UNPACK FAILED *** & pause & exit /b 1 )
echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 ( echo *** TYPECHECK FAILED - nothing committed. *** & pause & exit /b 1 )
git add ^
  docs/COMPETITOR_INTEL.md ^
  docs/GAME_ORDER_THE_LIST_SPEC.md ^
  docs/SESSION_2026-07-22_BUILD_FIX_AND_CONTENT.md ^
  src/data/golfLegends.ts ^
  src/data/nflHLCategories.ts ^
  src/hooks/useGolfHL.ts ^
  src/hooks/useNFLCareer.ts ^
  src/hooks/useNflHL.ts ^
  src/hooks/useTierList.ts ^
  src/lib/fantasyCriteria.ts ^
  src/lib/nameFold.ts ^
  src/lib/orderTheList.ts ^
  src/lib/squadDeal.ts ^
  src/pages/GolfHigherLower.tsx ^
  src/pages/GuessTheGolfer.tsx ^
  src/pages/MissingEleven.tsx ^
  src/pages/NFLCareer.tsx ^
  src/pages/NflHigherLower.tsx ^
  src/pages/RankEm.tsx ^
  src/pages/RarityRound.tsx ^
  supabase/functions/report-relay/index.ts ^
  COMMIT_ROUND36.bat
git commit -m "Round 36: NFL HL multi-stat categories, NFL career unlimited, 4 niche NFL connections puzzles, missing-eleven league-wide suggestions, rarity round crowd picks + daily rank, squad deal kit board + hotter banker, tier list dedupe vs overrated"
if errorlevel 1 ( echo Nothing to commit, or commit failed. & pause & exit /b 1 )
git pull --rebase --autostash origin main
if errorlevel 1 ( echo *** REBASE CONFLICT - aborting clean. *** & git rebase --abort 2>nul & pause & exit /b 1 )
git push origin main
if errorlevel 1 ( echo *** PUSH FAILED *** & pause & exit /b 1 )
del _round36_payload.zip 2>nul
echo.
echo ===== SUCCESS. =====
pause
