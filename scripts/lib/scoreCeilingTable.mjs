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
 *
 * WHERE A CEILING MAY COME FROM (the Round 646 review). An export is only
 * worth fencing if it is read off the code that records the score: the
 * scoring function itself on a perfect input (footleScore(true, 1)), or the
 * named constants that function reads (a clamp, a scale, a ladder). A number
 * written down beside the formula is a copy, and a copy stays green when the
 * formula changes. Every export named below is one of the two.
 *
 * PERFECT RUNS. Separately from the exports, every scored game is given one
 * of three things for simCapsAreCeilings section 5:
 *   PERFECT_RUNS  a driver that plays the scoring function the recorder calls
 *                 (not the ceiling export) over its input domain: a perfect run
 *                 must pay exactly the cap, and no run may record past it.
 *                 A `days` driver plays each day's perfect run on real dealt
 *                 boards, where a day's best varies (the arcade ladders,
 *                 Minefield): none may record past the cap.
 *                 Every driver also says how the fence knows the recorder uses
 *                 what it plays. `scorer` names a function the recorder's score
 *                 argument calls, read through the local constants that
 *                 argument names. `scoredIn` is for a score made away from the
 *                 recorder line (a state update, an engine): [file, the
 *                 function that makes the score, the names it must use].
 *   UNPLAYED      the reason no offline run can be played: the ceiling is a
 *                 clamp or a bound over a pool the database deals, a whole
 *                 simulated career, or a count the recorder reads straight off
 *                 an exported ladder. These are printed, never counted as
 *                 measured.
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
  'career': ['src/hooks/useCareerGame.ts', 'careerCeiling'],
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
  'footle': ['src/hooks/useGame.ts', 'footleCeiling'],
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
  'ufc': ['src/hooks/useUfcGame.ts', 'ufcCeiling'],
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

/* ================= section 5: perfect runs through the scoring code ================= */

const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const run = (label, score, perfect = false) => ({ label, score, perfect });

/** Real calendar days to deal from: every day of 2026 and on into 2027. */
export function sampleDays(n) {
  const t0 = Date.UTC(2026, 0, 1);
  return range(0, n - 1).map(i => new Date(t0 + i * 86_400_000).toISOString().slice(0, 10));
}

const HL_FILE = 'src/lib/higherLowerScore.ts';
const CLUE_FILE = 'src/lib/careerClueScores.ts';
const CONNECTIONS_FILE = 'src/lib/connectionsScore.ts';
const GRID_FILE = 'src/lib/gridScore.ts';
const CONNECT4_FILE = 'src/lib/connect4Score.ts';
const GAUNTLET_FILE = 'src/lib/gauntletEngine.ts';

/** Every answer sequence of a daily, all 2^rounds of them. */
const hlRuns = mods => {
  const { higherLowerScore, HIGHER_LOWER_DAILY_ROUNDS: n } = mods[HL_FILE];
  const out = [];
  for (let mask = 0; mask < 2 ** n; mask++) {
    const results = range(0, n - 1).map(i => ({ correct: ((mask >> i) & 1) === 1 }));
    const right = results.filter(r => r.correct).length;
    out.push(run(`${right} of ${n} right, sequence ${mask}`, higherLowerScore(results), mask === 2 ** n - 1));
  }
  return out;
};

const clueRuns = mods => {
  const { careerClueScore, CAREER_CLUE_SCORES } = mods[CLUE_FILE];
  return range(0, CAREER_CLUE_SCORES.length + 2).flatMap(level => [
    run(`guessed on clue ${level + 1}`, careerClueScore(true, level), level === 0),
    run(`not guessed by clue ${level + 1}`, careerClueScore(false, level)),
  ]);
};

const connectionsRuns = mods => {
  const { connectionsScore, CONNECTIONS_LIVES } = mods[CONNECTIONS_FILE];
  return range(0, CONNECTIONS_LIVES).flatMap(lives => [
    run(`solved with ${lives} lives left`, connectionsScore(true, lives), lives === CONNECTIONS_LIVES),
    run(`not solved, ${lives} lives left`, connectionsScore(false, lives)),
  ]);
};

