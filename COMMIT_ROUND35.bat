@echo off
REM Round 35 (2026-08-05): the owner's data-correctness and content round.
REM  - Fantasy Draft criteria are now ENFORCED (age data added; under-25 bug dead)
REM  - FIFA-style ratings sitewide with age correction (Lewa ~86, Mbappe ~91)
REM  - CM slots stop accepting wingers; World XI respins capped at 3
REM  - Odegaard rule: special letters (O-slash etc) match plain typing everywhere
REM  - Career Ladder: club nation flags, honest loss text, no more "stints"
REM  - Transfer Path: give up button reveals a real shortest path
REM  - Player Stock Market: blind box2box buying (names hidden til reveal)
REM  - GOLF IS LIVE: Guess The Golfer + Golf Higher or Lower
REM  - 337 em-dashes stripped from site copy across 111 files
REM  - Legal contact -> douknowball1@gmail.com; sitemap regenerated (94 games)
cd /d %~dp0
if exist .git\index.lock del /f .git\index.lock

echo === Unpacking payload ===
tar -xf _round35_payload.zip
if errorlevel 1 ( echo *** UNPACK FAILED *** & pause & exit /b 1 )

echo === Typechecking before commit ===
call node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 ( echo *** TYPECHECK FAILED - nothing committed. *** & pause & exit /b 1 )

