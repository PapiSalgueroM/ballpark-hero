-- Round 646: every leaderboard cap at its game's real ceiling, and every past
-- day keeps what it was worth when it was played.
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT, and never run against any database
-- by it. The release manager applies it through the Supabase MCP
-- (apply_migration) after review, and runs get_advisors afterwards as the
-- database rules require (this file creates a table, a view and a
-- materialized view).
--
-- IT FAILS CLOSED. Everything that writes is one DO block, and a DO block is
-- one statement: every precondition below is asserted before the first
-- write, the block checks its own result before it ends, and any failure
-- raises and takes the whole block back with it, however the file is run.
--
-- =====================================================================
-- ORDER AND PRECONDITIONS, each asserted in the block before any write
-- =====================================================================
--   1. ROUND 647 IS LIVE AND THE OLD CLIENT HAS GONE. This file sets the four
--      front offices and the two dynasties (front-office, mlb-front-office,
--      nba-front-office, nhl-front-office, cbb-dynasty, cfb-dynasty) to 100,
--      the per season ceiling Round 647 records against (seasonCeiling() in
--      src/lib/seasonLedger.ts). A client from before 647 records
--      titles * 100 + seasonsPlayed * 5 on every title, always at least 105,
--      and under a cap of 100 each of those would pay the full 100. So the
--      block reads the six games' rows from the last 24 hours (v_quiet) and
--      refuses unless there is at least one on 647's scale (1 to 100, which
--      the old client never writes: it records only titles, at 105 or more)
--      and none above 100 (an old tab still recording). Publish 647, then
--      apply this once a whole day has passed with no old scale row. Until
--      then it refuses, and nothing is changed.
--   2. THIS FILE HAS NOT RUN BEFORE: public.game_score_cap_history and
--      private.r646_caps_bak do not exist yet.
--   3. EVERY ROW IT WRITES STILL READS WHAT IT WAS WRITTEN AGAINST. Each
--      tuple below carries the cap read from the live table on 2026-09-28
--      beside the new one. A row that reads anything else means the table
--      moved after this file was written: re-read it, re-derive the rows and
--      rewrite this file.
--   4. THE BOARD IS THE ROUND 537 BOARD this file extends: global_leaderboard
--      and global_rank read game_denominators on the Eastern day
--      (20260911_leaderboard_eastern_day.sql), and player_ranks is a
--      materialized view. Anything else is a definition nobody reviewed
--      against this file: merge by hand.
--
-- The other rounds of this economy:
--   * Round 644's migration owns soccer-career, player-bingo and rarity-round
--     and rescales Soccer Career's history on purpose. This file writes no
--     row of theirs and no history for them, so the two apply in either
--     order and 644's rescale still applies to every day.
--   * Round 648's migration applies after this one (its own precondition
--     checks that private.r646_caps_bak exists).
--   * perfect-lineup goes to 100, the classic daily lineup's ceiling, because
--     Round 645 ranks only that lineup (Go Unbeaten and Unlimited record as
--     plays with no score). Published in the same release as 645, that holds
--     from the first day; a Go Unbeaten season recorded by a client from
--     before 645 clamps at 100.
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
--     1900 paid its median play (910) the full 100.
--   * A cap over the real ceiling means a perfect run can never reach 100:
--     Budget Builder at 1120 (a leftover of its old scale) against a rule
--     bound of 126 paid a perfect build 11 points, Sign the Player at
--     56,000,000 against 697 paid an auction a thousandth of a point.
--   * The four front offices recorded the same achievement against four
--     different caps. A title in the first season records 105, which paid
--     7.9 (NFL, cap 1325), 11.9 (MLB, 885), 2.8 (NBA, 3810) and 4.9 (NHL,
--     2125). Under Round 647 a perfect season records 100, which would pay
--     7.5, 11.3, 2.6 and 4.7. After this file it pays 100 in all four.
--
-- Every scored game's engine now exports the most it can record, read off the
-- code that records it: the scoring function on a perfect input, or the
-- constants that function reads. Every row below is that export (the note
-- names it). scripts/simCapsAreCeilings.mjs holds this file, the committed
-- snapshot of the table (scripts/data/gameScoreCaps.mjs) and the engines to
-- one another, plays a perfect run through the scoring code of fifty of the
-- games against the cap, and fails on the first that drifts.
--
-- =====================================================================
-- WHAT IT CHANGES, read from the live table on 2026-09-28
-- =====================================================================
--   game                          cap read  ->  real ceiling
--   afl-higher-lower                   270  ->  325
--   baseball-connections               500  ->  1000
--   budget-builder                    1120  ->  126   (a rule bound)
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
--   face-off                           470  ->  1900  (a flawless outright win)
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
--   perfect-lineup                      75  ->  100   (the classic daily)
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
--   sign-the-player               56000000  ->  697   (a rule bound)
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
-- Face Off's cap is the flawless outright win (ten rounds right at once, 190
-- a round, because the first whole second is always gone by the time a pick
-- lands). A tied match plays up to three more rounds and can record more;
-- that surplus is clamped, so playing for a tie earns nothing a perfect match
-- does not. Budget Builder and Sign the Player are bounds from the rules: no
-- real board reaches them, because the best rated squad cannot also keep the
-- budget, and what a board can reach depends on the pool the database deals.
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
-- =====================================================================
-- PAST DAYS KEEP WHAT THEY WERE WORTH
-- =====================================================================
-- Before this file the board divided every row, of every day, by the cap in
-- the table today, so changing a cap rewrote history: under the new caps the
-- 1,498 old cumulative front office and dynasty title rows (front-office
-- 335, mlb 107, nba 715, nhl 126, cbb-dynasty 122, cfb-dynasty 93, each at
-- least 105) would each have paid 100 instead of 2.8 to 11.9, 487 of Budget
-- Builder's 823 rows from its pre Round 315 scale would have clamped at 100,
-- and every raised cap would have cut what past plays in that game earned.
--
-- So the cap now has a history. public.game_score_cap_history holds, for
-- every game this file moves, the denominator the board used until the
-- moment this block runs (v_switch, the transaction's start): the cap read,
-- or for a NULL cap the 99th percentile fallback exactly as
-- game_denominators gave it at that moment. public.game_cap_periods turns
-- the history plus today's game_denominators into periods, [valid_from,
-- valid_until), and the board joins each row to the period its created_at
-- falls in and scores the row against that period's cap. A day's points are
-- the best of its rows so scored. For any day that lies wholly in one period
-- that is exactly the old sum, row for row and to the last decimal; the
-- block proves it before it ends (check A below) for every row played
-- before v_switch. Only the day v_switch falls in can mix two caps, and each
-- of its rows still counts against the cap in force when it was played.
--
-- The history is keyed to games still in game_score_caps, so deleting a
-- game's cap still takes the whole game off the board, as it always has.
-- A later cap change is only history safe if it writes its own history row
-- the way this block does; an update that skips it rescales that game's past,
-- which is what Round 644 does on purpose for Soccer Career.
--
-- =====================================================================
-- WHAT A CAP CHANGE MEANS ELSEWHERE
-- =====================================================================
-- game_denominators is unchanged: a plain view over game_score_caps, today's
-- caps, with the NULL fallback. The board's live functions read the new
-- periods at once, and player_ranks is rebuilt inside this block and then
-- every five minutes by the refresh-player-ranks cron job.
--
-- ROUND 648 IS NOT HISTORY SAFE, AND THIS FILE DOES NOT MAKE IT SO. 648's
-- profile total (src/lib/pointsRule.ts, and its migration's stored
-- user_scores.total_points) adds least(day best, cap) with TODAY's cap on
-- every past day, and 648's migration says its part 2 recompute must be rerun
-- whenever a cap changes. So when this applies, a profile's all time total
-- moves on its past days even though the World Leaderboard's does not: a
-- Budget Builder day recorded at 1000 counted 1000 and counts 126, a front
-- office title recorded at 305 counted 305 and counts 100, and a raised cap
-- (Golf Higher or Lower, 155 to 325) lets past plays count up to it. And in
-- the browser, src/lib/scoreCaps.ts (on r648-profile-clamp) keeps its read of
-- game_score_caps in localStorage for six hours (FRESH_MS), and a play only
-- asks for a new read once that copy is older than that: for up to six hours
-- after this applies, a browser holding a fresh copy credits new plays in its
-- own tally (src/lib/streaks.ts) against the OLD caps (budget-builder at
-- 1120, sign-the-player at 56,000,000, the front offices at 885 to 3810), and
-- a play in a game whose NULL cap this file sets is credited with no ceiling
-- at all. That tally is a running sum: a play credited in those hours keeps
-- that credit for good, and only plays after the next read count at the new
-- caps. The server's save reads the table itself, so a play saved after this
-- applies counts at the new cap at once; what past days add to a stored
-- total moves only when 648's part 2 is rerun, as above.
--
-- =====================================================================
-- BACKUP AND UNDO
-- =====================================================================
-- private.r646_caps_bak holds every row of game_score_caps as it stood,
-- written inside the block before anything moves. It lives in the private
-- schema, which the API does not serve. To put every cap back exactly and
-- score every day against it again:
--   update public.game_score_caps c
--      set max_score = b.max_score, note = b.note, updated_at = b.updated_at
--     from private.r646_caps_bak b
--    where b.game = c.game;
--   delete from public.game_score_cap_history where note like 'Round 646:%';
-- With no history rows every game has one period, today's cap, and the board
-- is exactly the Round 537 board again.