const gridRuns = mods => {
  const { gridScore, GRID_CELLS } = mods[GRID_FILE];
  return range(0, GRID_CELLS).map(cells => run(`${cells} cells right`, gridScore(cells), cells === GRID_CELLS));
};

const connect4Runs = mods => {
  const { connect4Score } = mods[CONNECT4_FILE];
  return ['won', 'draw', 'lost'].map(o => run(o, connect4Score(o), o === 'won'));
};

/** A daily scored by guesses used: every count from 1 to `most`, won or not. */
const guessRuns = (file, fn, most) => mods => {
  const score = mods[file][fn];
  const top = typeof most === 'function' ? most(mods) : most;
  return range(1, top).flatMap(used => [
    run(`won on guess ${used}`, score(true, used), used === 1),
    run(`lost after ${used} guesses`, score(false, used)),
  ]);
};

const gauntletRuns = roundsOf => mods => {
  const { gauntletScore } = mods[GAUNTLET_FILE];
  const n = roundsOf(mods);
  return range(0, n).map(c => run(`cleared ${c} of ${n}`, gauntletScore(c, c === n), c === n));
};

/** The arcade ladders: every day's perfect run on the day's real deal. */
const arcadeDays = file => mods => {
  const A = mods[file];
  return sampleDays(400).map(d => run(`${d}, every shot perfect`, A.maxRunScore(A.buildRun(A.daySeed(d)))));
};

const HL_RUN = { files: [HL_FILE], runs: hlRuns, scorer: 'higherLowerScore' };
const CLUE_RUN = { files: [CLUE_FILE], runs: clueRuns, scorer: 'careerClueScore' };
const CONNECTIONS_RUN = { files: [CONNECTIONS_FILE], runs: connectionsRuns, scorer: 'connectionsScore' };
const GRID_RUN = { files: [GRID_FILE], runs: gridRuns, scorer: 'gridScore' };
const CONNECT4_RUN = { files: [CONNECT4_FILE], runs: connect4Runs, scorer: 'connect4Score' };
const GAUNTLET_MADE = [GAUNTLET_FILE, 'runGauntlet', ['gauntletScore']];

/**
 * Every scored game whose recorder calls a scoring function the fence can
 * play. `runs(mods)` plays it and flags the perfect run(s); `days` marks a
 * game whose perfect run varies with the day's deal.
 */
