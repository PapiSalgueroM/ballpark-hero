/**
 * Round 646: every completion key the source can send, classified once, and
 * for every scored game the engine export that says the most it can record.
 * scripts/simCapsAreCeilings.mjs reads this and holds game_score_caps to it.
 *
 * FOUR CLASSES, and a key is in exactly one.
 *
 *   CEILINGS   the game's rules set a most it can record, and the engine
 *              exports it: [file, export] or [file, export, [argFile, argExport]]
 *              when the export is a function of a sport's own data (conquest,
 *              the three sport gauntlets). An export may be a number or a
 *              function of no arguments.
 *   SEASON     the four front offices and the two dynasties. Round 647 scores
 *              them one season at a time and exports seasonCeiling() from
 *              src/lib/seasonLedger.ts for all six. On a tree without that
 *              module they still record titles * 100 + seasonsPlayed * 5 on
 *              every title, which has no ceiling, so the fence reports them as
 *              waiting on Round 647 rather than checking a number that is not
 *              there.
 *   UNSCORED   the source records a play with no score, so the leaderboard
 *              never reads a row of theirs and their cap stays NULL.
 *   NO_CEILING the rules set no most, so there is no real ceiling to set the
 *              cap to. Each carries the reason. Their caps are left exactly as
 *              they were, and each is a scoring change owed to its own round
 *              (the Soccer Career rescale in Round 644 is the shape).
 *
 * The keys the source cannot send any more are the retirements declared in
 * src/data/completionSlugs.ts; their caps are kept as history and are not
 * classified here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HL = ['src/lib/higherLowerScore.ts', 'HIGHER_LOWER_DAILY_CEILING'];
const CLUE = ['src/lib/careerClueScores.ts', 'CAREER_CLUE_CEILING'];
const CONNECTIONS = ['src/lib/connectionsScore.ts', 'CONNECTIONS_CEILING'];
const GRID = ['src/lib/gridScore.ts', 'GRID_CEILING'];
const CONNECT4 = ['src/lib/connect4Score.ts', 'CONNECT4_CEILING'];
const FIGHT = f => [`src/lib/${f}.ts`, `${f.replace(/([A-Z])/g, '_$1').toUpperCase()}_CEILING`];
const LADDER = t => [`src/types/${t}.ts`, 'SCORE_CEILING'];
const LINEUP = ['src/lib/perfectLineupEngine.ts', 'PERFECT_LINEUP_RATING_CEILING'];
const CONQUEST = (file, sport) => ['src/lib/imperialismEngine.ts', 'perfectScore', [file, sport]];
const GAUNTLET = (file, cfg) => ['src/lib/gauntletEngine.ts', 'gauntletCeiling', [file, cfg]];

export const CEILINGS = {
  'afl-higher-lower': HL, 'cfb-higher-lower': HL, 'f1-higher-lower': HL,
  'golf-higher-lower': HL, 'hockey-higher-lower': HL, 'mlb-higher-lower': HL,
  'nba-higher-lower': HL, 'nfl-higher-lower': HL, 'tennis-higher-lower': HL,
  'baseball-career': CLUE, 'hockey-career': CLUE, 'nba-career': CLUE, 'olympics': CLUE,
  'connections': CONNECTIONS, 'baseball-connections': CONNECTIONS, 'nba-connections': CONNECTIONS,
  'nfl-connections': CONNECTIONS, 'nhl-connections': CONNECTIONS,
  'soccer-grid': GRID, 'football-grid': GRID, 'college-grid': GRID, 'nba-grid': GRID,
  'mlb-grid': GRID, 'hockey-grid': GRID, 'cbb-grid': GRID,
  'football-connect-4': CONNECT4, 'mlb-connect-4': CONNECT4, 'nba-connect-4': CONNECT4,
  'nfl-connect-4': CONNECT4, 'nhl-connect-4': CONNECT4,
  'fight-career': FIGHT('fightCareer'), 'fight-gym': FIGHT('fightGym'), 'fight-promoter': FIGHT('fightPromoter'),
  'f1-constructor': LADDER('f1Constructor'), 'f1-driver': LADDER('f1Driver'),
  'guess-cbb-team': LADDER('cbbProgram'), 'guess-nascar-driver': LADDER('nascarDriver'),
  'guess-tennis-player': LADDER('tennisPlayer'), 'guess-nfl-team': LADDER('guessNflTeam'),
  'guess-the-nation': LADDER('guessTheNation'), 'guess-soccer-club': LADDER('guessSoccerClub'),
  'guess-the-year': LADDER('guessTheYear'),
  'perfect-lineup-f1': LINEUP, 'perfect-lineup-nba': LINEUP, 'perfect-lineup-nhl': LINEUP,
  'conquest-imperialism': CONQUEST('src/data/conquestSports.ts', 'NFL_IMPERIALISM'),
  'conquest-nba-imperialism': CONQUEST('src/data/conquestSports.ts', 'NBA_IMPERIALISM'),
  'conquest-mlb-imperialism': CONQUEST('src/data/conquestSports.ts', 'MLB_IMPERIALISM'),
  'conquest-nhl-imperialism': CONQUEST('src/data/conquestSports.ts', 'NHL_IMPERIALISM'),
  'conquest-soccer-imperialism': CONQUEST('src/data/soccerConquest.ts', 'SOCCER_IMPERIALISM'),
  'gauntlet-draft': ['src/lib/gauntletDraft.ts', 'gauntletDraftCeiling'],
  'nba-gauntlet-draft': GAUNTLET('src/lib/gauntletDraftNba.ts', 'NBA_GAUNTLET_CONFIG'),
  'nfl-gauntlet-draft': GAUNTLET('src/lib/gauntletDraftNfl.ts', 'NFL_GAUNTLET_CONFIG'),
  'mlb-gauntlet-draft': GAUNTLET('src/lib/gauntletDraftMlb.ts', 'MLB_GAUNTLET_CONFIG'),
  'perfect-season-mlb': ['src/lib/perfectSeasonMlb.ts', 'PERFECT_SEASON_MLB_CEILING'],
  'perfect-season-nba': ['src/lib/perfectSeasonNba.ts', 'PERFECT_SEASON_NBA_CEILING'],
  'perfect-season-nfl': ['src/lib/perfectSeasonNfl.ts', 'PERFECT_SEASON_NFL_CEILING'],
  'perfect-season-nhl': ['src/lib/perfectSeasonNhl.ts', 'PERFECT_SEASON_NHL_CEILING'],
  'missing-eleven': ['src/lib/missingEleven.ts', 'MISSING_ELEVEN_CEILING'],
  'missing-five': ['src/lib/missingFive.ts', 'MISSING_FIVE_CEILING'],
  'missing-nine': ['src/lib/missingNine.ts', 'MISSING_NINE_CEILING'],
  'missing-xi': ['src/lib/missingXi.ts', 'MISSING_XI_CEILING'],
  'ball-iq': ['src/hooks/useBallIq.ts', 'BALL_IQ_CEILING'],
  'budget-builder': ['src/hooks/useBudgetBuilder.ts', 'budgetBuilderCeiling'],
  'build-your-xi': ['src/hooks/useLineupBuilder.ts', 'BUILD_YOUR_XI_CEILING'],
  'nba-starting-5': ['src/hooks/useNbaLineup.ts', 'NBA_STARTING_5_CEILING'],
  'buzzer-beater': ['src/lib/buzzerBeater.ts', 'buzzerBeaterCeiling'],
  'free-kick': ['src/lib/freeKick.ts', 'freeKickCeiling'],
  'career': ['src/hooks/useCareerGame.ts', 'CAREER_CEILING'],
  'career-ladder': ['src/lib/careerLadder.ts', 'CAREER_LADDER_CEILING'],
  'champ-or-not': ['src/lib/champOrNot.ts', 'CHAMP_OR_NOT_CEILING'],
  'whod-they-beat': ['src/lib/whodTheyBeat.ts', 'WHOD_THEY_BEAT_CEILING'],
  'club-manager': ['src/lib/clubManagerScore.ts', 'ledgerCeiling'],
  'clue-auction': ['src/lib/clueAuction.ts', 'CLUE_AUCTION_CEILING'],
  'dart-draft': ['src/pages/DartDraft.tsx', 'dartDraftCeiling'],
  'emoji-guess': ['src/hooks/useEmojiGuess.ts', 'EMOJI_GUESS_CEILING'],
  'face-off': ['src/lib/faceOff.ts', 'faceOffCeiling'],
  'fantasy-draft': ['src/pages/FantasyDraft.tsx', 'FANTASY_DRAFT_CEILING'],
  'search-and-discard': ['src/pages/SearchAndDiscard.tsx', 'SEARCH_AND_DISCARD_CEILING'],
  'football-draft': ['src/hooks/useFootballDraft.ts', 'footballDraftCeiling'],
  'football-timeline': ['src/hooks/useFootballTimeline.ts', 'footballTimelineCeiling'],
  'footle': ['src/hooks/useGame.ts', 'FOOTLE_CEILING'],
  'guess-soccer-club-questions': ['src/lib/clubQuestionTree.ts', 'QUESTION_TREE_CEILING'],
  'guess-the-college': ['src/hooks/useGuessTheCollege.ts', 'GUESS_THE_COLLEGE_CEILING'],
  'guess-the-golfer': ['src/pages/GuessTheGolfer.tsx', 'GUESS_THE_GOLFER_CEILING'],
  'guess-transfer-value': ['src/hooks/useGuessTransferValue.ts', 'GUESS_TRANSFER_VALUE_CEILING'],
  'grade-transfer': ['src/hooks/useGradeTransfer.ts', 'gradeTransferCeiling'],
  'hof-or-bust': ['src/hooks/useHofOrBust.ts', 'HOF_OR_BUST_CEILING'],
  'jeopardy': ['src/hooks/useQuizBoard.ts', 'quizBoardCeiling'],
  'minefield': ['src/lib/minefield.ts', 'minefieldCeiling'],
  'mystery-box': ['src/hooks/useMysteryBox.ts', 'mysteryBoxCeiling'],
  'nba-stat-line': ['src/lib/nbaStatLine.ts', 'NBA_STAT_LINE_CEILING'],
  'nfl-career': ['src/hooks/useNFLCareer.ts', 'NFL_CAREER_CEILING'],
  'perfect-lineup': ['src/hooks/usePerfectLineup.ts', 'perfectLineupCeiling'],
  'player-bingo': ['src/pages/PlayerBingo.tsx', 'playerBingoCeiling'],
  'player-stock-market': ['src/lib/playerStockMarket.ts', 'STOCK_MARKET_CEILING'],
  'puck-detective': ['src/pages/PuckDetective.tsx', 'puckDetectiveCeiling'],
  'rank-em': ['src/lib/orderTheList.ts', 'rankEmCeiling'],
  'rarity-round': ['src/lib/rarityRound.ts', 'RARITY_ROUND_CEILING'],
  'rebuild': ['src/hooks/useRebuild.ts', 'rebuildCeiling'],
  'score-predictor': ['src/hooks/useScorePredictor.ts', 'SCORE_PREDICTOR_CEILING'],
  'shirt-number': ['src/hooks/useShirtNumber.ts', 'SHIRT_NUMBER_CEILING'],
  'sign-the-player': ['src/lib/auctionHouse.ts', 'signThePlayerCeiling'],
  'silverware-sort': ['src/lib/silverwareSort.ts', 'SILVERWARE_SORT_CEILING'],
  'soccer-career': ['src/lib/soccerCareerEngine.ts', 'SOCCER_CAREER_CEILING'],
  'sports-bingo': ['src/lib/sportsBingo.ts', 'sportsBingoCeiling'],
  'sports-millionaire': ['src/lib/sportsMillionaire.ts', 'SPORTS_MILLIONAIRE_CEILING'],
  'squad-deal': ['src/lib/squadDeal.ts', 'SQUAD_DEAL_CEILING'],
  'teammates': ['src/hooks/useTeammates.ts', 'TEAMMATES_CEILING'],
  'transfer-path': ['src/hooks/useTransferPath.ts', 'TRANSFER_PATH_CEILING'],
  'ufc': ['src/hooks/useUfcGame.ts', 'UFC_CEILING'],
  'world-cup': ['src/hooks/useWorldCup.ts', 'WORLD_CUP_CEILING'],
  'world-xi': ['src/pages/WorldXi.tsx', 'worldXiCeiling'],
};

/** Round 647's module and export, and the board file that records each game. */
export const SEASON_LEDGER = ['src/lib/seasonLedger.ts', 'seasonCeiling'];
export const SEASON_GAMES = {
  'front-office': 'src/components/front-office/FrontOfficeBoard.tsx',
  'mlb-front-office': 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx',
  'nba-front-office': 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx',
  'nhl-front-office': 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx',
  'cbb-dynasty': 'src/components/cbb-dynasty/CbbDynastyBoard.tsx',
  'cfb-dynasty': 'src/components/cfb-dynasty/CfbDynastyBoard.tsx',
};