do $r646$
declare
  v_switch constant timestamptz := now();
  v_quiet constant interval := interval '24 hours';
  v_season constant text[] := array[
    'front-office', 'mlb-front-office', 'nba-front-office', 'nhl-front-office',
    'cbb-dynasty', 'cfb-dynasty'];
  v_bad text;
  v_def text;
  v_n bigint;
  v_old_scale bigint;
  v_ledger_scale bigint;
  v_written integer;
  v_history integer;
  v_days bigint;
begin
  /* =================== the rows this file writes =================== */
  /* (game, the cap read on 2026-09-28, the new cap, the note naming the
     export behind it). NULL read means the cap was NULL. */
  create temp table r646_rows (
    game text primary key,
    cap_read integer,
    cap_after integer not null check (cap_after >= 1),
    note text not null
  ) on commit drop;

  insert into r646_rows (game, cap_read, cap_after, note)
  values
    ('afl-higher-lower', 270, 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
    ('ball-iq', 1600, 1600, 'Round 646: engine ceiling, src/hooks/useBallIq.ts BALL_IQ_CEILING'),
    ('baseball-career', 1000, 1000, 'Round 646: engine ceiling, src/lib/careerClueScores.ts CAREER_CLUE_CEILING'),
    ('baseball-connections', 500, 1000, 'Round 646: engine ceiling, src/lib/connectionsScore.ts CONNECTIONS_CEILING'),
    ('budget-builder', 1120, 126, 'Round 646: engine ceiling, src/hooks/useBudgetBuilder.ts budgetBuilderCeiling'),
    ('build-your-xi', 500, 500, 'Round 646: engine ceiling, src/hooks/useLineupBuilder.ts BUILD_YOUR_XI_CEILING'),
    ('buzzer-beater', 3012, 3045, 'Round 646: engine ceiling, src/lib/buzzerBeater.ts buzzerBeaterCeiling'),
    ('career', 700, 700, 'Round 646: engine ceiling, src/hooks/useCareerGame.ts careerCeiling'),
    ('career-ladder', 1000, 1000, 'Round 646: engine ceiling, src/lib/careerLadder.ts CAREER_LADDER_CEILING'),
    ('cbb-dynasty', 1375, 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
    ('cbb-grid', null, 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
    ('cfb-dynasty', 790, 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
    ('cfb-higher-lower', 325, 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
    ('champ-or-not', 7, 10, 'Round 646: engine ceiling, src/lib/champOrNot.ts CHAMP_OR_NOT_CEILING'),
    ('club-manager', 130, 130, 'Round 646: engine ceiling, src/lib/clubManagerScore.ts ledgerCeiling'),
    ('clue-auction', null, 100, 'Round 646: engine ceiling, src/lib/clueAuction.ts CLUE_AUCTION_CEILING'),
    ('college-grid', 900, 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
    ('connections', 1000, 1000, 'Round 646: engine ceiling, src/lib/connectionsScore.ts CONNECTIONS_CEILING'),
    ('conquest-imperialism', 818, 943, 'Round 646: engine ceiling, src/lib/imperialismEngine.ts perfectScore(NFL_IMPERIALISM)'),
    ('conquest-mlb-imperialism', 799, 849, 'Round 646: engine ceiling, src/lib/imperialismEngine.ts perfectScore(MLB_IMPERIALISM)'),
    ('conquest-nba-imperialism', 774, 849, 'Round 646: engine ceiling, src/lib/imperialismEngine.ts perfectScore(NBA_IMPERIALISM)'),
    ('conquest-nhl-imperialism', 450, 899, 'Round 646: engine ceiling, src/lib/imperialismEngine.ts perfectScore(NHL_IMPERIALISM)'),
    ('conquest-soccer-imperialism', 1037, 1037, 'Round 646: engine ceiling, src/lib/imperialismEngine.ts perfectScore(SOCCER_IMPERIALISM)'),
    ('dart-draft', 813, 824, 'Round 646: engine ceiling, src/pages/DartDraft.tsx dartDraftCeiling'),
    ('emoji-guess', 500, 500, 'Round 646: engine ceiling, src/hooks/useEmojiGuess.ts EMOJI_GUESS_CEILING'),
    ('f1-constructor', 1000, 1000, 'Round 646: engine ceiling, src/types/f1Constructor.ts SCORE_CEILING'),
    ('f1-driver', 1000, 1000, 'Round 646: engine ceiling, src/types/f1Driver.ts SCORE_CEILING'),
    ('f1-higher-lower', 325, 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
    ('face-off', 470, 1900, 'Round 646: engine ceiling, src/lib/faceOff.ts faceOffCeiling'),
    ('fantasy-draft', 83, 100, 'Round 646: engine ceiling, src/pages/FantasyDraft.tsx FANTASY_DRAFT_CEILING'),
    ('fight-career', 100, 100, 'Round 646: engine ceiling, src/lib/fightCareer.ts FIGHT_CAREER_CEILING'),
    ('fight-gym', 100, 100, 'Round 646: engine ceiling, src/lib/fightGym.ts FIGHT_GYM_CEILING'),
    ('fight-promoter', 100, 100, 'Round 646: engine ceiling, src/lib/fightPromoter.ts FIGHT_PROMOTER_CEILING'),
    ('football-connect-4', null, 500, 'Round 646: engine ceiling, src/lib/connect4Score.ts CONNECT4_CEILING'),
    ('football-draft', 1500, 1500, 'Round 646: engine ceiling, src/hooks/useFootballDraft.ts footballDraftCeiling'),
    ('football-grid', 1000, 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
    ('football-timeline', 500, 500, 'Round 646: engine ceiling, src/hooks/useFootballTimeline.ts footballTimelineCeiling'),
    ('footle', 700, 700, 'Round 646: engine ceiling, src/hooks/useGame.ts footleCeiling'),
    ('free-kick', 3424, 3490, 'Round 646: engine ceiling, src/lib/freeKick.ts freeKickCeiling'),
    ('front-office', 1325, 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
    ('gauntlet-draft', 100, 100, 'Round 646: engine ceiling, src/lib/gauntletDraft.ts gauntletDraftCeiling'),
    ('golf-higher-lower', 155, 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
    ('grade-transfer', null, 500, 'Round 646: engine ceiling, src/hooks/useGradeTransfer.ts gradeTransferCeiling'),
    ('guess-cbb-team', 1000, 1000, 'Round 646: engine ceiling, src/types/cbbProgram.ts SCORE_CEILING'),
    ('guess-nascar-driver', 800, 1000, 'Round 646: engine ceiling, src/types/nascarDriver.ts SCORE_CEILING'),
    ('guess-nfl-team', 1200, 1200, 'Round 646: engine ceiling, src/types/guessNflTeam.ts SCORE_CEILING'),
    ('guess-soccer-club', 1200, 1200, 'Round 646: engine ceiling, src/types/guessSoccerClub.ts SCORE_CEILING'),
    ('guess-soccer-club-questions', 870, 1000, 'Round 646: engine ceiling, src/lib/clubQuestionTree.ts QUESTION_TREE_CEILING'),
    ('guess-tennis-player', 800, 1000, 'Round 646: engine ceiling, src/types/tennisPlayer.ts SCORE_CEILING'),
    ('guess-the-college', 1200, 1200, 'Round 646: engine ceiling, src/hooks/useGuessTheCollege.ts GUESS_THE_COLLEGE_CEILING'),
    ('guess-the-golfer', 500, 600, 'Round 646: engine ceiling, src/pages/GuessTheGolfer.tsx GUESS_THE_GOLFER_CEILING'),
    ('guess-the-nation', 1200, 1200, 'Round 646: engine ceiling, src/types/guessTheNation.ts SCORE_CEILING'),
    ('guess-the-year', 1000, 1000, 'Round 646: engine ceiling, src/types/guessTheYear.ts SCORE_CEILING'),
    ('guess-transfer-value', null, 900, 'Round 646: engine ceiling, src/hooks/useGuessTransferValue.ts GUESS_TRANSFER_VALUE_CEILING'),
    ('hockey-career', 1000, 1000, 'Round 646: engine ceiling, src/lib/careerClueScores.ts CAREER_CLUE_CEILING'),
    ('hockey-grid', 900, 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
    ('hockey-higher-lower', 325, 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
    ('hof-or-bust', 1000, 1000, 'Round 646: engine ceiling, src/hooks/useHofOrBust.ts HOF_OR_BUST_CEILING'),
    ('jeopardy', 15000, 15000, 'Round 646: engine ceiling, src/hooks/useQuizBoard.ts quizBoardCeiling'),
    ('minefield', 390, 440, 'Round 646: engine ceiling, src/lib/minefield.ts minefieldCeiling'),
    ('missing-eleven', 100, 100, 'Round 646: engine ceiling, src/lib/missingEleven.ts MISSING_ELEVEN_CEILING'),
    ('missing-five', 100, 100, 'Round 646: engine ceiling, src/lib/missingFive.ts MISSING_FIVE_CEILING'),
    ('missing-nine', 100, 100, 'Round 646: engine ceiling, src/lib/missingNine.ts MISSING_NINE_CEILING'),
    ('missing-xi', 100, 100, 'Round 646: engine ceiling, src/lib/missingXi.ts MISSING_XI_CEILING'),
    ('mlb-connect-4', null, 500, 'Round 646: engine ceiling, src/lib/connect4Score.ts CONNECT4_CEILING'),
    ('mlb-front-office', 885, 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
    ('mlb-gauntlet-draft', 100, 100, 'Round 646: engine ceiling, src/lib/gauntletEngine.ts gauntletCeiling(MLB_GAUNTLET_CONFIG)'),
    ('mlb-grid', 900, 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
    ('mlb-higher-lower', 230, 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
    ('mystery-box', 760, 960, 'Round 646: engine ceiling, src/hooks/useMysteryBox.ts mysteryBoxCeiling'),
    ('nba-career', 1000, 1000, 'Round 646: engine ceiling, src/lib/careerClueScores.ts CAREER_CLUE_CEILING'),
    ('nba-connect-4', null, 500, 'Round 646: engine ceiling, src/lib/connect4Score.ts CONNECT4_CEILING'),
    ('nba-connections', 1000, 1000, 'Round 646: engine ceiling, src/lib/connectionsScore.ts CONNECTIONS_CEILING'),
    ('nba-front-office', 3810, 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
    ('nba-gauntlet-draft', 100, 100, 'Round 646: engine ceiling, src/lib/gauntletEngine.ts gauntletCeiling(NBA_GAUNTLET_CONFIG)'),
    ('nba-grid', 900, 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
    ('nba-higher-lower', 325, 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
    ('nba-starting-5', 500, 500, 'Round 646: engine ceiling, src/hooks/useNbaLineup.ts NBA_STARTING_5_CEILING'),
    ('nba-stat-line', null, 100, 'Round 646: engine ceiling, src/lib/nbaStatLine.ts NBA_STAT_LINE_CEILING'),
    ('nfl-career', 6, 6, 'Round 646: engine ceiling, src/hooks/useNFLCareer.ts NFL_CAREER_CEILING'),
    ('nfl-connect-4', null, 500, 'Round 646: engine ceiling, src/lib/connect4Score.ts CONNECT4_CEILING'),
    ('nfl-connections', 1000, 1000, 'Round 646: engine ceiling, src/lib/connectionsScore.ts CONNECTIONS_CEILING'),
    ('nfl-gauntlet-draft', 100, 100, 'Round 646: engine ceiling, src/lib/gauntletEngine.ts gauntletCeiling(NFL_GAUNTLET_CONFIG)'),
    ('nfl-higher-lower', 325, 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
    ('nhl-connect-4', null, 500, 'Round 646: engine ceiling, src/lib/connect4Score.ts CONNECT4_CEILING'),
    ('nhl-connections', 1000, 1000, 'Round 646: engine ceiling, src/lib/connectionsScore.ts CONNECTIONS_CEILING'),
    ('nhl-front-office', 2125, 100, 'Round 646: the per season ceiling, src/lib/seasonLedger.ts seasonCeiling() (Round 647)'),
    ('olympics', 1000, 1000, 'Round 646: engine ceiling, src/lib/careerClueScores.ts CAREER_CLUE_CEILING'),
    ('perfect-lineup', 75, 100, 'Round 646: engine ceiling, src/hooks/usePerfectLineup.ts perfectLineupCeiling'),
    ('perfect-lineup-f1', 94, 100, 'Round 646: engine ceiling, src/lib/perfectLineupEngine.ts PERFECT_LINEUP_RATING_CEILING'),
    ('perfect-lineup-nba', 96, 100, 'Round 646: engine ceiling, src/lib/perfectLineupEngine.ts PERFECT_LINEUP_RATING_CEILING'),
    ('perfect-lineup-nhl', 93, 100, 'Round 646: engine ceiling, src/lib/perfectLineupEngine.ts PERFECT_LINEUP_RATING_CEILING'),
    ('perfect-season-mlb', 126, 162, 'Round 646: engine ceiling, src/lib/perfectSeasonMlb.ts PERFECT_SEASON_MLB_CEILING'),
    ('perfect-season-nba', 77, 82, 'Round 646: engine ceiling, src/lib/perfectSeasonNba.ts PERFECT_SEASON_NBA_CEILING'),
    ('perfect-season-nfl', 15, 17, 'Round 646: engine ceiling, src/lib/perfectSeasonNfl.ts PERFECT_SEASON_NFL_CEILING'),
    ('perfect-season-nhl', null, 82, 'Round 646: engine ceiling, src/lib/perfectSeasonNhl.ts PERFECT_SEASON_NHL_CEILING'),
    ('player-stock-market', 100, 100, 'Round 646: engine ceiling, src/lib/playerStockMarket.ts STOCK_MARKET_CEILING'),
    ('puck-detective', 50, 80, 'Round 646: engine ceiling, src/pages/PuckDetective.tsx puckDetectiveCeiling'),
    ('rank-em', 600, 1000, 'Round 646: engine ceiling, src/lib/orderTheList.ts rankEmCeiling'),
    ('rebuild', 940, 990, 'Round 646: engine ceiling, src/hooks/useRebuild.ts rebuildCeiling'),
    ('score-predictor', 1000, 1000, 'Round 646: engine ceiling, src/hooks/useScorePredictor.ts SCORE_PREDICTOR_CEILING'),
    ('search-and-discard', 82, 100, 'Round 646: engine ceiling, src/pages/SearchAndDiscard.tsx SEARCH_AND_DISCARD_CEILING'),
    ('shirt-number', 1000, 1000, 'Round 646: engine ceiling, src/hooks/useShirtNumber.ts SHIRT_NUMBER_CEILING'),
    ('sign-the-player', 56000000, 697, 'Round 646: engine ceiling, src/lib/auctionHouse.ts signThePlayerCeiling'),
    ('silverware-sort', 11, 15, 'Round 646: engine ceiling, src/lib/silverwareSort.ts SILVERWARE_SORT_CEILING'),
    ('soccer-grid', 950, 900, 'Round 646: engine ceiling, src/lib/gridScore.ts GRID_CEILING'),
    ('sports-bingo', 100, 100, 'Round 646: engine ceiling, src/lib/sportsBingo.ts sportsBingoCeiling'),
    ('sports-millionaire', 1000000, 1000000, 'Round 646: engine ceiling, src/lib/sportsMillionaire.ts SPORTS_MILLIONAIRE_CEILING'),
    ('squad-deal', 100, 100, 'Round 646: engine ceiling, src/lib/squadDeal.ts SQUAD_DEAL_CEILING'),
    ('teammates', 1000, 1000, 'Round 646: engine ceiling, src/hooks/useTeammates.ts TEAMMATES_CEILING'),
    ('tennis-higher-lower', 185, 325, 'Round 646: engine ceiling, src/lib/higherLowerScore.ts HIGHER_LOWER_DAILY_CEILING'),
    ('transfer-path', 1000, 1000, 'Round 646: engine ceiling, src/hooks/useTransferPath.ts TRANSFER_PATH_CEILING'),
    ('ufc', 700, 700, 'Round 646: engine ceiling, src/hooks/useUfcGame.ts ufcCeiling'),
    ('whod-they-beat', 6, 10, 'Round 646: engine ceiling, src/lib/whodTheyBeat.ts WHOD_THEY_BEAT_CEILING'),
    ('world-cup', 800, 1000, 'Round 646: engine ceiling, src/hooks/useWorldCup.ts WORLD_CUP_CEILING'),
    ('world-xi', 11, 11, 'Round 646: engine ceiling, src/pages/WorldXi.tsx worldXiCeiling');

  /* =================== preconditions, before any write =================== */

  /* 2. Not run before. */
  if to_regclass('public.game_score_cap_history') is not null then
    raise exception 'Round 646: public.game_score_cap_history already exists, so this file has run before (or something else made that table). Nothing was changed.';
  end if;
  if to_regclass('private.r646_caps_bak') is not null then
    raise exception 'Round 646: private.r646_caps_bak already exists, so this file has run before. Nothing was changed.';
  end if;

  /* 3. Every row still reads what this file was written against. */
  select string_agg(format('%s reads %s, written against %s', r.game,
                           coalesce(c.max_score::text, case when c.game is null then 'no row' else 'NULL' end),
                           coalesce(r.cap_read::text, 'NULL')), '; ' order by r.game)
    into v_bad
    from r646_rows r
    left join public.game_score_caps c on c.game = r.game
   where c.game is null or c.max_score is distinct from r.cap_read;
  if v_bad is not null then
    raise exception 'Round 646: game_score_caps moved after this file was written: %. Re-read the table, re-derive the rows and rewrite this file. Nothing was changed.', v_bad;
  end if;

  /* 4. The board is the Round 537 board, on a server that has the view
     option the periods need. */
  if current_setting('server_version_num')::integer < 150000 then
    raise exception 'Round 646: the periods view needs security_invoker, which Postgres 15 added. Nothing was changed.';
  end if;
  v_def := pg_get_functiondef('public.global_leaderboard(text,text[])'::regprocedure);
  if position('game_denominators' in v_def) = 0 or position('America/New_York' in v_def) = 0
     or position('game_cap_periods' in v_def) > 0 then
    raise exception 'Round 646: global_leaderboard is not the Round 537 definition this file replaces. Merge by hand. Nothing was changed.';
  end if;
  v_def := pg_get_functiondef('public.global_rank(text,text,text[])'::regprocedure);
  if position('game_denominators' in v_def) = 0 or position('player_ranks' in v_def) = 0
     or position('game_cap_periods' in v_def) > 0 then
    raise exception 'Round 646: global_rank is not the Round 537 definition this file replaces. Merge by hand. Nothing was changed.';
  end if;
  if (select c.relkind from pg_class c where c.oid = to_regclass('public.player_ranks')) is distinct from 'm' then
    raise exception 'Round 646: public.player_ranks is not the materialized view this file rebuilds. Nothing was changed.';
  end if;

  /* 1. Round 647 is recording, and no client from before it still is. */
  select count(*) filter (where gc.score > 100),
         count(*) filter (where gc.score between 1 and 100)
    into v_old_scale, v_ledger_scale
    from public.game_completions gc
   where gc.game = any(v_season)
     and gc.created_at >= v_switch - v_quiet;
  if v_ledger_scale = 0 then
    raise exception 'Round 646: no front office or dynasty row in the last % is on Round 647''s per season scale (1 to 100), which the old client never writes, so Round 647 is not recording yet. Publish Round 647 first. Nothing was changed.', v_quiet;
  end if;
  if v_old_scale > 0 then
    raise exception 'Round 646: % front office or dynasty rows in the last % are on the old cumulative scale (above 100), so a client from before Round 647 is still recording, and under a cap of 100 each would pay the full 100. Apply this once a whole % has passed without one. Nothing was changed.', v_old_scale, v_quiet, v_quiet;
  end if;

  /* =================== the change =================== */

  /* The backup, the whole table as it stands. */
  create table private.r646_caps_bak (
    game text primary key,
    max_score integer,
    note text,
    updated_at timestamptz,
    backed_up_at timestamptz not null default now()
  );
  revoke all on private.r646_caps_bak from public, anon, authenticated;
  insert into private.r646_caps_bak (game, max_score, note, updated_at)
  select c.game, c.max_score, c.note, c.updated_at from public.game_score_caps c;

  /* The denominator every game was scored against until now, NULL fallbacks
     included, read once so the history and check A see the same numbers. */
  create temp table r646_pre_denoms on commit drop as
    select d.game, d.max_score from public.game_denominators d;

  /* The cap history. Public read like game_score_caps, and no write for the
     API roles: RLS with a select policy only, and the grants revoked too. */
  create table public.game_score_cap_history (
    game text not null,
    max_score numeric not null check (max_score >= 1),
    valid_until timestamptz not null,
    note text not null,
    recorded_at timestamptz not null default now(),
    primary key (game, valid_until)
  );
  comment on table public.game_score_cap_history is
    'Round 646. A game''s leaderboard denominator before a cap change: this max_score applied to every row played before valid_until (and after the previous row''s valid_until). The board reads it through public.game_cap_periods, so a cap change does not rescale past days. Public read, no public write.';
  alter table public.game_score_cap_history enable row level security;
  create policy "cap history is public read"
    on public.game_score_cap_history for select
    to anon, authenticated
    using (true);
  revoke insert, update, delete, truncate on public.game_score_cap_history from anon, authenticated;
  grant select on public.game_score_cap_history to anon, authenticated;

  insert into public.game_score_cap_history (game, max_score, valid_until, note)
  select r.game, d.max_score, v_switch,
         format('Round 646: the cap in force until the Round 646 caps, which moved it to %s', r.cap_after)
    from r646_rows r
    join r646_pre_denoms d on d.game = r.game
   where d.max_score is distinct from r.cap_after::numeric;
  get diagnostics v_history = row_count;

  /* The periods the board scores against: every history row from the one
     before it, then today's denominator from the last history row on. Only
     for games still on the allowlist. */
  create view public.game_cap_periods with (security_invoker = true) as
    select h.game,
           coalesce(lag(h.valid_until) over (partition by h.game order by h.valid_until),
                    '-infinity'::timestamptz) as valid_from,
           h.valid_until,
           h.max_score
      from public.game_score_cap_history h
     where exists (select 1 from public.game_score_caps c where c.game = h.game)
    union all
    select d.game,
           coalesce((select max(h.valid_until) from public.game_score_cap_history h where h.game = d.game),
                    '-infinity'::timestamptz) as valid_from,
           'infinity'::timestamptz as valid_until,
           d.max_score
      from public.game_denominators d;
  comment on view public.game_cap_periods is
    'Round 646. Each game''s leaderboard denominator as periods [valid_from, valid_until): its history (game_score_cap_history) and then today''s game_denominators. The board scores a row against the period its created_at falls in.';
  grant select on public.game_cap_periods to anon, authenticated;

  /* The caps. */
  insert into public.game_score_caps (game, max_score, note)
  select r.game, r.cap_after, r.note from r646_rows r
  on conflict (game) do update
    set max_score = excluded.max_score,
        note = excluded.note,
        updated_at = now();
  get diagnostics v_written = row_count;
  if v_written <> (select count(*) from r646_rows) then
    raise exception 'Round 646: wrote % caps, expected %. Nothing was changed.', v_written, (select count(*) from r646_rows);
  end if;

  /* The board, reading the cap in force when each row was played. Exactly
     the Round 537 functions otherwise: the Eastern day, the same filters, the
     same ordering and limit. */
  create or replace function public.global_leaderboard(p_period text default 'alltime'::text, p_games text[] default null::text[])
   returns table(rank bigint, player_name text, total_points numeric, games_played bigint)
   language sql
   stable
   set search_path to 'public'
  as $function$
    with bounds as (
      select (now() at time zone 'America/New_York')::date as et_today
    ),
    best as (
      /* Round 646: each row against the cap in force when it was played
         (game_cap_periods), and the day's best of those. */
      select gc.player_name, gc.game,
             (gc.created_at at time zone 'America/New_York')::date as et_day,
             max(100.0 * least(gc.score, p.max_score)::numeric / p.max_score) as day_pts
      from public.game_completions gc
      join public.game_cap_periods p
        on p.game = gc.game and gc.created_at >= p.valid_from and gc.created_at < p.valid_until
      cross join bounds b
      where gc.score is not null and gc.score > 0 and gc.player_name is not null
        and (p_games is null or gc.game = any(p_games))
        and (gc.created_at at time zone 'America/New_York')::date <= b.et_today
        and (
          p_period not in ('today', 'week', 'month')
          or (p_period = 'today' and (gc.created_at at time zone 'America/New_York')::date = b.et_today)
          or (p_period = 'week'  and (gc.created_at at time zone 'America/New_York')::date > b.et_today - 7)
          or (p_period = 'month' and (gc.created_at at time zone 'America/New_York')::date > b.et_today - 30)
        )
      group by gc.player_name, gc.game, (gc.created_at at time zone 'America/New_York')::date
    ),
    totals as (
      select b.player_name, sum(b.day_pts) as pts, count(*) as plays
      from best b group by b.player_name
    )
    select row_number() over (order by t.pts desc, t.player_name asc) as rank,
           t.player_name, round(t.pts)::numeric as total_points, t.plays as games_played
    from totals t
    order by t.pts desc, t.player_name asc
    limit 100;
  $function$;

  create or replace function public.global_rank(p_player text, p_period text default 'alltime'::text, p_games text[] default null::text[])
   returns table(rank bigint, total_points numeric, total_players bigint)
   language sql
   stable
   set search_path to 'public'
  as $function$
    select r.rank::bigint, r.total_points, r.total_players::bigint
    from public.player_ranks r
    where p_games is null
      and p_period in ('today', 'alltime')
      and r.period = p_period
      and r.player_name = p_player

    union all

    select ranked.rn, round(ranked.pts)::numeric, ranked.cnt
    from (
      select t.player_name, t.pts,
             row_number() over (order by t.pts desc, t.player_name asc) as rn,
             count(*) over () as cnt
      from (
        select b.player_name, sum(b.day_pts) as pts
        from (
          /* Round 646: each row against the cap in force when it was played. */
          select gc.player_name, gc.game,
                 (gc.created_at at time zone 'America/New_York')::date as et_day,
                 max(100.0 * least(gc.score, p.max_score)::numeric / p.max_score) as day_pts
          from public.game_completions gc
          join public.game_cap_periods p
            on p.game = gc.game and gc.created_at >= p.valid_from and gc.created_at < p.valid_until
          where (p_games is not null or p_period in ('week', 'month'))
            and gc.score is not null and gc.score > 0 and gc.player_name is not null
            and (p_games is null or gc.game = any(p_games))
            and (gc.created_at at time zone 'America/New_York')::date <= (now() at time zone 'America/New_York')::date
            and (
              p_period not in ('today', 'week', 'month')
              or (p_period = 'today' and (gc.created_at at time zone 'America/New_York')::date = (now() at time zone 'America/New_York')::date)
              or (p_period = 'week'  and (gc.created_at at time zone 'America/New_York')::date > (now() at time zone 'America/New_York')::date - 7)
              or (p_period = 'month' and (gc.created_at at time zone 'America/New_York')::date > (now() at time zone 'America/New_York')::date - 30)
            )
          group by gc.player_name, gc.game, (gc.created_at at time zone 'America/New_York')::date
        ) b
        group by b.player_name
      ) t
    ) ranked
    where ranked.player_name = p_player;
  $function$;

  /* The cache, rebuilt on the periods and swapped in exactly as Round 537
     swapped it: same unique index name (the cron job refreshes it
     CONCURRENTLY), same grants. */
  create materialized view public.player_ranks_next as
    with scored as (
      select gc.player_name,
             gc.game,
             (gc.created_at at time zone 'America/New_York')::date as et_day,
             max(100.0 * least(gc.score::numeric, p.max_score) / p.max_score) as day_pts
      from public.game_completions gc
      join public.game_cap_periods p
        on p.game = gc.game and gc.created_at >= p.valid_from and gc.created_at < p.valid_until
      where gc.score is not null and gc.score > 0 and gc.player_name is not null
        and (gc.created_at at time zone 'America/New_York')::date <= (now() at time zone 'America/New_York')::date
      group by gc.player_name, gc.game, (gc.created_at at time zone 'America/New_York')::date
    ),
    totals as (
      select 'alltime'::text as period, scored.player_name,
             sum(scored.day_pts) as pts,
             count(*) as plays
      from scored group by scored.player_name
      union all
      select 'today'::text as period, scored.player_name,
             sum(scored.day_pts) as pts,
             count(*) as plays
      from scored
      where scored.et_day = (now() at time zone 'America/New_York')::date
      group by scored.player_name
    )
    select period, player_name, round(pts) as total_points, plays as games_played,
           row_number() over (partition by period order by pts desc, player_name) as rank,
           count(*) over (partition by period) as total_players
    from totals;

  create unique index player_ranks_next_pkey on public.player_ranks_next using btree (period, player_name);
  grant all on public.player_ranks_next to anon, authenticated, service_role;

  drop materialized view public.player_ranks;
  alter materialized view public.player_ranks_next rename to player_ranks;
  alter index public.player_ranks_next_pkey rename to player_ranks_pkey;

  /* =================== checks on the result, before the block ends =================== */

  /* A. Every row played before v_switch in a game this file writes is worth
     exactly what it was: each (game, player, Eastern day) scored the Round
     537 way against the denominators read before anything moved, and the
     new way through the periods, must agree to the last decimal. */
  with old_days as (
    select gc.game, gc.player_name, (gc.created_at at time zone 'America/New_York')::date as et_day,
           max(100.0 * least(gc.score, o.max_score)::numeric / o.max_score) as pts
      from public.game_completions gc
      join r646_pre_denoms o on o.game = gc.game
     where gc.game in (select r.game from r646_rows r)
       and gc.score is not null and gc.score > 0 and gc.player_name is not null
       and gc.created_at < v_switch
     group by 1, 2, 3
  ),
  new_days as (
    select gc.game, gc.player_name, (gc.created_at at time zone 'America/New_York')::date as et_day,
           max(100.0 * least(gc.score, p.max_score)::numeric / p.max_score) as pts
      from public.game_completions gc
      join public.game_cap_periods p
        on p.game = gc.game and gc.created_at >= p.valid_from and gc.created_at < p.valid_until
     where gc.game in (select r.game from r646_rows r)
       and gc.score is not null and gc.score > 0 and gc.player_name is not null
       and gc.created_at < v_switch
     group by 1, 2, 3
  )
  select count(*), string_agg(distinct game, ', ')
    into v_n, v_bad
    from old_days o
    full join new_days n using (game, player_name, et_day)
   where o.pts is distinct from n.pts;
  if v_n > 0 then
    raise exception 'Round 646: % player days played before the change would be worth something else after it (in %). Nothing was changed.', v_n, v_bad;
  end if;
  select count(*) into v_days
    from (select 1 from public.game_completions gc
           where gc.game in (select r.game from r646_rows r)
             and gc.score is not null and gc.score > 0 and gc.player_name is not null
             and gc.created_at < v_switch
           group by gc.game, gc.player_name, (gc.created_at at time zone 'America/New_York')::date) s;

  /* B. Every game has exactly one open period, and for every game this file
     writes it is the new cap. */
  select string_agg(p.game, ', ') into v_bad
    from (select game from public.game_cap_periods where valid_until = 'infinity'::timestamptz
           group by game having count(*) <> 1) p;
  if v_bad is not null then
    raise exception 'Round 646: more than one open cap period for %. Nothing was changed.', v_bad;
  end if;
  select string_agg(r.game, ', ' order by r.game) into v_bad
    from r646_rows r
    left join public.game_cap_periods p on p.game = r.game and p.valid_until = 'infinity'::timestamptz
   where p.max_score is distinct from r.cap_after::numeric;
  if v_bad is not null then
    raise exception 'Round 646: the open cap period is not the new cap for %. Nothing was changed.', v_bad;
  end if;

  /* C. A history row for exactly the games whose denominator moved. */
  select count(*) into v_n
    from r646_rows r join r646_pre_denoms d on d.game = r.game
   where d.max_score is distinct from r.cap_after::numeric;
  if v_history <> v_n or (select count(*) from public.game_score_cap_history) <> v_n then
    raise exception 'Round 646: % history rows written for % moved denominators. Nothing was changed.', v_history, v_n;
  end if;

  /* D. The board still answers, all time and today. */
  perform 1 from public.global_leaderboard('alltime'::text, null::text[]) limit 1;
  perform 1 from public.global_leaderboard('today'::text, null::text[]) limit 1;

  raise notice 'Round 646: % caps written, % moved with a history row valid until %; % player days before the change checked, all unchanged.',
    v_written, v_history, v_switch, v_days;
end
$r646$;