export const PERFECT_RUNS = {
  'afl-higher-lower': HL_RUN, 'cfb-higher-lower': HL_RUN, 'f1-higher-lower': HL_RUN,
  'golf-higher-lower': HL_RUN, 'hockey-higher-lower': HL_RUN, 'mlb-higher-lower': HL_RUN,
  'nba-higher-lower': HL_RUN, 'nfl-higher-lower': HL_RUN, 'tennis-higher-lower': HL_RUN,
  'baseball-career': CLUE_RUN, 'hockey-career': CLUE_RUN, 'nba-career': CLUE_RUN, 'olympics': CLUE_RUN,
  'connections': CONNECTIONS_RUN, 'baseball-connections': CONNECTIONS_RUN, 'nba-connections': CONNECTIONS_RUN,
  'nfl-connections': CONNECTIONS_RUN, 'nhl-connections': CONNECTIONS_RUN,
  'soccer-grid': GRID_RUN, 'football-grid': GRID_RUN, 'college-grid': GRID_RUN, 'nba-grid': GRID_RUN,
  'mlb-grid': GRID_RUN, 'hockey-grid': GRID_RUN, 'cbb-grid': GRID_RUN,
  'football-connect-4': CONNECT4_RUN, 'mlb-connect-4': CONNECT4_RUN, 'nba-connect-4': CONNECT4_RUN,
  'nfl-connect-4': CONNECT4_RUN, 'nhl-connect-4': CONNECT4_RUN,
  'footle': { files: ['src/hooks/useGame.ts'], runs: guessRuns('src/hooks/useGame.ts', 'footleScore', 12), scorer: 'footleScore' },
  'career': { files: ['src/hooks/useCareerGame.ts'], runs: guessRuns('src/hooks/useCareerGame.ts', 'careerDailyScore', 12), scorer: 'careerDailyScore' },
  'ufc': { files: ['src/hooks/useUfcGame.ts'], runs: guessRuns('src/hooks/useUfcGame.ts', 'ufcDailyScore', 12), scorer: 'ufcDailyScore' },
  'guess-transfer-value': {
    files: ['src/hooks/useGuessTransferValue.ts'],
    runs: guessRuns('src/hooks/useGuessTransferValue.ts', 'transferValueDailyScore', m => m['src/hooks/useGuessTransferValue.ts'].MAX_GUESSES),
    scorer: 'transferValueDailyScore',
  },
  'puck-detective': {
    files: ['src/pages/PuckDetective.tsx', 'src/lib/puckDetective.ts'],
    runs: guessRuns('src/pages/PuckDetective.tsx', 'puckDetectiveScore', m => m['src/lib/puckDetective.ts'].GUESS_LIMIT),
    scorer: 'puckDetectiveScore',
  },
  'nfl-career': {
    files: ['src/hooks/useNFLCareer.ts'],
    scoredIn: ['src/hooks/useNFLCareer.ts', 'useNFLCareer', ['dailyScoreOf']],
    runs: mods => {
      const { dailyScoreOf } = mods['src/hooks/useNFLCareer.ts'];
      return range(1, 12).flatMap(c => [
        run(`won on clue ${c}`, dailyScoreOf('won', c), c === 1),
        run(`lost at clue ${c}`, dailyScoreOf('lost', c)),
      ]);
    },
  },
  'football-draft': {
    files: ['src/hooks/useFootballDraft.ts', 'src/data/draftGuesserPlayers.ts'],
    scorer: 'footballDraftDailyScore',
    runs: mods => {
      const { calcPoints, footballDraftDailyScore } = mods['src/hooks/useFootballDraft.ts'];
      const { draftGuesserPuzzles } = mods['src/data/draftGuesserPlayers.ts'];
      /* The most any single call pays, over every round, guess and clue level. */
      const rounds = [null, ...range(1, 7)];
      let bestCall = 0;
      for (const a of rounds) for (const g of rounds) for (const c of range(0, 4)) bestCall = Math.max(bestCall, calcPoints(a, g, c));
      return draftGuesserPuzzles.flatMap((p, i) => [
        run(`puzzle ${i}, every round called before a clue`, footballDraftDailyScore(true, p.players.map(x => calcPoints(x.draftRound, x.draftRound, 0))), true),
        run(`puzzle ${i}, every player at the best call anywhere`, footballDraftDailyScore(true, p.players.map(() => bestCall))),
      ]);
    },
  },
  'face-off': {
    files: ['src/lib/faceOff.ts'],
    scoredIn: ['src/hooks/useFaceOff.ts', 'useFaceOff', ['resolveRound', 'totals']],
    runs: mods => {
      const F = mods['src/lib/faceOff.ts'];
      const cats = F.buildCategories();
      return sampleDays(120).flatMap(d => {
        const rounds = F.dealRounds(cats, F.makeRng(F.seedForDate(d)), F.DAILY_DIFFICULTY, F.ROUNDS);
        const flawless = rounds.map(r => F.resolveRound(r, r.higher, F.QUICKEST_ANSWER));
        const tied = F.needsExtra(flawless, rounds.length);
        const paced = rounds.map(r => F.resolveRound(r, r.higher, 1.5));
        return [
          run(`${d}, ${rounds.length} rounds all right at once${tied ? ', and TIED' : ''}`, F.totals(flawless).you, true),
          run(`${d}, all right at 1.5 seconds`, F.totals(paced).you),
        ];
      });
    },
  },
  'sports-bingo': {
    files: ['src/lib/sportsBingo.ts'],
    scorer: 'scoreGame',
    runs: mods => {
      const { scoreGame, CARD_SIZE } = mods['src/lib/sportsBingo.ts'];
      let s = 646;
      const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32);
      return [
        run('blackout', scoreGame(range(1, CARD_SIZE).map(() => true)), true),
        ...range(1, 3000).map(i => {
          const p = 0.2 + (i % 8) * 0.1;
          return run(`card ${i}`, scoreGame(range(1, CARD_SIZE).map(() => rnd() < p)));
        }),
      ];
    },
  },
  'career-ladder': {
    files: ['src/lib/careerLadder.ts'],
    scoredIn: ['src/pages/CareerLadder.tsx', 'CareerLadder', ['careerScore']],
    runs: mods => {
      const { careerScore } = mods['src/lib/careerLadder.ts'];
      return range(2, 10).flatMap(total => range(1, total).flatMap(shown => range(0, 8).map(wrong =>
        run(`${total} stints, ${shown} shown, ${wrong} wrong`, careerScore(shown, wrong, total), shown === 1 && wrong === 0))));
    },
  },
  'guess-soccer-club-questions': {
    files: ['src/lib/clubQuestionTree.ts'],
    scoredIn: ['src/hooks/useGuessSoccerClub.ts', 'useGuessSoccerClub', ['scoreQuestionTreeRound']],
    runs: mods => {
      const { scoreQuestionTreeRound, CLUB_QUESTIONS } = mods['src/lib/clubQuestionTree.ts'];
      const ids = CLUB_QUESTIONS.map(q => q.id);
      return [
        run('right before any question', scoreQuestionTreeRound([], true), true),
        run('wrong before any question', scoreQuestionTreeRound([], false)),
        run('right after every question', scoreQuestionTreeRound(ids, true)),
        ...ids.flatMap(id => [run(`right after ${id}`, scoreQuestionTreeRound([id], true)), run(`wrong after ${id}`, scoreQuestionTreeRound([id], false))]),
      ];
    },
  },
  'score-predictor': {
    files: ['src/hooks/useScorePredictor.ts'],
    scoredIn: ['src/hooks/useScorePredictor.ts', 'useScorePredictor', ['calcScore']],
    runs: mods => {
      const { calcScore } = mods['src/hooks/useScorePredictor.ts'];
      return [[2, 1], [0, 0], [1, 3], [4, 4]].flatMap(([h, a]) => range(0, 6).flatMap(gh => range(0, 6).map(ga =>
        run(`${gh}-${ga} on a ${h}-${a}`, calcScore(gh, ga, h, a), gh === h && ga === a))));
    },
  },
  'nba-stat-line': {
    files: ['src/lib/nbaStatLine.ts'],
    scoredIn: ['src/hooks/useNbaStatLine.ts', 'useNbaStatLine', ['scoreCombined']],
    runs: mods => {
      const { scoreCombined } = mods['src/lib/nbaStatLine.ts'];
      const targets = [
        { pts: 27.4, trb: 7.1, ast: 5.3, stl: 1.4, blk: 0.8, split: 'FG', splitPct: 49.2, floorYear: 1980 },
        { pts: 12.0, trb: 11.5, ast: 2.1, stl: null, blk: null, split: 'FT', splitPct: 71.0, floorYear: 0 },
        { pts: 18.3, trb: 3.2, ast: 8.8, stl: 1.9, blk: 0.2, split: '3P', splitPct: 38.5, floorYear: 1974 },
      ];
      const line = (t, d) => ({ minutes: 3000, pts: t.pts + d, trb: t.trb + d, ast: t.ast - d, stl: t.stl == null ? null : t.stl + d / 4, blk: t.blk == null ? null : t.blk + d / 4, splitMakes: 0, splitAtts: 0, splitPct: t.splitPct + d * 2 });
      return targets.flatMap((t, i) => [-6, -2, -0.5, 0, 0.5, 2, 6].map(d =>
        run(`target ${i}, every stat off by ${d}`, scoreCombined(t, line(t, d)).total, d === 0)));
    },
  },
  'gauntlet-draft': { files: [GAUNTLET_FILE, 'src/lib/gauntletDraft.ts'], runs: gauntletRuns(m => m['src/lib/gauntletDraft.ts'].GAUNTLET_ROUNDS.length), scoredIn: GAUNTLET_MADE },
  'nba-gauntlet-draft': { files: [GAUNTLET_FILE, 'src/lib/gauntletDraftNba.ts'], runs: gauntletRuns(m => m['src/lib/gauntletDraftNba.ts'].NBA_GAUNTLET_CONFIG.rounds.length), scoredIn: GAUNTLET_MADE },
  'nfl-gauntlet-draft': { files: [GAUNTLET_FILE, 'src/lib/gauntletDraftNfl.ts'], runs: gauntletRuns(m => m['src/lib/gauntletDraftNfl.ts'].NFL_GAUNTLET_CONFIG.rounds.length), scoredIn: GAUNTLET_MADE },
  'mlb-gauntlet-draft': { files: [GAUNTLET_FILE, 'src/lib/gauntletDraftMlb.ts'], runs: gauntletRuns(m => m['src/lib/gauntletDraftMlb.ts'].MLB_GAUNTLET_CONFIG.rounds.length), scoredIn: GAUNTLET_MADE },
  'free-kick': { files: ['src/lib/freeKick.ts'], days: true, runs: arcadeDays('src/lib/freeKick.ts'), scoredIn: ['src/lib/freeKick.ts', 'takeShot', ['kickPoints']] },
  'buzzer-beater': { files: ['src/lib/buzzerBeater.ts'], days: true, runs: arcadeDays('src/lib/buzzerBeater.ts'), scoredIn: ['src/lib/buzzerBeater.ts', 'takeShot', ['shotPoints']] },
  'minefield': {
    files: ['src/lib/minefield.ts'],
    days: true,
    scoredIn: ['src/pages/Minefield.tsx', 'Minefield', ['POINTS_PER_FIND', 'CLEAR_BONUS']],
    runs: mods => {
      const M = mods['src/lib/minefield.ts'];
      return sampleDays(400).map(d => run(`${d}, every board swept`, M.maxRunScore(M.buildRun(M.daySeed(new Date(`${d}T17:00:00Z`))))));
    },
  },
};