export const UNSCORED = [
  'hall-of-champions', 'idle-arena', 'stadium-tycoon', 'stat-detective',
  'who-am-i', 'world-cup-bracket', 'wonderkid-factory',
];

export const NO_CEILING = {
  'alphabet-sprint': 'a timed run over a pool read from the database, three clocks (20, 45 and 75 seconds) under one key, so only the pool size and typing speed bound it',
  'higher-lower': 'an endless streak recorded times 100 at the miss; each pair is drawn at random with only the last man left out, so no streak length is ruled out',
  'higher-lower-transfers': 'an endless streak over a deck read from the database',
  'list-quiz': 'records the names found, and every list lives in the database, so its length is data and some lists grow',
  'pack-battle': 'records the banked card\'s market value in dollars, which the database sets',
  'nascar-chain': 'an endless chain, bounded only by how many drivers the database holds',
  'nba-chain': 'endless mode (the default) is a chain bounded only by how many players the database holds',
  'tennis-chain': 'an endless chain, bounded only by how many players the database holds',
  'ufc-chain': 'an endless chain, bounded only by how many fighters the database holds',
  'nfl-my-career': 'the legacy is an open sum of rings, awards, seasons and career yards with no clamp',
  'nba-my-career': 'the legacy is an open sum of rings, awards, seasons and career stats with no clamp',
  'mlb-my-career': 'the legacy is an open sum of rings, awards, seasons and career stats with no clamp',
  'nhl-my-career': 'the legacy is an open sum of rings, awards, seasons and career stats with no clamp',
};

