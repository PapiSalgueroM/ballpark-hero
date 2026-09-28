/**
 * Round 646: public.game_score_caps, every row, as the table stands once this
 * round's migration and Round 644's are applied, beside what it held when it
 * was read. scripts/simCapsAreCeilings.mjs holds every scored game's row here
 * to the ceiling its engine exports, and holds the migration to the same
 * numbers, so the table the leaderboard ranks against cannot drift from the
 * rules again without a red.
 *
 * WHERE IT CAME FROM. Read through the public REST read of game_score_caps and
 * game_denominators on READ_ON (the table is public read, no write). The cap
 * column is the value after:
 *   supabase/migrations/20260928_round_646_caps_at_real_ceilings.sql (this
 *     round: every scored game except the three below, and the six season
 *     games at Round 647's per season ceiling), and
 *   supabase/migrations/20260919_round_644_scores_shown.sql (soccer-career,
 *     player-bingo and rarity-round).
 * Every other row (the games with no ceiling, the games that record no score,
 * the retired keys) is the value read, untouched.
 *
 * WHEN IT GOES STALE. Changing a cap means a migration and a matching edit
 * here, in the same change; simCapsAreCeilings section 6 reads the live table
 * and fails on a row that is neither the value read nor the value after, and
 * on a table where some moved rows sit at one and some at the other (the
 * migration is one statement, so half of it applied means something else
 * moved the table).
 *
 * PAST DAYS. The migration does not rewrite what a past day is worth: it
 * writes the cap each moved game had before into
 * public.game_score_cap_history, valid until the moment it applies, and the
 * board reads the cap in force when each row was played. The denominator
 * column below is what that history row holds for a game whose cap was read
 * as a number; a NULL cap's fallback is frozen at whatever the view gives on
 * the day the migration applies.
 *
 * Each row: [game, cap after the migrations, cap read on READ_ON, the
 * game_denominators value read on READ_ON (what a NULL cap fell back to)].
 */
export const READ_ON = '2026-09-28';