/**
 * Round 647's six season games, played through scoreSeason when
 * src/lib/seasonLedger.ts is on the tree. 647 scores a season against its
 * own projection, PAR plus how far it beat it, clamped at the ceiling: so
 * every record from none won to all won in each sport's season length, at
 * every round reached, against projections from a no hoper to a favourite
 * expected to win it all. The perfect runs are the unbeaten title seasons
 * projected at or under par, the seasons 647 says reach the ceiling (a
 * favourite's perfect season need not, because it was expected).
 */
export function seasonRuns(mods) {
  const { scoreSeason, W_FORM, W_TITLE, PAR } = mods[SEASON_LEDGER[0]];
  const out = [];
  const projections = [];
  for (const share of [0, 0.25, 0.5, 0.75, 1]) for (const ladder of [0, 10, 26, 50]) projections.push({ share, ladder });
  for (const [games, rounds] of [[12, 4], [17, 4], [30, 6], [82, 4], [162, 4]]) {
    for (const wins of [0, Math.floor(games / 2), games - 1, games]) {
      for (const stage of range(0, rounds + 1)) {
        for (const exp of projections) {
          const r = { season: 1, team: 'Any', wins, games, rounds, stage };
          const atOrUnderPar = W_FORM * exp.share + Math.min(exp.ladder, W_TITLE) <= PAR;
          out.push(run(`${wins} of ${games} won, round ${stage} of ${rounds}, projected ${exp.share} and ${exp.ladder}`,
            scoreSeason(r, exp), wins === games && stage === rounds + 1 && atOrUnderPar));
        }
      }
    }
  }
  return out;
}