/**
 * Bundle every module the table names into one ESM file and import it.
 * `plugins` lets a control hand esbuild a rewritten copy of one file.
 * Returns { mods, seasonLedgerPresent } where mods maps a repo relative file
 * to its namespace.
 */
export async function bundleCeilingModules(root, tmpDir, plugins = []) {
  const { build } = createRequire(path.join(root, 'package.json'))('esbuild');
  const rootUrl = root.replace(/\\/g, '/');
  const files = new Set();
  for (const [file, , arg] of Object.values(CEILINGS)) {
    files.add(file);
    if (arg) files.add(arg[0]);
  }
  const seasonLedgerPresent = fs.existsSync(path.join(root, SEASON_LEDGER[0]));
  if (seasonLedgerPresent) files.add(SEASON_LEDGER[0]);
  const list = [...files].sort();
  const setup = path.join(tmpDir, 'ceilings.setup.mjs').replace(/\\/g, '/');
  fs.writeFileSync(setup, [
    '/* Some modules touch storage at import; none of them may read a real one here. */',
    'const store = { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0, clear: () => {} };',
    'globalThis.localStorage = store;',
    'globalThis.sessionStorage = store;',
  ].join('\n'));
  const entry = path.join(tmpDir, 'ceilings.entry.mjs');
  fs.writeFileSync(entry, [
    `import '${setup}';`,
    ...list.map((f, i) => `import * as m${i} from '${rootUrl}/${f}';`),
    `export const mods = { ${list.map((f, i) => `'${f}': m${i}`).join(', ')} };`,
  ].join('\n'));
  const out = path.join(tmpDir, 'ceilings.bundle.mjs');
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    logLevel: 'error', alias: { '@': `${rootUrl}/src` }, jsx: 'automatic', plugins,
    loader: { '.png': 'empty', '.svg': 'empty', '.css': 'empty', '.jpg': 'empty', '.webp': 'empty' },
  });
  const { mods } = await import(pathToFileURL(out).href);
  return { mods, seasonLedgerPresent };
}

/** The value an entry names: a number, or a function of nothing or of its arg. */
export function resolveCeiling(mods, [file, name, arg]) {
  const mod = mods[file];
  if (!mod || !(name in mod)) return { error: `${file} has no export named ${name}` };
  const v = mod[name];
  if (typeof v === 'number') return { value: v };
  if (typeof v !== 'function') return { error: `${file} ${name} is neither a number nor a function` };
  if (!arg) return { value: v() };
  const argMod = mods[arg[0]];
  if (!argMod || !(arg[1] in argMod)) return { error: `${arg[0]} has no export named ${arg[1]}` };
  return { value: v(argMod[arg[1]]) };
}
