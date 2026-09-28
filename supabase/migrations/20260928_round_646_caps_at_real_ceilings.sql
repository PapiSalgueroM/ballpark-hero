-- Round 646: every leaderboard cap at its game's real ceiling.
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The lane owner applies it through
-- the Supabase MCP after review.
--
-- =====================================================================
-- ORDER
-- =====================================================================
--   1. PUBLISH ROUND 647 FIRST, or in the same release. This file sets the
--      four front offices and the two dynasties (front-office,
--      mlb-front-office, nba-front-office, nhl-front-office, cbb-dynasty,
--      cfb-dynasty) to 100, the per season ceiling Round 647 records against
--      (seasonCeiling() in src/lib/seasonLedger.ts). A client from before 647
--      records titles * 100 + seasonsPlayed * 5 on every title, which is
--      always at least 105, so applied under that client every title would
--      pay the full 100.
--   2. Round 644's migration owns soccer-career, player-bingo and
--      rarity-round (its part 1 refuses to run unless soccer-career still
--      reads 1000, and it rescales Soccer Career's history). This file does
--      not touch those three, so the two apply in either order.
--
-- =====================================================================
-- WHAT WAS WRONG
-- =====================================================================
-- The leaderboard scores a player's day in a game as
--     100 * min(day best, cap) / cap
-- (global_leaderboard, global_rank, player_ranks), so the cap decides what
-- every score is worth. Most caps were written on 2026-08-30 as the highest
-- score anybody had recorded by then ('frozen from live data'), which is a
-- fact about who had played, not about the game:
--   * A cap under the real ceiling pays the full 100 for less than a perfect
--     run and pays a perfect run no more: Golf Higher or Lower at 155 of 325
--     paid a 155 exactly what it paid a flawless 325, and Face Off at 470 of
--     2360 paid its median play (910) the full 100.
--   * A cap over the real ceiling means a perfect run can never reach 100:
--     Budget Builder at 1120 (a leftover of its old scale) against a real
--     most of 126 paid a perfect build 11 points, Sign the Player at
--     56,000,000 against 697 paid an auction a thousandth of a point.
--   * The four front offices recorded the same achievement against four
--     different caps. A title in the first season records 105, which paid
--     7.9 (NFL, cap 1325), 11.9 (MLB, 885), 2.8 (NBA, 3810) and 4.9 (NHL,
--     2125). Under Round 647 a perfect season records 100, which would pay
--     7.5, 11.3, 2.6 and 4.7. After this file it pays 100 in all four.
--
-- Every scored game's engine now exports the most it can record, computed
-- from its rules, and every row below is that export (the note names it).
-- scripts/simCapsAreCeilings.mjs holds this file, the committed snapshot of
-- the table (scripts/data/gameScoreCaps.mjs) and the engines to one another,
-- and fails on the first that drifts.
--
-- =====================================================================
-- WHAT IT CHANGES, read from the live table on 2026-09-28
-- =====================================================================
--   game                          cap read  ->  real ceiling
--   afl-higher-lower                   270  ->  325
--   baseball-connections               500  ->  1000
--   budget-builder                    1120  ->  126
--   buzzer-beater                     3012  ->  3045
--   cbb-dynasty                       1375  ->  100   (Round 647)
--   cbb-grid                          NULL  ->  900
--   cfb-dynasty                        790  ->  100   (Round 647)
--   champ-or-not                         7  ->  10
--   clue-auction                      NULL  ->  100
--   conquest-imperialism               818  ->  943
--   conquest-mlb-imperialism           799  ->  849
--   conquest-nba-imperialism           774  ->  849
--   conquest-nhl-imperialism           450  ->  899
--   dart-draft                         813  ->  824
--   face-off                           470  ->  2360
--   fantasy-draft                       83  ->  100
--   football-connect-4                NULL  ->  500
--   football-grid                     1000  ->  900
--   free-kick                         3424  ->  3490
--   front-office                      1325  ->  100   (Round 647)
--   golf-higher-lower                  155  ->  325
--   grade-transfer                    NULL  ->  500
--   guess-nascar-driver                800  ->  1000
--   guess-soccer-club-questions        870  ->  1000
--   guess-tennis-player                800  ->  1000
--   guess-the-golfer                   500  ->  600
--   guess-transfer-value              NULL  ->  900
--   minefield                          390  ->  440
--   mlb-connect-4                     NULL  ->  500
--   mlb-front-office                   885  ->  100   (Round 647)
--   mlb-higher-lower                   230  ->  325
--   mystery-box                        760  ->  960
--   nba-connect-4                     NULL  ->  500
--   nba-front-office                  3810  ->  100   (Round 647)
--   nba-stat-line                     NULL  ->  100
--   nfl-connect-4                     NULL  ->  500
--   nhl-connect-4                     NULL  ->  500
--   nhl-front-office                  2125  ->  100   (Round 647)
--   perfect-lineup                      75  ->  114
--   perfect-lineup-f1                   94  ->  100
--   perfect-lineup-nba                  96  ->  100
--   perfect-lineup-nhl                  93  ->  100
--   perfect-season-mlb                 126  ->  162
--   perfect-season-nba                  77  ->  82
--   perfect-season-nfl                  15  ->  17
--   perfect-season-nhl                NULL  ->  82
--   puck-detective                      50  ->  80
--   rank-em                            600  ->  1000
--   rebuild                            940  ->  990
--   search-and-discard                  82  ->  100
--   sign-the-player               56000000  ->  697
--   silverware-sort                     11  ->  15
--   soccer-grid                        950  ->  900
--   tennis-higher-lower                185  ->  325
--   whod-they-beat                       6  ->  10
--   world-cup                          800  ->  1000
-- The other 60 rows below already sat at their ceiling; they are written
-- again so every scored game's note names the export behind its number.
-- A NULL cap fell back to the 99th percentile of the game's own scores,
-- which for the five Connect 4 keys, grade-transfer and guess-transfer-value
-- was 1 (no scored rows), so a posted score of 1 paid the full 100.
--
-- =====================================================================
-- WHAT IT DOES NOT CHANGE
-- =====================================================================
-- Thirteen games have no real ceiling to set, so their caps stay exactly as
-- read. Each needs a scoring scale of its own first (the Round 644 Soccer
-- Career rescale is the shape), and each is listed with its reason in
-- scripts/lib/scoreCeilingTable.mjs:
--   alphabet-sprint (4), higher-lower (7000), higher-lower-transfers (NULL),
--   list-quiz (NULL), pack-battle (54000000), nascar-chain (2000),
--   nba-chain (1500), tennis-chain (400), ufc-chain (450), nfl-my-career
--   (3651), nba-my-career (2893), mlb-my-career (2192), nhl-my-career (1462).
-- Seven keys record a play with no score, so the board never reads them and
-- their caps stay NULL: hall-of-champions, idle-arena, stadium-tycoon,
-- stat-detective, who-am-i, world-cup-bracket, wonderkid-factory.
-- The twelve retired keys keep their caps so their history still counts.
--
-- HISTORY IS NOT RESCALED. Every past day is scored against the new cap the
-- moment this lands. Raised caps lower what past scores in those games pay;
-- lowered caps clamp more past scores at the full 100. Measured read only on
-- 2026-09-28, the rows the lowered caps newly clamp:
--   budget-builder   487 of 823 rows above 126 (its pre Round 315 scale,
--                    already paying 86 to 100 against 1120)
--   soccer-grid      1 of 91 above 900; football-grid 1 of 20 above 900
--   sign-the-player  5 of 331 above 697
--   the six season games: every recorded row, 1,498 in all (front-office 335,
--     mlb 107, nba 715, nhl 126, cbb-dynasty 122, cfb-dynasty 93), because
--     each was a title recorded as titles * 100 + seasonsPlayed * 5, at least
--     105. Each of those title days pays 100 afterwards. Round 647 records
--     one row a season from its publish on and leaves these as they are.
--
-- NO CACHED CAP TO BUST. game_denominators is a plain view over this table,
-- read live by global_leaderboard and global_rank, and player_ranks is rebuilt
-- every five minutes by the refresh-player-ranks cron job. The browser's
-- clamp (Round 648, src/lib/scoreCaps.ts) reads the same view.
--
-- BACKUP FIRST, IN THE SAME TRANSACTION. private.r646_caps_bak holds every
-- row of the table as it stood (written once; a rerun leaves it alone). It
-- lives in the private schema, which the API does not serve. To put every cap
-- back exactly:
--   update public.game_score_caps c
--      set max_score = b.max_score, note = b.note, updated_at = b.updated_at
--     from private.r646_caps_bak b
--    where b.game = c.game;

create table if not exists private.r646_caps_bak (
  game text primary key,
  max_score integer,
  note text,
  updated_at timestamptz,
  backed_up_at timestamptz not null default now()
);
revoke all on private.r646_caps_bak from public, anon, authenticated;

insert into private.r646_caps_bak (game, max_score, note, updated_at)
select c.game, c.max_score, c.note, c.updated_at
  from public.game_score_caps c
 where not exists (select 1 from private.r646_caps_bak);

insert into public.game_score_caps (game, max_score, note)
values
  ('afl-higher-lower', 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
  ('ball-iq', 1600, 'Round 646: engine ceiling, src/hooks/useBallIq.ts BALL_IQ_CEILING'),
  ('baseball-career', 1000, 'Round 646: engine ceiling, src/lib/careerClueScores.ts CAREER_CLUE_CEILING'),
  ('baseball-connections', 1000, 'Round 646: engine ceiling, src/lib/connectionsScore.ts CONNECTIONS_CEILING'),
  ('budget-builder', 126, 'Round 646: engine ceiling, src/hooks/useBudgetBuilder.ts budgetBuilderCeiling'),
  ('build-your-xi', 500, 'Round 646: engine ceiling, src/hooks/useLineupBuilder.ts BUILD_YOUR_XI_CEILING'),
  ('buzzer-beater', 3045, 'Round 646: engine ceiling, src/lib/buzzerBeater.ts buzzerBeaterCeiling'),
  ('career', 700, 'Round 646: engine ceiling, src/hooks/useCareerGame.ts CAREER_CEILING'),
  ('career-ladder', 1000, 'Round 646: engine ceiling, src/lib/careerLadder.ts CAREER_LADDER_CEILING'),
  ('cbb-dynasty', 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
  ('cbb-grid', 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
  ('cfb-dynasty', 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
  ('cfb-higher-lower', 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
  ('champ-or-not', 10, 'Round 646: engine ceiling, src/lib/champOrNot.ts CHAMP_OR_NOT_CEILING'),
  ('club-manager', 130, 'Round 646: engine ceiling, src/lib/clubManagerScore.ts ledgerCeiling'),
  ('clue-auction', 100, 'Round 646: engine ceiling, src/lib/clueAuction.ts CLUE_AUCTION_CEILING'),
  ('college-grid', 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
  ('connections', 1000, 'Round 646: engine ceiling, src/lib/connectionsScore.ts CONNECTIONS_CEILING'),
  ('conquest-imperialism', 943, 'Round 646: engine ceiling, src/lib/imperialismEngine.ts perfectScore(NFL_IMPERIALISM)'),
  ('conquest-mlb-imperialism', 849, 'Round 646: engine ceiling, src/lib/imperialismEngine.ts perfectScore(MLB_IMPERIALISM)'),
  ('conquest-nba-imperialism', 849, 'Round 646: engine ceiling, src/lib/imperialismEngine.ts perfectScore(NBA_IMPERIALISM)'),
  ('conquest-nhl-imperialism', 899, 'Round 646: engine ceiling, src/lib/imperialismEngine.ts perfectScore(NHL_IMPERIALISM)'),
  ('conquest-soccer-imperialism', 1037, 'Round 646: engine ceiling, src/lib/imperialismEngine.ts perfectScore(SOCCER_IMPERIALISM)'),
  ('dart-draft', 824, 'Round 646: engine ceiling, src/pages/DartDraft.tsx dartDraftCeiling'),
  ('emoji-guess', 500, 'Round 646: engine ceiling, src/hooks/useEmojiGuess.ts EMOJI_GUESS_CEILING'),
  ('f1-constructor', 1000, 'Round 646: engine ceiling, src/types/f1Constructor.ts SCORE_CEILING'),
  ('f1-driver', 1000, 'Round 646: engine ceiling, src/types/f1Driver.ts SCORE_CEILING'),
  ('f1-higher-lower', 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
  ('face-off', 2360, 'Round 646: engine ceiling, src/lib/faceOff.ts faceOffCeiling'),
  ('fantasy-draft', 100, 'Round 646: engine ceiling, src/pages/FantasyDraft.tsx FANTASY_DRAFT_CEILING'),
  ('fight-career', 100, 'Round 646: engine ceiling, src/lib/fightCareer.ts FIGHT_CAREER_CEILING'),
  ('fight-gym', 100, 'Round 646: engine ceiling, src/lib/fightGym.ts FIGHT_GYM_CEILING'),
  ('fight-promoter', 100, 'Round 646: engine ceiling, src/lib/fightPromoter.ts FIGHT_PROMOTER_CEILING'),
  ('football-connect-4', 500, 'Round 646: engine ceiling, src/lib/connect4Score.ts CONNECT4_CEILING'),
  ('football-draft', 1500, 'Round 646: engine ceiling, src/hooks/useFootballDraft.ts footballDraftCeiling'),
  ('football-grid', 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
  ('football-timeline', 500, 'Round 646: engine ceiling, src/hooks/useFootballTimeline.ts footballTimelineCeiling'),
  ('footle', 700, 'Round 646: engine ceiling, src/hooks/useGame.ts FOOTLE_CEILING'),
  ('free-kick', 3490, 'Round 646: engine ceiling, src/lib/freeKick.ts freeKickCeiling'),
  ('front-office', 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
  ('gauntlet-draft', 100, 'Round 646: engine ceiling, src/lib/gauntletDraft.ts gauntletDraftCeiling'),
  ('golf-higher-lower', 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
  ('grade-transfer', 500, 'Round 646: engine ceiling, src/hooks/useGradeTransfer.ts gradeTransferCeiling'),
  ('guess-cbb-team', 1000, 'Round 646: engine ceiling, src/types/cbbProgram.ts SCORE_CEILING'),
  ('guess-nascar-driver', 1000, 'Round 646: engine ceiling, src/types/nascarDriver.ts SCORE_CEILING'),
  ('guess-nfl-team', 1200, 'Round 646: engine ceiling, src/types/guessNflTeam.ts SCORE_CEILING'),
  ('guess-soccer-club', 1200, 'Round 646: engine ceiling, src/types/guessSoccerClub.ts SCORE_CEILING'),
  ('guess-soccer-club-questions', 1000, 'Round 646: engine ceiling, src/lib/clubQuestionTree.ts QUESTION_TREE_CEILING'),
  ('guess-tennis-player', 1000, 'Round 646: engine ceiling, src/types/tennisPlayer.ts SCORE_CEILING'),
  ('guess-the-college', 1200, 'Round 646: engine ceiling, src/hooks/useGuessTheCollege.ts GUESS_THE_COLLEGE_CEILING'),
  ('guess-the-golfer', 600, 'Round 646: engine ceiling, src/pages/GuessTheGolfer.tsx GUESS_THE_GOLFER_CEILING'),
  ('guess-the-nation', 1200, 'Round 646: engine ceiling, src/types/guessTheNation.ts SCORE_CEILING'),
  ('guess-the-year', 1000, 'Round 646: engine ceiling, src/types/guessTheYear.ts SCORE_CEILING'),
  ('guess-transfer-value', 900, 'Round 646: engine ceiling, src/hooks/useGuessTransferValue.ts GUESS_TRANSFER_VALUE_CEILING'),
  ('hockey-career', 1000, 'Round 646: engine ceiling, src/lib/careerClueScores.ts CAREER_CLUE_CEILING'),
  ('hockey-grid', 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
  ('hockey-higher-lower', 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
  ('hof-or-bust', 1000, 'Round 646: engine ceiling, src/hooks/useHofOrBust.ts HOF_OR_BUST_CEILING'),
  ('jeopardy', 15000, 'Round 646: engine ceiling, src/hooks/useQuizBoard.ts quizBoardCeiling'),
  ('minefield', 440, 'Round 646: engine ceiling, src/lib/minefield.ts minefieldCeiling'),
  ('missing-eleven', 100, 'Round 646: engine ceiling, src/lib/missingEleven.ts MISSING_ELEVEN_CEILING'),
  ('missing-five', 100, 'Round 646: engine ceiling, src/lib/missingFive.ts MISSING_FIVE_CEILING'),
  ('missing-nine', 100, 'Round 646: engine ceiling, src/lib/missingNine.ts MISSING_NINE_CEILING'),
  ('missing-xi', 100, 'Round 646: engine ceiling, src/lib/missingXi.ts MISSING_XI_CEILING'),
  ('mlb-connect-4', 500, 'Round 646: engine ceiling, src/lib/connect4Score.ts CONNECT4_CEILING'),
  ('mlb-front-office', 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
  ('mlb-gauntlet-draft', 100, 'Round 646: engine ceiling, src/lib/gauntletEngine.ts gauntletCeiling(MLB_GAUNTLET_CONFIG)'),
  ('mlb-grid', 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
  ('mlb-higher-lower', 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
  ('mystery-box', 960, 'Round 646: engine ceiling, src/hooks/useMysteryBox.ts mysteryBoxCeiling'),
  ('nba-career', 1000, 'Round 646: engine ceiling, src/lib/careerClueScores.ts CAREER_CLUE_CEILING'),
  ('nba-connect-4', 500, 'Round 646: engine ceiling, src/lib/connect4Score.ts CONNECT4_CEILING'),
  ('nba-connections', 1000, 'Round 646: engine ceiling, src/lib/connectionsScore.ts CONNECTIONS_CEILING'),
  ('nba-front-office', 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
  ('nba-gauntlet-draft', 100, 'Round 646: engine ceiling, src/lib/gauntletEngine.ts gauntletCeiling(NBA_GAUNTLET_CONFIG)'),
  ('nba-grid', 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
  ('nba-higher-lower', 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
  ('nba-starting-5', 500, 'Round 646: engine ceiling, src/hooks/useNbaLineup.ts NBA_STARTING_5_CEILING'),
  ('nba-stat-line', 100, 'Round 646: engine ceiling, src/lib/nbaStatLine.ts NBA_STAT_LINE_CEILING'),
  ('nfl-career', 6, 'Round 646: engine ceiling, src/hooks/useNFLCareer.ts NFL_CAREER_CEILING'),
  ('nfl-connect-4', 500, 'Round 646: engine ceiling, src/lib/connect4Score.ts CONNECT4_CEILING'),
  ('nfl-connections', 1000, 'Round 646: engine ceiling, src/lib/connectionsScore.ts CONNECTIONS_CEILING'),
  ('nfl-gauntlet-draft', 100, 'Round 646: engine ceiling, src/lib/gauntletEngine.ts gauntletCeiling(NFL_GAUNTLET_CONFIG)'),
  ('nfl-higher-lower', 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
  ('nhl-connect-4', 500, 'Round 646: engine ceiling, src/lib/connect4Score.ts CONNECT4_CEILING'),
  ('nhl-connections', 1000, 'Round 646: engine ceiling, src/lib/connectionsScore.ts CONNECTIONS_CEILING'),
  ('nhl-front-office', 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
  ('olympics', 1000, 'Round 646: engine ceiling, src/lib/careerClueScores.ts CAREER_CLUE_CEILING'),
  ('perfect-lineup', 114, 'Round 646: engine ceiling, src/hooks/usePerfectLineup.ts perfectLineupCeiling'),
  ('perfect-lineup-f1', 100, 'Round 646: engine ceiling, src/lib/perfectLineupEngine.ts PERFECT_LINEUP_RATING_CEILING'),
  ('perfect-lineup-nba', 100, 'Round 646: engine ceiling, src/lib/perfectLineupEngine.ts PERFECT_LINEUP_RATING_CEILING'),
  ('perfect-lineup-nhl', 100, 'Round 646: engine ceiling, src/lib/perfectLineupEngine.ts PERFECT_LINEUP_RATING_CEILING'),
  ('perfect-season-mlb', 162, 'Round 646: engine ceiling, src/lib/perfectSeasonMlb.ts PERFECT_SEASON_MLB_CEILING'),
  ('perfect-season-nba', 82, 'Round 646: engine ceiling, src/lib/perfectSeasonNba.ts PERFECT_SEASON_NBA_CEILING'),
  ('perfect-season-nfl', 17, 'Round 646: engine ceiling, src/lib/perfectSeasonNfl.ts PERFECT_SEASON_NFL_CEILING'),
  ('perfect-season-nhl', 82, 'Round 646: engine ceiling, src/lib/perfectSeasonNhl.ts PERFECT_SEASON_NHL_CEILING'),
  ('player-stock-market', 100, 'Round 646: engine ceiling, src/lib/playerStockMarket.ts STOCK_MARKET_CEILING'),
  ('puck-detective', 80, 'Round 646: engine ceiling, src/pages/PuckDetective.tsx puckDetectiveCeiling'),
  ('rank-em', 1000, 'Round 646: engine ceiling, src/lib/orderTheList.ts rankEmCeiling'),
  ('rebuild', 990, 'Round 646: engine ceiling, src/hooks/useRebuild.ts rebuildCeiling'),
  ('score-predictor', 1000, 'Round 646: engine ceiling, src/hooks/useScorePredictor.ts SCORE_PREDICTOR_CEILING'),
  ('search-and-discard', 100, 'Round 646: engine ceiling, src/pages/SearchAndDiscard.tsx SEARCH_AND_DISCARD_CEILING'),
  ('shirt-number', 1000, 'Round 646: engine ceiling, src/hooks/useShirtNumber.ts SHIRT_NUMBER_CEILING'),
  ('sign-the-player', 697, 'Round 646: engine ceiling, src/lib/auctionHouse.ts signThePlayerCeiling'),
  ('silverware-sort', 15, 'Round 646: engine ceiling, src/lib/silverwareSort.ts SILVERWARE_SORT_CEILING'),
  ('soccer-grid', 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
  ('sports-bingo', 100, 'Round 646: engine ceiling, src/lib/sportsBingo.ts sportsBingoCeiling'),
  ('sports-millionaire', 1000000, 'Round 646: engine ceiling, src/lib/sportsMillionaire.ts SPORTS_MILLIONAIRE_CEILING'),
  ('squad-deal', 100, 'Round 646: engine ceiling, src/lib/squadDeal.ts SQUAD_DEAL_CEILING'),
  ('teammates', 1000, 'Round 646: engine ceiling, src/hooks/useTeammates.ts TEAMMATES_CEILING'),
  ('tennis-higher-lower', 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
  ('transfer-path', 1000, 'Round 646: engine ceiling, src/hooks/useTransferPath.ts TRANSFER_PATH_CEILING'),
  ('ufc', 700, 'Round 646: engine ceiling, src/hooks/useUfcGame.ts UFC_CEILING'),
  ('whod-they-beat', 10, 'Round 646: engine ceiling, src/lib/whodTheyBeat.ts WHOD_THEY_BEAT_CEILING'),
  ('world-cup', 1000, 'Round 646: engine ceiling, src/hooks/useWorldCup.ts WORLD_CUP_CEILING'),
  ('world-xi', 11, 'Round 646: engine ceiling, src/pages/WorldXi.tsx worldXiCeiling')
on conflict (game) do update
  set max_score = excluded.max_score,
      note = excluded.note,
      updated_at = now();