git add ^
  docs/COMPETITOR_INTEL.md ^
  docs/GAME_ORDER_THE_LIST_SPEC.md ^
  docs/SESSION_2026-07-22_BUILD_FIX_AND_CONTENT.md ^
  public/sitemap.xml ^
  src/App.tsx ^
  src/components/conquest/ConquestBoard.tsx ^
  src/components/fantasy-draft/PlayerPool.tsx ^
  src/components/football-connect4/FootballConnect4HowToPlay.tsx ^
  src/components/game/GameNavbar.tsx ^
  src/components/game/PlayerAutocomplete.tsx ^
  src/components/game/PostGameStats.tsx ^
  src/components/grade-transfer/GradeTransferBoard.tsx ^
  src/components/jeopardy/JeopardyBoard.tsx ^
  src/components/mlb-connect4/MlbConnect4HowToPlay.tsx ^
  src/components/mystery-box/MysteryBoxBoard.tsx ^
  src/components/nba-career/NbaCareerHowToPlay.tsx ^
  src/components/nfl-connect4/NflConnect4HowToPlay.tsx ^
  src/components/nhl-connect4/NhlConnect4HowToPlay.tsx ^
  src/components/overrated-underrated/OverratedBoard.tsx ^
  src/components/rebuild/RebuildBoard.tsx ^
  src/components/tier-list/TierListBoard.tsx ^
  src/components/transfer-path/TransferPathBoard.tsx ^
  src/data/baseballConnectionsPuzzles.ts ^
  src/data/cfbHLPlayers.ts ^
  src/data/conquestData.ts ^
  src/data/conquestDataNba.ts ^
  src/data/emojiPuzzles.ts ^
  src/data/f1Drivers.ts ^
  src/data/gameRegistry.ts ^
  src/data/golfLegends.ts ^
  src/data/mlbConnect4Boards.ts ^
  src/data/mlbHLPlayers.ts ^
  src/data/nbaConnectionsPuzzles.ts ^
  src/data/nbaPerfectLineupPool.ts ^
  src/data/nflConnect4Boards.ts ^
  src/data/nflConnectionsPuzzles.ts ^
  src/data/nhlConnect4Boards.ts ^
  src/data/nhlConnectionsPuzzles.ts ^
  src/data/nhlPerfectLineupPool.ts ^
  src/data/olympicsAthletes.ts ^
  src/data/soccerClubPuzzles.ts ^
  src/data/teammatesPairs.ts ^
  src/hooks/useBallIq.ts ^
  src/hooks/useBudgetBuilder.ts ^
  src/hooks/useConnections.ts ^
  src/hooks/useConquest.ts ^
  src/hooks/useDailyPuzzle.ts ^
  src/hooks/useEmojiGuess.ts ^
  src/hooks/useFootballConnect4.ts ^
  src/hooks/useGame.ts ^
  src/hooks/useGolfHL.ts ^
  src/hooks/useGradeTransfer.ts ^
  src/hooks/useGuessTransferValue.ts ^
  src/hooks/useHockeyHL.ts ^
  src/hooks/useJeopardy.ts ^
  src/hooks/useMlbConnect4.ts ^
  src/hooks/useMysteryBox.ts ^
  src/hooks/useNascarChain.ts ^
  src/hooks/useNbaChain.ts ^
  src/hooks/useNbaConnect4.ts ^
  src/hooks/useNflConnect4.ts ^
  src/hooks/useNhlConnect4.ts ^
  src/hooks/useOverratedUnderrated.ts ^
  src/hooks/useSoccerGrid.ts ^
  src/hooks/useTennisChain.ts ^
  src/hooks/useTierList.ts ^
  src/hooks/useTransferPath.ts ^
  src/hooks/useWorldCup.ts ^
  src/lib/alphabetSprint.ts ^
  src/lib/careerEras.ts ^
  src/lib/careerLadder.ts ^
  src/lib/clubManager.ts ^
  src/lib/completions.ts ^
  src/lib/dartDraft.ts ^
  src/lib/fantasyCriteria.ts ^
  src/lib/fetchConnectionsPuzzles.ts ^
  src/lib/fetchFootlePlayerPool.ts ^
  src/lib/fetchOverratedPool.ts ^
  src/lib/fetchRebuild.ts ^
  src/lib/fetchShirtNumberPuzzles.ts ^
  src/lib/fetchTransferGrades.ts ^
  src/lib/listQuiz.ts ^
  src/lib/missingEleven.ts ^
  src/lib/missingFive.ts ^
  src/lib/missingNine.ts ^
  src/lib/missingXi.ts ^
  src/lib/mlbGrid.ts ^
  src/lib/nameFold.ts ^
  src/lib/nbaGrid.ts ^
  src/lib/orderTheList.ts ^
  src/lib/perfectSeasonExpansion.ts ^
  src/lib/playerSearch.ts ^
  src/lib/playerStockMarket.ts ^
  src/lib/rarityRound.ts ^
  src/lib/soccerCareerEngine.ts ^
  src/lib/soccerGridDifficulty.ts ^
  src/lib/squadDeal.ts ^
  src/lib/statDetective.ts ^
  src/lib/whoAmI.ts ^
  src/lib/worldXi.ts ^
  src/pages/BallIq.tsx ^
  src/pages/BudgetBuilder.tsx ^
  src/pages/CareerLadder.tsx ^
  src/pages/CfbHigherLower.tsx ^
  src/pages/EmojiGuess.tsx ^
  src/pages/F1Constructor.tsx ^
  src/pages/F1HigherLower.tsx ^
  src/pages/FantasyDraft.tsx ^
  src/pages/GolfHigherLower.tsx ^
  src/pages/GradeTransfer.tsx ^
  src/pages/GuessTennisPlayer.tsx ^
  src/pages/GuessTheGolfer.tsx ^
  src/pages/Index.tsx ^
  src/pages/Jeopardy.tsx ^
  src/pages/MissingEleven.tsx ^
  src/pages/MissingFive.tsx ^
  src/pages/MissingNine.tsx ^
  src/pages/MlbConnect4.tsx ^
  src/pages/MlbGrid.tsx ^
  src/pages/MlbHigherLower.tsx ^
  src/pages/MysteryBox.tsx ^
  src/pages/NbaHigherLower.tsx ^
  src/pages/NflConnect4.tsx ^
  src/pages/NflHigherLower.tsx ^
  src/pages/NhlConnect4.tsx ^
  src/pages/OverratedUnderrated.tsx ^
  src/pages/PlayerStockMarket.tsx ^
  src/pages/PrivacyPolicy.tsx ^
  src/pages/RankEm.tsx ^
  src/pages/Rebuild.tsx ^
  src/pages/SoccerCareer.tsx ^
  src/pages/TennisHigherLower.tsx ^
  src/pages/TermsOfService.tsx ^
  src/pages/WorldCupPredictor.tsx ^
  src/pages/WorldXi.tsx ^
  supabase/functions/fantasy-draft-daily/index.ts ^
  supabase/functions/report-relay/index.ts ^
  COMMIT_ROUND35.bat

git commit -m "Round 35: enforced fantasy criteria + age data, FIFA-style age-aware ratings, golf category live (2 games), accent-proof name matching, transfer path give-up, blind stock market, career ladder flags, em-dash purge, new sitemap + contact email"
if errorlevel 1 ( echo Nothing to commit, or commit failed. & pause & exit /b 1 )

git pull --rebase --autostash origin main
if errorlevel 1 ( echo *** REBASE CONFLICT - aborting clean. *** & git rebase --abort 2>nul & pause & exit /b 1 )

git push origin main
if errorlevel 1 ( echo *** PUSH FAILED *** & pause & exit /b 1 )

del _round35_payload.zip 2>nul
echo.
echo ===== SUCCESS. Preview rebuilds in ~2 min; Claude publishes after. =====
pause