/**
 * Every other scored game, with the reason no offline run is played. Each
 * ceiling still reads the constant the scoring code reads (section 3 holds
 * it); what is missing is a pure function a perfect input can be fed to.
 */
export const UNPLAYED = {
  'fight-career': 'the legacy is a clamp at FIGHT_CAREER_CEILING over a whole simulated career; no offline career is shown to reach it',
  'fight-gym': 'the verdict is a clamp at FIGHT_GYM_CEILING over a whole simulated gym',
  'fight-promoter': 'the verdict is a clamp at FIGHT_PROMOTER_CEILING over a whole simulated promotion',
  'f1-constructor': 'the reducer records POINTS_BY_CLUE at the clue revealed; the ceiling is that ladder\'s top rung',
  'f1-driver': 'the reducer records POINTS_BY_CLUE at the clue revealed; the ceiling is that ladder\'s top rung',
  'guess-cbb-team': 'the reducer records POINTS_BY_CLUE at the clue revealed; the ceiling is that ladder\'s top rung',
  'guess-nascar-driver': 'the reducer records POINTS_BY_CLUE at the clue revealed; the ceiling is that ladder\'s top rung',
  'guess-tennis-player': 'the reducer records POINTS_BY_CLUE at the clue revealed; the ceiling is that ladder\'s top rung',
  'guess-nfl-team': 'the reducer records POINTS_BY_CLUE at the clue revealed; the ceiling is that ladder\'s top rung',
  'guess-the-nation': 'the reducer records POINTS_BY_CLUE at the clue revealed; the ceiling is that ladder\'s top rung',
  'guess-soccer-club': 'the reducer records POINTS_BY_CLUE at the clue revealed; the ceiling is that ladder\'s top rung',
  'guess-the-year': 'the reducer records POINTS_BY_CLUE at the clue revealed; the ceiling is that ladder\'s top rung',
  'guess-the-college': 'the hook records SCORE_MAP at the clue revealed; the ceiling is that ladder\'s top rung',
  'world-cup': 'the hook records POINTS_BY_CLUE at the clue revealed; the ceiling is that ladder\'s top rung',
  'shirt-number': 'the hook records SCORES at the attempt; the ceiling is that ladder\'s top rung',
  'missing-eleven': 'the page records ELEVEN_SCORES at the miss count; the ceiling is that ladder\'s top rung',
  'missing-five': 'the page records FIVE_SCORES at the miss count; the ceiling is that ladder\'s top rung',
  'missing-nine': 'the page records NINE_SCORES at the miss count; the ceiling is that ladder\'s top rung',
  'missing-xi': 'the page records SCORE_BY_GUESS at the guess; the ceiling is that ladder\'s top rung',
  'sports-millionaire': 'the page records the MONEY_LADDER rung reached; the ceiling is its top rung',
  'emoji-guess': 'the hook sums POINTS at each round\'s attempt over ROUNDS rounds; the ceiling is ROUNDS at the top of POINTS',
  'perfect-lineup-f1': 'the rating is a clamp at PERFECT_LINEUP_RATING_CEILING over picks from a pool the database deals',
  'perfect-lineup-nba': 'the rating is a clamp at PERFECT_LINEUP_RATING_CEILING over picks from a pool the database deals',
  'perfect-lineup-nhl': 'the rating is a clamp at PERFECT_LINEUP_RATING_CEILING over picks from a pool the database deals',
  'perfect-lineup': 'the classic rating is a clamp at LINEUP_RATING_MAX over the day\'s eligible players; the best real board rates well under it',
  'conquest-imperialism': 'perfectScore sums the same point constants runScore adds over a whole simulated conquest',
  'conquest-mlb-imperialism': 'perfectScore sums the same point constants runScore adds over a whole simulated conquest',
  'conquest-nba-imperialism': 'perfectScore sums the same point constants runScore adds over a whole simulated conquest',
  'conquest-nhl-imperialism': 'perfectScore sums the same point constants runScore adds over a whole simulated conquest',
  'conquest-soccer-imperialism': 'perfectScore sums the same point constants runScore adds over a whole simulated conquest',
  'perfect-season-mlb': 'the record is perfectSeasonPoints, the season\'s wins above what the zero skill draft expects, and the simulated season is MLB_GAMES long',
  'perfect-season-nba': 'the record is perfectSeasonPoints, the season\'s wins above what the zero skill draft expects, and the simulated season is NBA_GAMES long',
  'perfect-season-nfl': 'the record is perfectSeasonPoints, the season\'s wins above what the zero skill draft expects, and the simulated season is NFL_GAMES long',
  'perfect-season-nhl': 'the record is perfectSeasonPoints, the season\'s wins above what the zero skill draft expects, and the simulated season is NHL_GAMES long',
  'ball-iq': 'the IQ is a clamp at IQ_TOP over the day\'s twelve answers, recorded times IQ_RECORD_SCALE',
  'budget-builder': 'a bound: a squad rated PLAYER_RATING_MAX cannot also leave the budget unspent, and what a board can really reach depends on the pool the database deals',
  'build-your-xi': 'the recorder writes buildXiPoints(verdict), LINEUP_PERFECT at the verdict ladder\'s top rung, and the verdict comes from a referee no offline run can call',
  'nba-starting-5': 'the recorder writes startingFivePoints(verdict), LINEUP_PERFECT at the referee ladder\'s top rung, and the verdict comes from a referee no offline run can call',
  'champ-or-not': 'the record counts right answers over DAILY_ROUNDS rounds',
  'whod-they-beat': 'the record counts right answers over BEAT_ROUNDS questions',
  'club-manager': 'a season score over a whole simulated season, held to ledgerCeiling by Round 633\'s own fence',
  'clue-auction': 'the page records the bank left on a win, and the bank starts at START_BANK and only shrinks',
  'dart-draft': 'a bound: every dart at ACCURACY_POINTS_MAX needs a tiny nation in every slot, and the squad rating is a clamp over a pool the database deals',
  'fantasy-draft': 'the season score is duelScore, a season share clamped at FANTASY_DRAFT_CEILING (100) scored above the zero skill season, over a whole simulated season',
  'search-and-discard': 'the season score is duelScore, a season share clamped at SEARCH_AND_DISCARD_CEILING (100) scored above the zero skill season, over a whole simulated season',
  'football-timeline': 'the record counts players in the right slot times POINTS_PER_SLOT',
  'grade-transfer': 'the hook sums scoreFor over ROUNDS grades; the ceiling is ROUNDS at scoreFor\'s exact grade',
  'guess-the-golfer': 'the page records BASE_SCORE less CLUE_COST a clue past the first',
  'hof-or-bust': 'the hook records BASE_SCORE less HINT_COST a hint for a right vote',
  'jeopardy': 'the hook banks the board\'s tile values; the ceiling is every tile of every column',
  'mystery-box': 'the XI rating is an average of playerRating, a clamp at PLAYER_RATING_MAX over packs the database deals',
  'player-bingo': 'the page records lines times POINTS_PER_LINE plus BLACKOUT_BONUS; Round 644 owns the cap',
  'player-stock-market': 'scoreCampaign scales and clamps at STOCK_MARKET_CEILING between the worst and best affordable elevens of a real campaign',
  'rank-em': 'the page records the items in the right slot times RANK_POINTS_PER_SLOT',
  'rarity-round': 'recordedRunScore records RARITY_POINTS_PER_ROUND less each round\'s points; Round 644 owns the cap',
  'rebuild': 'the rating is a clamp at REBUILD_RATING_MAX over a whole simulated window, recorded times REBUILD_RECORD_SCALE',
  'sign-the-player': 'a bound: auctionScoreOf at the top of each term, and a squad rated AUCTION_RATING_MAX cannot also keep the whole budget; what an auction can really reach depends on the pool the database deals',
  'silverware-sort': 'the record counts green slots over DAILY_BOARDS boards of BOARD_SIZE',
  'soccer-career': 'the legacy is a clamp at SOCCER_CAREER_CEILING over a whole simulated career; Round 644 owns the cap',
  'squad-deal': 'the rating is a clamp at SQUAD_DEAL_CEILING over picks from a pool the database deals',
  'teammates': 'the record counts right calls times POINTS_PER_CALL',
  'transfer-path': 'the hook records TRANSFER_PATH_CEILING less a step past the puzzle\'s shortest chain',
  'world-xi': 'the record counts the slots filled, and the biggest formation has worldXiCeiling of them',
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
  for (const entry of Object.values(PERFECT_RUNS)) for (const f of entry.files) files.add(f);
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