export const CAPS = [
  ['afl-higher-lower', 325, 270, 270],
  ['alphabet-sprint', 4, 4, 4],
  ['ball-iq', 1600, 1600, 1600],
  ['baseball-career', 1000, 1000, 1000],
  ['baseball-connections', 1000, 500, 500],
  ['blind-rank', 60, 60, 60],
  ['budget-builder', 126, 1120, 1120],
  ['build-your-xi', 500, 500, 500],
  ['buzzer-beater', 3045, 3012, 3012],
  ['career', 700, 700, 700],
  ['career-ladder', 1000, 1000, 1000],
  ['career-path', 700, 700, 700],
  ['cbb-dynasty', 100, 1375, 1375],
  ['cbb-grid', 900, null, 900],
  ['cbb-program', 1000, 1000, 1000],
  ['cfb-dynasty', 100, 790, 790],
  ['cfb-higher-lower', 325, 325, 325],
  ['champ-or-not', 10, 7, 7],
  ['club-manager', 130, 130, 130],
  ['clue-auction', 100, null, 60],
  ['college-grid', 900, 900, 900],
  ['connections', 1000, 1000, 1000],
  ['conquest-imperialism', 943, 818, 818],
  ['conquest-mlb-imperialism', 849, 799, 799],
  ['conquest-nba-imperialism', 849, 774, 774],
  ['conquest-nhl-imperialism', 899, 450, 450],
  ['conquest-soccer-imperialism', 1037, 1037, 1037],
  ['dart-draft', 824, 813, 813],
  ['darts', 334, 334, 334],
  ['darts-501', 50, 50, 50],
  ['emoji-guess', 500, 500, 500],
  ['f1-constructor', 1000, 1000, 1000],
  ['f1-driver', 1000, 1000, 1000],
  ['f1-higher-lower', 325, 325, 325],
  ['face-off', 1900, 470, 470],
  ['fantasy-draft', 100, 83, 83],
  ['fight-career', 100, 100, 100],
  ['fight-gym', 100, 100, 100],
  ['fight-promoter', 100, 100, 100],
  ['football-connect-4', 500, null, 1],
  ['football-draft', 1500, 1500, 1500],
  ['football-grid', 900, 1000, 1000],
  ['football-timeline', 500, 500, 500],
  ['footle', 700, 700, 700],
  ['free-kick', 3490, 3424, 3424],
  ['front-office', 100, 1325, 1325],
  ['gauntlet-draft', 100, 100, 100],
  ['golf-higher-lower', 325, 155, 155],
  ['grade-transfer', 500, null, 1],
  ['guess-cbb-team', 1000, 1000, 1000],
  ['guess-nascar-driver', 1000, 800, 800],
  ['guess-nfl-team', 1200, 1200, 1200],
  ['guess-soccer-club', 1200, 1200, 1200],
  ['guess-soccer-club-questions', 1000, 870, 870],
  ['guess-tennis-player', 1000, 800, 800],
  ['guess-the-college', 1200, 1200, 1200],
  ['guess-the-golfer', 600, 500, 500],
  ['guess-the-nation', 1200, 1200, 1200],
  ['guess-the-year', 1000, 1000, 1000],
  ['guess-transfer-value', 900, null, 1],
  ['hall-of-champions', null, null, 1],
  ['higher-lower', 7000, 7000, 7000],
  ['higher-lower-transfers', null, null, 2],
  ['hockey-career', 1000, 1000, 1000],
  ['hockey-grid', 900, 900, 900],
  ['hockey-higher-lower', 325, 325, 325],
  ['hof-or-bust', 1000, 1000, 1000],
  ['idle-arena', null, null, 1],
  ['jeopardy', 15000, 15000, 15000],
  ['lineup-builder', 500, 500, 500],
  ['list-quiz', null, null, 28],
  ['minefield', 440, 390, 390],
  ['missing-eleven', 100, 100, 100],
  ['missing-five', 100, 100, 100],
  ['missing-nine', 100, 100, 100],
  ['missing-xi', 100, 100, 100],
  ['mlb-connect-4', 500, null, 1],
  ['mlb-front-office', 100, 885, 885],
  ['mlb-gauntlet-draft', 100, 100, 100],
  ['mlb-grid', 900, 900, 900],
  ['mlb-higher-lower', 325, 230, 230],
  ['mlb-my-career', 2192, 2192, 2192],
  ['mystery-box', 960, 760, 760],
  ['nascar-chain', 2000, 2000, 2000],
  ['nba-career', 1000, 1000, 1000],
  ['nba-chain', 1500, 1500, 1500],
  ['nba-connect-4', 500, null, 1],
  ['nba-connections', 1000, 1000, 1000],
  ['nba-front-office', 100, 3810, 3810],
  ['nba-gauntlet-draft', 100, 100, 100],
  ['nba-grid', 900, 900, 900],
  ['nba-higher-lower', 325, 325, 325],
  ['nba-lineup', 500, 500, 500],
  ['nba-my-career', 2893, 2893, 2893],
  ['nba-starting-5', 500, 500, 500],
  ['nba-stat-line', 100, null, 96],
  ['nfl-career', 6, 6, 6],
  ['nfl-connect-4', 500, null, 1],
  ['nfl-connections', 1000, 1000, 1000],
  ['nfl-gauntlet-draft', 100, 100, 100],
  ['nfl-higher-lower', 325, 325, 325],
  ['nfl-my-career', 3651, 3651, 3651],
  ['nhl-connect-4', 500, null, 1],
  ['nhl-connections', 1000, 1000, 1000],
  ['nhl-front-office', 100, 2125, 2125],
  ['nhl-my-career', 1462, 1462, 1462],
  ['olympics', 1000, 1000, 1000],
  ['overrated-underrated', 800, 800, 800],
  ['pack-battle', 54000000, 54000000, 54000000],
  ['perfect-lineup', 100, 75, 75],
  ['perfect-lineup-f1', 100, 94, 94],
  ['perfect-lineup-nba', 100, 96, 96],
  ['perfect-lineup-nhl', 100, 93, 93],
  ['perfect-season-mlb', 162, 126, 126],
  ['perfect-season-nba', 82, 77, 77],
  ['perfect-season-nfl', 17, 15, 15],
  ['perfect-season-nhl', 82, null, 82],
  ['player-bingo', 1700, null, 1700],
  ['player-stock-market', 100, 100, 100],
  ['puck-detective', 80, 50, 50],
  ['rank-em', 1000, 600, 600],
  ['rarity-round', 500, 500, 500],
  ['rebuild', 990, 940, 940],
  ['score-predictor', 1000, 1000, 1000],
  ['search-and-discard', 100, 82, 82],
  ['shirt-number', 1000, 1000, 1000],
  ['sign-the-player', 697, 56000000, 56000000],
  ['silverware-sort', 15, 11, 11],
  ['soccer-career', 100, 1000, 1000],
  ['soccer-grid', 900, 950, 950],
  ['sports-bingo', 100, 100, 100],
  ['sports-millionaire', 1000000, 1000000, 1000000],
  ['squad-deal', 100, 100, 100],
  ['stadium-draft', 350, 350, 350],
  ['stadium-tycoon', null, null, 1],
  ['stat-detective', null, null, 1],
  ['teammates', 1000, 1000, 1000],
  ['tennis-chain', 400, 400, 400],
  ['tennis-higher-lower', 325, 185, 185],
  ['tennis-player', 800, 800, 800],
  ['tier-list', 800, 800, 800],
  ['transfer-path', 1000, 1000, 1000],
  ['ufc', 700, 700, 700],
  ['ufc-chain', 450, 450, 450],
  ['ufc-game', 600, 600, 600],
  ['who-am-i', null, null, 1],
  ['whod-they-beat', 10, 6, 6],
  ['wonderkid-factory', null, null, 1],
  ['world-cup', 1000, 800, 800],
  ['world-cup-bracket', null, null, 1],
  ['world-xi', 11, 11, 11],
];
