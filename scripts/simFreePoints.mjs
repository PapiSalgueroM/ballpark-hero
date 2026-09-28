/*
 * Round 645 part two: no game pays the cap or a big floor for no skill.
 *
 * WHAT THE POINTS AUDIT FOUND (2026-09-19, read only, and measured again for
 * this round on 2026-09-28): a game's recorded score is its leaderboard pay,
 * 100 x score / cap per day, and a run with no skill in it (nothing correct,
 * the worst choice every time) was paid most of a perfect run in fifteen game
 * shapes. Build Your XI and NBA Starting 5 recorded 500 of 500 for any finished
 * lineup. Ball IQ recorded 550 of 1600 for twelve wrong answers. HOF or Bust
 * scored either vote on a borderline player as right, the full 1000 on six days
 * in twenty six. Pack Battle banked the free opening card on a first call bust.
 * Mystery Box recorded 450 for binning every pack. Every squad rating game
 * recorded a rating the worst picks already carried most of the way: the worst
 * Perfect Lineup boards rated 73 to 82 (NBA), the worst Squad Deal and Budget
 * Builder boards sat in the 50s to 80s, a Rebuild recorded the rating the club
 * walked in with, a keeper of the worst card in Search and Discard scored 62 to
 * the best keeper's 68, the worst Fantasy eleven scored 73, the weakest card in
 * every Gauntlet pick averaged 25 of 100 on the soccer pool, a Sign the Player
 * bidder who never bid scored about 340 of 600, a Perfect Season of the worst
 * picks won 19 of 82 NBA games, and a Fight Gym that never booked a bout closed
 * on 17 by signing and releasing kids.
 *
 * THE RULE THIS HOLDS, one row per game that records a score: the zero skill
 * run records at most 5 percent of the perfect run (ZERO_SHARE_LIMIT), and for
 * every game this round changed, the perfect run records exactly what the
 * formula it replaced recorded for the same run (the `before` column), so a
 * cap that was right stays right. A row whose zero skill run records exactly 0
 * and whose game has no ceiling (a streak, a chain) is held at 0 exactly.
 *
 * HOW A ROW MEASURES. Every row reads its game's recorder call out of the
 * source (comments stripped), takes the score expression it records, follows it
 * through the file's own local definitions, and evaluates that expression with
 * values produced by the real code: the real scorer functions out of one
 * bundle, the real engines driven with a zero skill policy and a perfect one,
 * and the game's own constants read out of its file. A row that meets an
 * identifier it does not bind fails loudly, so a recorder that changes shape
 * has to be re-measured, never waved through. Where a row binds a piece of
 * component state directly, it names the line of code that sets that state
 * (`requires`), and fails if that line is gone.
 *
 * SECTIONS
 *   1) The table, every row: zero skill against perfect, and `before` for the
 *      games this round rescaled.
 *   2) Coverage, both ways: every recorder in src that records a numeric score
 *      has a row, and every row names a recorder that still exists.
 *   3) The judges' labels: every verdict label the lineup referees and the
 *      offline judge can give is on a ladder in src/lib/lineupVerdictPoints.ts,
 *      so a new rung cannot quietly score 0 (that file's header promises it).
 *
 * NEGATIVE CONTROLS, FREE_POINTS_CONTROL=<name>. Each puts one free floor back
 * in an in-memory copy of one file (the recorder read and the bundle both see
 * the copy, src is never written), refuses to run unless its anchor occurs in
 * the file's code exactly once, and must turn exactly its own rows red:
 *   xifloor    Build Your XI records `verdict ? 500 : 0` again: build-your-xi
 *   iqfloor    Ball IQ records `iq * 10` again: ball-iq
 *   emptybox   Mystery Box's floor back to 0, so binning every pack pays 450:
 *              mystery-box
 *   borderline HOF or Bust's daily deals borderline players again: hof-or-bust
 *   cupfloor   the shared Gauntlet engine scores the run's own score again: the
 *              soccer, NBA and MLB gauntlets (the NFL ladder never paid a floor)
 *   sitout     Sign the Player pays the place, the rating and the money whatever
 *              the squad, as before this round: sign-the-player
 *
 * Nothing here reads the database, dist or the clock: pools are the repo's own
 * static data, and every stochastic draw is seeded (scripts/lib/seedRandom.mjs).
 *
 * Run: node scripts/simFreePoints.mjs
 */
import './lib/seedRandom.mjs';
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZERO_SHARE_LIMIT = 0.05;
const CONTROL = process.env.FREE_POINTS_CONTROL || '';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const readLF = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/* ---------------- source, as code ---------------- */

/** Strips comments, keeping strings and template literals intact. */
function stripComments(s) {
  let out = '';
  let i = 0;
  let q = null;
  while (i < s.length) {
    const c = s[i];
    const n = s[i + 1];
    if (q) {
      out += c;
      if (c === '\\') { out += n ?? ''; i += 2; continue; }
      if (c === q) q = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i += 1; continue; }
    if (c === '/' && n === '*') { const j = s.indexOf('*/', i + 2); i = j < 0 ? s.length : j + 2; continue; }
    if (c === '/' && n === '/') { const j = s.indexOf('\n', i); i = j < 0 ? s.length : j; continue; }
    out += c;
    i += 1;
  }
  return out;
}

/* The controls. Each rewrites one file's in-memory copy. */
const CONTROLS = {
  xifloor: {
    file: 'src/hooks/useLineupBuilder.ts',
    from: "useGameCompletion('build-your-xi', phase === 'result', buildXiPoints(verdict));",
    to: "useGameCompletion('build-your-xi', phase === 'result', verdict ? 500 : 0);",
    rows: ['build-your-xi'],
  },
  iqfloor: {
    file: 'src/hooks/useBallIq.ts',
    from: "useGameCompletion('ball-iq', finished, ballIqPoints(iq), correctCount);",
    to: "useGameCompletion('ball-iq', finished, iq * 10, correctCount);",
    rows: ['ball-iq'],
  },
  emptybox: {
    file: 'src/hooks/useMysteryBox.ts',
    from: 'return skillPoints(rating * 10, EMPTY_SLOT_RATING * 10, PLAYER_RATING_CEILING * 10);',
    to: 'return skillPoints(rating * 10, 0, PLAYER_RATING_CEILING * 10);',
    rows: ['mystery-box'],
  },
  borderline: {
    file: 'src/hooks/useHofOrBust.ts',
    from: "if (p.verdict !== 'borderline') return p;",
    to: 'return p;',
    rows: ['hof-or-bust'],
  },
  cupfloor: {
    file: 'src/lib/gauntletEngine.ts',
    from: 'return skillPoints(run.score, floor.score, 100);',
    to: 'return floor.score >= 0 ? run.score : 0;',
    /* The NFL ladder sits so far above its pool's weakest cards that they
       clear under a tenth of a round on average (0.6 of 100 measured), so
       the old score never paid the NFL a floor and stays green here. */
    rows: ['gauntlet-draft', 'nba-gauntlet-draft', 'mlb-gauntlet-draft'],
  },
  sitout: {
    file: 'src/lib/auctionHouse.ts',
    from: 'return Math.round(share * (placeBonus + rating * 3 + Math.round(yourRow.moneyLeft / 10)));',
    to: 'return placeBonus + Math.round(share >= 0 ? rating * 3 + Math.round(yourRow.moneyLeft / 10) : 0);',
    rows: ['sign-the-player'],
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`FREE_POINTS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
const MUT = new Map();
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const text = readLF(c.file);
  const inCode = stripComments(text).split(c.from).length - 1;
  const inText = text.split(c.from).length - 1;
  if (inCode !== 1 || inText !== 1) {
    console.error(`control ${CONTROL}: its anchor occurs ${inCode} times in the code of ${c.file} (${inText} in the text), not once. Refusing to run a control that changes nothing.`);
    process.exit(1);
  }
  MUT.set(c.file, text.replace(c.from, c.to));
  console.log(`NEGATIVE CONTROL ON: ${CONTROL} rewrites ${c.file}`);
}
const source = rel => MUT.get(rel) ?? readLF(rel);
const codeCache = new Map();
const code = rel => {
  if (!codeCache.has(rel)) codeCache.set(rel, stripComments(source(rel)));
  return codeCache.get(rel);
};

/* ---------------- the bundle ---------------- */

const ENTRY = `
export * as hl from '@/lib/higherLowerScore';
export * as footle from '@/hooks/useGame';
export * as ladder from '@/lib/careerLadder';
export * as verdicts from '@/lib/lineupVerdictPoints';
export * as iq from '@/hooks/useBallIq';
export * as box from '@/hooks/useMysteryBox';
export * as hof from '@/hooks/useHofOrBust';
export { default as hofPlayers } from '@/data/hofPlayers';
export * as pack from '@/lib/packBattle';
export * as pl from '@/data/perfectLineup';
export * as ple from '@/lib/perfectLineupEngine';
export { NBA_LINEUP_CONFIG } from '@/data/nbaPerfectLineupPool';
export { NHL_LINEUP_CONFIG } from '@/data/nhlPerfectLineupPool';
export { F1_LINEUP_CONFIG } from '@/data/f1PerfectLineupPool';
export * as ge from '@/lib/gauntletEngine';
export * as gd from '@/lib/gauntletDraft';
export { NBA_GAUNTLET_CONFIG } from '@/lib/gauntletDraftNba';
export { NFL_GAUNTLET_CONFIG } from '@/lib/gauntletDraftNfl';
export { MLB_GAUNTLET_CONFIG } from '@/lib/gauntletDraftMlb';
export { players as fallbackPlayers } from '@/data/players';
export * as sd from '@/lib/squadDeal';
export * as duel from '@/lib/searchDiscard';
export * as fantasy from '@/lib/fantasyCriteria';
export * as budget from '@/hooks/useBudgetBuilder';
export * as dart from '@/lib/dartDraft';
export * as dartMap from '@/lib/dartMap';
export * as auction from '@/lib/auctionHouse';
export * as rebuild from '@/lib/rebuildLoop';
export * as rebuildDeck from '@/lib/rebuildDeck';
export * as ps from '@/lib/perfectSeason';
export * as psx from '@/lib/perfectSeasonExpansion';
export { NBA_SLOTS, NBA_GAMES } from '@/lib/perfectSeasonNba';
export { NFL_SLOTS, NFL_GAMES } from '@/lib/perfectSeasonNfl';
export { MLB_SLOTS, MLB_GAMES } from '@/lib/perfectSeasonMlb';
export { NHL_SLOTS, NHL_GAMES } from '@/lib/perfectSeasonNhl';
export * as conquest from '@/lib/conquestRun';
export * as imp from '@/lib/imperialismEngine';
export { NFL_IMPERIALISM, NBA_IMPERIALISM, MLB_IMPERIALISM, NHL_IMPERIALISM, NFL_CONQUEST_GAME, NBA_CONQUEST_GAME, MLB_CONQUEST_GAME, NHL_CONQUEST_GAME } from '@/data/conquestSports';
export { SOCCER_IMPERIALISM, SOCCER_CONQUEST_GAME } from '@/data/soccerConquest';
export * as fightCareer from '@/lib/fightCareer';
export * as gym from '@/lib/fightGym';
export * as promoter from '@/lib/fightPromoter';
export * as nflCareer from '@/lib/nflMyCareer';
export * as nbaCareer from '@/lib/nbaMyCareer';
export * as mlbCareer from '@/lib/mlbMyCareer';
export * as nhlCareer from '@/lib/nhlMyCareer';
export * as ledger from '@/lib/clubManagerScore';
export * as soccer from '@/lib/soccerCareerEngine';
export * as faceOff from '@/lib/faceOff';
export * as predictor from '@/hooks/useScorePredictor';
export * as grade from '@/hooks/useGradeTransfer';
export * as minefield from '@/lib/minefield';
export * as missingXi from '@/lib/missingXi';
export { ELEVEN_SCORES } from '@/lib/missingEleven';
export { FIVE_SCORES } from '@/lib/missingFive';
export { NINE_SCORES } from '@/lib/missingNine';
export { RANK_POINTS_PER_SLOT } from '@/lib/orderTheList';
export * as bingo from '@/lib/sportsBingo';
export * as millionaire from '@/lib/sportsMillionaire';
export * as statLine from '@/lib/nbaStatLine';
export * as stock from '@/lib/playerStockMarket';
export * as rarity from '@/lib/rarityRound';
export { DAILY_ROUNDS as CHAMP_ROUNDS } from '@/lib/champOrNot';
export { POINTS_BY_CLUE as CBB_CLUES } from '@/types/cbbProgram';
export { POINTS_BY_CLUE as F1C_CLUES } from '@/types/f1Constructor';
export { POINTS_BY_CLUE as F1D_CLUES } from '@/types/f1Driver';
export { POINTS_BY_CLUE as NFLTEAM_CLUES } from '@/types/guessNflTeam';
export { POINTS_BY_CLUE as CLUB_CLUES } from '@/types/guessSoccerClub';
export { POINTS_BY_CLUE as NATION_CLUES } from '@/types/guessTheNation';
export { POINTS_BY_CLUE as YEAR_CLUES } from '@/types/guessTheYear';
export { POINTS_BY_CLUE as NASCAR_CLUES } from '@/types/nascarDriver';
export { POINTS_BY_CLUE as TENNIS_CLUES } from '@/types/tennisPlayer';
`;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'freePoints-'));
const require = createRequire(import.meta.url);
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: k => { mem.delete(k); },
  clear: () => mem.clear(),
  key: i => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};
let L;
try {
  const built = await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', logLevel: 'silent',
    jsx: 'automatic',
    alias: { '@': path.join(ROOT, 'src') },
    define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env': '{}' },
    plugins: [{
      name: 'free-points-control',
      setup(b) {
        b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
          const rel = path.relative(ROOT, args.path).replaceAll('\\', '/');
          if (!MUT.has(rel)) return undefined;
          return { contents: MUT.get(rel), loader: args.path.endsWith('tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
        });
      },
    }],
  });
  const file = path.join(TMP, 'freePoints.bundle.cjs');
  fs.writeFileSync(file, built.outputFiles[0].text);
  L = require(file);
} catch (e) {
  console.error('the bundle of the scorers did not build:', e.message ?? e);
  process.exit(1);
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* gone */ }
}

/* ---------------- reading a recorder ---------------- */

/** The top level arguments of the call whose '(' is at `open`. */
function argsAt(s, open) {
  let depth = 0;
  let cur = '';
  const res = [];
  let q = null;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (q) {
      cur += c;
      if (c === '\\') { cur += s[i + 1] ?? ''; i += 1; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; cur += c; continue; }
    if ('([{'.includes(c)) { depth += 1; if (depth === 1) continue; }
    if (')]}'.includes(c)) { depth -= 1; if (depth === 0) { res.push(cur.trim()); return res; } }
    if (c === ',' && depth === 1) { res.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  return res;
}

/** Every recorder call in a file: { kind, slugArg, scoreExpr }. */
function recordersIn(rel) {
  const s = code(rel);
  const out = [];
  for (const m of s.matchAll(/useGameCompletion\(/g)) {
    if (/function\s+$/.test(s.slice(Math.max(0, m.index - 30), m.index))) continue;
    const a = argsAt(s, m.index + m[0].length - 1);
    out.push({ kind: 'useGameCompletion', slugArg: a[0], scoreExpr: a[2] });
  }
  for (const m of s.matchAll(/recordCompletion\(/g)) {
    if (/function\s+$/.test(s.slice(Math.max(0, m.index - 30), m.index))) continue;
    const a = argsAt(s, m.index + m[0].length - 1);
    out.push({ kind: 'recordCompletion', slugArg: a[0], scoreExpr: a[1] });
  }
  for (const m of s.matchAll(/completionScore=\{/g)) {
    const a = argsAt(s, m.index + m[0].length - 1);
    out.push({ kind: 'completionScore', slugArg: null, scoreExpr: a[0] });
  }
  return out;
}

/** A string literal's value, a local `const X = 'literal'`'s value, or null. */
function slugOf(rel, slugArg) {
  if (!slugArg) return null;
  const lit = slugArg.match(/^['"`]\/?([a-z0-9-]+)['"`]$/);
  if (lit) return lit[1];
  if (/^[A-Za-z_$][\w$]*$/.test(slugArg)) {
    const m = code(rel).match(new RegExp(`const\\s+${slugArg}\\s*(?::[^=]+)?=\\s*['"]([a-z0-9-]+)['"]`));
    if (m) return m[1];
  }
  return null;
}

/** Removes the TypeScript an expression may carry so it evaluates as JS. */
const asJs = expr => expr
  .replace(/\s+as\s+const\b/g, '')
  .replace(/([\w)\]])!(?=[.\[)])/g, '$1');

/** A bare identifier defined once in the file by `const X = ...;` resolves to
 *  its initializer (a useMemo with an expression body resolves to that body). */
function resolveLocal(rel, expr, depth = 0) {
  if (depth > 4 || !/^[A-Za-z_$][\w$]*$/.test(expr)) return expr;
  const s = code(rel);
  const re = new RegExp(`const\\s+${expr}\\s*(?::[^=;]+)?=(?!=)`, 'g');
  const hits = [...s.matchAll(re)];
  if (hits.length !== 1) return expr;
  let i = hits[0].index + hits[0][0].length;
  let depthB = 0;
  let q = null;
  let init = '';
  for (; i < s.length; i++) {
    const c = s[i];
    if (q) { init += c; if (c === '\\') { init += s[i + 1]; i += 1; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; init += c; continue; }
    if ('([{'.includes(c)) depthB += 1;
    if (')]}'.includes(c)) depthB -= 1;
    if (c === ';' && depthB === 0) break;
    init += c;
  }
  init = init.trim();
  const memo = init.match(/^useMemo\(\s*\(\)\s*=>\s*/);
  if (memo) {
    const a = argsAt(init, init.indexOf('('));
    const body = a[0].replace(/^\(\)\s*=>\s*/, '').trim();
    if (body.startsWith('{')) return expr;
    return resolveLocal(rel, body, depth + 1);
  }
  if (/^use[A-Z]\w*\(/.test(init)) return expr;
  return resolveLocal(rel, init, depth + 1);
}

/** The value of a literal `const NAME = <literal>` in a file's code. */
function constOf(rel, name) {
  const s = code(rel);
  const m = s.match(new RegExp(`const\\s+${name}\\s*(?::[^=]+)?=\\s*([^;]+);`));
  if (!m) throw new Error(`${rel} has no const ${name}`);
  return Function(`return (${asJs(m[1])});`)();
}

/** Finds the recorders for `key` in `rel` and returns their resolved
 *  expressions, one per distinct expression (Club Manager records a season
 *  from four places). */
function sitesFor(rel, key, slugArg) {
  const recs = recordersIn(rel).filter(r => (slugArg ? r.slugArg === slugArg : slugOf(rel, r.slugArg) === key));
  if (recs.length === 0) throw new Error(`${rel} has no recorder for ${key}`);
  return [...new Set(recs.map(r => r.scoreExpr))].map(e => resolveLocal(rel, e));
}

/** Evaluates a recorder's expression in a scope; an unbound name throws. */
function evaluate(expr, scope) {
  const names = Object.keys(scope);
  return Function(...names, `"use strict"; return (${asJs(expr)});`)(...names.map(n => scope[n]));
}

/* ---------------- helpers for rows ---------------- */

const mean = xs => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const range = n => Array.from({ length: n }, (_, i) => i);
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function requireCode(rel, re, why) {
  if (!re.test(code(rel))) throw new Error(`${rel} no longer ${why} (${re})`);
}
const dates = range(365).map(i => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));

/* ---------------- the rows ---------------- */

const ROWS = [];
/**
 * row(key, spec):
 *   site     [file, slugArg?]: the recorder to read; slugArg when the slug is
 *            an expression (config.gameId), matched verbatim.
 *   zero()   a scope, or an array of scopes (their mean is the zero)
 *   perfect() a scope, or null for a game with no ceiling (zero must be 0)
 *   before   for a game this round rescaled: the formula it replaced, as a
 *            function of the perfect scope; the perfect must equal it
 *   requires [[file, regex, what]]: code a directly bound value depends on
 */
const row = (key, spec) => ROWS.push({ key, ...spec });

/* Higher or Lower, nine sports, one scorer (src/lib/higherLowerScore.ts). */
for (const [key, file] of [
  ['afl-higher-lower', 'src/hooks/useAflHL.ts'], ['cfb-higher-lower', 'src/hooks/useCfbHL.ts'],
  ['f1-higher-lower', 'src/hooks/useF1HL.ts'], ['golf-higher-lower', 'src/hooks/useGolfHL.ts'],
  ['hockey-higher-lower', 'src/hooks/useHockeyHL.ts'], ['mlb-higher-lower', 'src/hooks/useMlbHL.ts'],
  ['nba-higher-lower', 'src/hooks/useNbaHL.ts'], ['nfl-higher-lower', 'src/hooks/useNflHL.ts'],
  ['tennis-higher-lower', 'src/hooks/useTennisHL.ts'],
]) {
  const n = () => constOf(file, 'ROUNDS');
  row(key, {
    site: [file],
    zero: () => ({ higherLowerScore: L.hl.higherLowerScore, dailyResults: range(n()).map(() => ({ correct: false })) }),
    perfect: () => ({ higherLowerScore: L.hl.higherLowerScore, dailyResults: range(n()).map(() => ({ correct: true })) }),
  });
}

/* The clue ladders that pay CLUE_SCORES on a guess and 0 on a miss. */
for (const [key, file] of [
  ['baseball-career', 'src/hooks/useBaseballCareer.ts'], ['hockey-career', 'src/hooks/useHockeyCareer.ts'],
  ['nba-career', 'src/hooks/useNbaCareer.ts'],
]) {
  row(key, {
    site: [file],
    zero: () => ({ dailyStatus: 'lost', dailyClueLevel: 6, CLUE_SCORES: constOf(file, 'CLUE_SCORES') }),
    perfect: () => ({ dailyStatus: 'guessed', dailyClueLevel: 0, CLUE_SCORES: constOf(file, 'CLUE_SCORES') }),
  });
}
row('olympics', {
  site: ['src/hooks/useOlympics.ts'],
  zero: () => ({ score: 0, status: 'lost', clueLevel: 6, CLUE_SCORES: constOf('src/hooks/useOlympics.ts', 'CLUE_SCORES') }),
  perfect: () => ({ status: 'guessed', clueLevel: 0, CLUE_SCORES: constOf('src/hooks/useOlympics.ts', 'CLUE_SCORES') }),
});
row('career', {
  site: ['src/hooks/useCareerGame.ts'],
  zero: () => ({ dailyGameStatus: 'lost', dailyGuessesUsed: 8, MAX_GUESSES: constOf('src/hooks/useCareerGame.ts', 'MAX_GUESSES') }),
  perfect: () => ({ dailyGameStatus: 'won', dailyGuessesUsed: 1, MAX_GUESSES: constOf('src/hooks/useCareerGame.ts', 'MAX_GUESSES') }),
});
row('ufc', {
  site: ['src/hooks/useUfcGame.ts'],
  zero: () => ({ effectiveDailyStatus: 'lost', dailyGuesses: range(8), MAX_GUESSES: constOf('src/hooks/useUfcGame.ts', 'MAX_GUESSES') }),
  perfect: () => ({ effectiveDailyStatus: 'won', dailyGuesses: [0], MAX_GUESSES: constOf('src/hooks/useUfcGame.ts', 'MAX_GUESSES') }),
});
row('guess-transfer-value', {
  site: ['src/hooks/useGuessTransferValue.ts'],
  zero: () => ({ dailyStatus: 'lost', dailyGuesses: range(6), MAX_GUESSES: constOf('src/hooks/useGuessTransferValue.ts', 'MAX_GUESSES') }),
  perfect: () => ({ dailyStatus: 'won', dailyGuesses: [0], MAX_GUESSES: constOf('src/hooks/useGuessTransferValue.ts', 'MAX_GUESSES') }),
});
row('footle', {
  site: ['src/hooks/useGame.ts'],
  zero: () => ({ footleScore: L.footle.footleScore, effectiveDailyStatus: 'lost', dailyGuesses: range(8) }),
  perfect: () => ({ footleScore: L.footle.footleScore, effectiveDailyStatus: 'won', dailyGuesses: [0] }),
});
row('football-draft', {
  site: ['src/hooks/useFootballDraft.ts'],
  zero: () => ({ rawDailyStatus: 'lost', dailyGuesses: [] }),
  perfect: null,
});
row('world-cup', {
  site: ['src/hooks/useWorldCup.ts'],
  zero: () => ({ rawDailyStatus: 'lost', dailyRevealedCount: 7, POINTS_BY_CLUE: constOf('src/hooks/useWorldCup.ts', 'POINTS_BY_CLUE') }),
  perfect: () => ({ rawDailyStatus: 'won', dailyRevealedCount: 1, POINTS_BY_CLUE: constOf('src/hooks/useWorldCup.ts', 'POINTS_BY_CLUE') }),
});

/* Connections: a lost board pays 0, a clean one 4 lives x 250. */
row('connections', {
  site: ['src/hooks/useConnections.ts'],
  zero: () => ({ gameStatus: 'lost', activeLives: 0 }),
  perfect: () => ({ gameStatus: 'won', activeLives: 4 }),
});
for (const [key, file] of [
  ['baseball-connections', 'src/hooks/useBaseballConnections.ts'], ['nba-connections', 'src/hooks/useNbaConnections.ts'],
  ['nfl-connections', 'src/hooks/useNflConnections.ts'], ['nhl-connections', 'src/hooks/useNhlConnections.ts'],
]) {
  row(key, { site: [file], zero: () => ({ dailyWon: false, dailyLives: 0 }), perfect: () => ({ dailyWon: true, dailyLives: 4 }) });
}

/* The clue guessers: a lost game holds score 0, a first clue win the top of
   POINTS_BY_CLUE (read out of each game's types module). */
for (const [key, file, clues] of [
  ['guess-cbb-team', 'src/hooks/useCbbProgram.ts', 'CBB_CLUES'],
  ['f1-constructor', 'src/hooks/useF1Constructor.ts', 'F1C_CLUES'],
  ['f1-driver', 'src/hooks/useF1Driver.ts', 'F1D_CLUES'],
  ['guess-nfl-team', 'src/hooks/useGuessNflTeam.ts', 'NFLTEAM_CLUES'],
  ['guess-soccer-club', 'src/hooks/useGuessSoccerClub.ts', 'CLUB_CLUES'],
  ['guess-the-nation', 'src/hooks/useGuessTheNation.ts', 'NATION_CLUES'],
  ['guess-nascar-driver', 'src/hooks/useNascarDriver.ts', 'NASCAR_CLUES'],
  ['guess-tennis-player', 'src/hooks/useTennisPlayer.ts', 'TENNIS_CLUES'],
  ['guess-the-year', 'src/hooks/useGuessTheYear.ts', 'YEAR_CLUES'],
]) {
  row(key, {
    site: [file],
    zero: () => ({ gameState: { score: 0 } }),
    perfect: () => ({ gameState: { score: L[clues][0] } }),
    requires: [[file, /(?:gameStatus|status):\s*'lost',\s*score:\s*0\b/, "sets a lost game's score to 0"]],
  });
}
row('guess-soccer-club-questions', {
  site: ['src/hooks/useGuessSoccerClub.ts'],
  zero: () => ({ treeState: { score: 0 } }),
  perfect: null,
  requires: [['src/hooks/useGuessSoccerClub.ts', /status:\s*'lost',\s*score:\s*0\b/, "sets a lost tree's score to 0"]],
});
row('guess-the-college', {
  site: ['src/hooks/useGuessTheCollege.ts'],
  zero: () => ({ mode: 'daily', dailyGameState: { score: 0 }, unlimitedScore: 0 }),
  perfect: () => ({ mode: 'daily', dailyGameState: { score: constOf('src/hooks/useGuessTheCollege.ts', 'SCORE_MAP')[1] }, unlimitedScore: 0 }),
  requires: [['src/hooks/useGuessTheCollege.ts', /let score = 0;[\s\S]*?if \(action\.t === 'won'\) \{\s*score = SCORE_MAP\[revealedClues\]/, 'scores only a won board']],
});
row('transfer-path', {
  site: ['src/hooks/useTransferPath.ts'],
  zero: () => ({ dailyStatus: 'lost', dailyScore: 0 }),
  perfect: null,
});
row('career-ladder', {
  site: ['src/pages/CareerLadder.tsx'],
  zero: () => ({ dailyWonAction: undefined, dailyFinalScore: 0 }),
  perfect: () => ({ dailyWonAction: { t: 'won', score: L.ladder.careerScore(1, 0, 7) }, dailyFinalScore: L.ladder.careerScore(1, 0, 7) }),
});
row('puck-detective', {
  site: ['src/pages/PuckDetective.tsx'],
  zero: () => ({ won: false, guesses: [], GUESS_LIMIT: 8 }),
  perfect: () => ({ won: true, guesses: [0], GUESS_LIMIT: 8 }),
  requires: [['src/pages/PuckDetective.tsx', /GUESS_LIMIT/, 'reads the guess limit']],
});
row('guess-the-golfer', {
  site: ['src/pages/GuessTheGolfer.tsx'],
  zero: () => ({ dailyPhase: 'lost', score: 0 }),
  perfect: () => ({ dailyPhase: 'won', score: constOf('src/pages/GuessTheGolfer.tsx', 'BASE_SCORE') }),
});
row('clue-auction', {
  site: ['src/pages/ClueAuction.tsx'],
  zero: () => ({ phase: 'lost', bank: 0 }),
  perfect: null,
});
for (const [key, file, scores] of [
  ['missing-eleven', 'src/pages/MissingEleven.tsx', 'ELEVEN_SCORES'],
  ['missing-five', 'src/pages/MissingFive.tsx', 'FIVE_SCORES'],
  ['missing-nine', 'src/pages/MissingNine.tsx', 'NINE_SCORES'],
]) {
  const table = { ELEVEN_SCORES: L.ELEVEN_SCORES, FIVE_SCORES: L.FIVE_SCORES, NINE_SCORES: L.NINE_SCORES };
  row(key, {
    site: [file],
    zero: () => ({ won: false, misses: 3, ...table }),
    perfect: () => ({ won: true, misses: 0, ...table }),
    requires: [[file, new RegExp(`const score = won \\? ${scores}\\[`), 'scores only a won board']],
  });
}
row('missing-xi', {
  site: ['src/pages/MissingXi.tsx'],
  zero: () => ({ won: false, guessesUsed: 3, scoreForGuess: L.missingXi.scoreForGuess }),
  perfect: () => ({ won: true, guessesUsed: 1, scoreForGuess: L.missingXi.scoreForGuess }),
});
row('nfl-career', {
  site: ['src/hooks/useNFLCareer.ts'],
  zero: () => ({ dailyDone: true, dailyFinish: { score: 0 } }),
  perfect: () => ({ dailyDone: true, dailyFinish: { score: 6 } }),
  requires: [['src/hooks/useNFLCareer.ts', /status === 'won' \? Math\.max\(1, TOTAL_CLUES \+ 1 - cluesRevealed\) : 0/, 'pays a lost or given up daily 0']],
});
row('shirt-number', {
  site: ['src/hooks/useShirtNumber.ts'],
  zero: () => ({ score: 0 }),
  perfect: () => ({ score: constOf('src/hooks/useShirtNumber.ts', 'SCORES')[0] }),
  requires: [['src/hooks/useShirtNumber.ts', /if \(status !== 'won'\) return 0;/, 'pays a lost daily 0']],
});
row('score-predictor', {
  site: ['src/hooks/useScorePredictor.ts'],
  zero: () => [{ score: L.predictor.calcScore(0, 3, 2, 0) }, { score: L.predictor.calcScore(3, 0, 0, 2) }],
  perfect: () => ({ score: L.predictor.calcScore(2, 1, 2, 1) }),
  requires: [['src/hooks/useScorePredictor.ts', /const s = calcScore\(home, away,/, 'scores a prediction with calcScore']],
});
row('grade-transfer', {
  site: ['src/hooks/useGradeTransfer.ts'],
  zero: () => ({ scoreFor: L.grade.scoreFor, rounds: range(5).map(() => ({ userGrade: 'A', tc: { actualGrade: 'F' } })) }),
  perfect: () => ({ scoreFor: L.grade.scoreFor, rounds: range(5).map(() => ({ userGrade: 'B', tc: { actualGrade: 'B' } })) }),
});

/* Counts of right answers. */
row('champ-or-not', {
  site: ['src/hooks/useChampOrNot.ts'],
  zero: () => ({ dailyAnswers: range(L.CHAMP_ROUNDS).map(() => false) }),
  perfect: () => ({ dailyAnswers: range(L.CHAMP_ROUNDS).map(() => true) }),
});
row('whod-they-beat', {
  site: ['src/hooks/useWhodTheyBeat.ts'],
  zero: () => ({ dailyAnswers: range(6).map(() => false) }),
  perfect: () => ({ dailyAnswers: range(6).map(() => true) }),
});
row('silverware-sort', {
  site: ['src/hooks/useSilverwareSort.ts'],
  /* A derangement on both attempts leaves no slot right. */
  zero: () => ({ dailyResults: range(3).map(() => ({ s: 0 })) }),
  perfect: null,
  requires: [['src/hooks/useSilverwareSort.ts', /s: greens\.filter\(Boolean\)\.length/, 'counts the right slots']],
});
for (const [key, file] of [
  ['college-grid', 'src/hooks/useCollegeGrid.ts'], ['football-grid', 'src/hooks/useFootballGrid.ts'], ['soccer-grid', 'src/hooks/useSoccerGrid.ts'],
]) {
  row(key, { site: [file], zero: () => ({ correctCount: 0 }), perfect: () => ({ correctCount: 9 }) });
}
for (const [key, file] of [
  ['cbb-grid', 'src/pages/CbbGrid.tsx'], ['hockey-grid', 'src/pages/HockeyGrid.tsx'],
  ['mlb-grid', 'src/pages/MlbGrid.tsx'], ['nba-grid', 'src/pages/NbaGrid.tsx'],
]) {
  row(key, { site: [file], zero: () => ({ dailyFilled: 0 }), perfect: () => ({ dailyFilled: 9 }) });
}
row('football-timeline', {
  site: ['src/hooks/useFootballTimeline.ts'],
  zero: () => ({ score: 0 }),
  perfect: () => ({ score: 5 }),
  requires: [['src/hooks/useFootballTimeline.ts', /p\.name === correctOrder\[i\]\.name \? acc \+ 1 : acc/, 'counts the players in their right place']],
});
row('rank-em', {
  site: ['src/pages/RankEm.tsx'],
  zero: () => ({ correctCount: 0, RANK_POINTS_PER_SLOT: L.RANK_POINTS_PER_SLOT }),
  perfect: () => ({ correctCount: 5, RANK_POINTS_PER_SLOT: L.RANK_POINTS_PER_SLOT }),
});
row('emoji-guess', {
  site: ['src/hooks/useEmojiGuess.ts'],
  zero: () => ({ rounds: range(constOf('src/hooks/useEmojiGuess.ts', 'ROUNDS')).map(() => ({ points: 0 })) }),
  perfect: () => ({ rounds: range(constOf('src/hooks/useEmojiGuess.ts', 'ROUNDS')).map(() => ({ points: constOf('src/hooks/useEmojiGuess.ts', 'POINTS')[0] })) }),
  requires: [['src/hooks/useEmojiGuess.ts', /points: solved \? POINTS\[solvedAt\] \?\? 30 : 0/, 'pays an unsolved round 0']],
});
row('face-off', {
  site: ['src/hooks/useFaceOff.ts', "'face-off'"],
  zero: () => ({ t: L.faceOff.totals(range(L.faceOff.ROUNDS).map(() => ({ you: L.faceOff.pointsFor(false, 3), rival: 0 }))) }),
  perfect: () => ({ t: L.faceOff.totals(range(L.faceOff.ROUNDS).map(() => ({ you: L.faceOff.pointsFor(true, 0), rival: 0 }))) }),
});
row('jeopardy', {
  site: ['src/hooks/useQuizBoard.ts'],
  zero: () => ({ score: -9000 }),
  perfect: null,
});
row('alphabet-sprint', { site: ['src/pages/AlphabetSprint.tsx'], zero: () => ({ score: 0 }), perfect: null,
  requires: [['src/pages/AlphabetSprint.tsx', /const \[score, setScore\] = useState\(0\);/, 'starts a sprint on 0']] });
row('world-xi', { site: ['src/pages/WorldXi.tsx'], zero: () => ({ filled: range(11).map(() => null) }), perfect: () => ({ filled: range(11).map(() => ({})) }) });
row('higher-lower', { site: ['src/hooks/useHigherLower.ts'], zero: () => ({ streak: 0 }), perfect: null });
row('nba-chain', { site: ['src/hooks/useNbaChain.ts'], zero: () => ({ score: ['the start'].length - 1 }), perfect: null,
  requires: [['src/hooks/useNbaChain.ts', /const score = chain\.length - 1;/, 'scores the links after the starting player']] });
row('teammates', { site: ['src/hooks/useTeammates.ts'], zero: () => ({ score: 0 }), perfect: null });
for (const [key, file] of [
  ['nascar-chain', 'src/hooks/useNascarChain.ts'], ['tennis-chain', 'src/hooks/useTennisChain.ts'], ['ufc-chain', 'src/hooks/useUfcChain.ts'],
]) {
  row(key, { site: [file], zero: () => ({ gameState: { score: 0 } }), perfect: null,
    requires: [[file, /score: 0,/, 'starts a chain on 0']] });
}
row('buzzer-beater', { site: ['src/components/buzzer-beater/BuzzerBeaterBoard.tsx'], zero: () => ({ score: 0 }), perfect: null,
  requires: [['src/components/buzzer-beater/BuzzerBeaterBoard.tsx', /setScore\(s => s \+ r\.points\)/, 'adds only a shot\'s own points']] });
row('free-kick', { site: ['src/components/free-kick/FreeKickBoard.tsx'], zero: () => ({ score: 0 }), perfect: null,
  requires: [['src/components/free-kick/FreeKickBoard.tsx', /setScore\(s => s \+ r\.points\)/, 'adds only a kick\'s own points']] });
row('minefield', {
  site: ['src/pages/Minefield.tsx'],
  zero: () => ({ score: 0 }),
  perfect: () => ({ score: L.minefield.maxRunScore(L.minefield.buildRun(20260928)) }),
  requires: [['src/pages/Minefield.tsx', /setScore\(s => s \+ CLEAR_BONUS\)/, 'pays only cleared boards and finds']],
});
row('sports-bingo', {
  site: ['src/pages/SportsBingo.tsx'],
  zero: () => ({ scoreGame: L.bingo.scoreGame, marked: range(L.bingo.CARD_SIZE).map(i => i === L.bingo.FREE_INDEX) }),
  perfect: () => ({ scoreGame: L.bingo.scoreGame, marked: range(L.bingo.CARD_SIZE).map(() => true) }),
});
row('sports-millionaire', {
  site: ['src/pages/SportsMillionaire.tsx'],
  zero: () => ({ finalAmount: L.millionaire.safeHavenAmount(-1) }),
  perfect: () => ({ finalAmount: L.millionaire.MONEY_LADDER[L.millionaire.MONEY_LADDER.length - 1] }),
});
row('nba-stat-line', {
  site: ['src/pages/NbaStatLine.tsx'],
  zero: () => {
    const target = { pts: 30, trb: 12, ast: 10, stl: 2, blk: 2, split: 'FG', splitPct: 55 };
    const far = { minutes: 36, pts: 5, trb: 1, ast: 0, stl: 0, blk: 0, splitMakes: 0, splitAtts: 10, splitPct: 20 };
    return { result: L.statLine.scoreCombined(target, far) };
  },
  perfect: () => {
    const target = { pts: 30, trb: 12, ast: 10, stl: 2, blk: 2, split: 'FG', splitPct: 55 };
    const exact = { minutes: 36, pts: 30, trb: 12, ast: 10, stl: 2, blk: 2, splitMakes: 11, splitAtts: 20, splitPct: 55 };
    return { result: L.statLine.scoreCombined(target, exact) };
  },
});
row('player-stock-market', {
  site: ['src/pages/PlayerStockMarket.tsx'],
  zero: () => {
    const campaign = stockCampaign();
    return { finish: L.stock.scoreCampaign(campaign, L.stock.worstAffordableXI(campaign)) };
  },
  perfect: () => {
    const campaign = stockCampaign();
    return { finish: L.stock.scoreCampaign(campaign, L.stock.bestAffordableXI(campaign)) };
  },
});
function stockCampaign() {
  const rng = mulberry(645);
  const slots = range(11).map(i => ({ candidates: range(4).map(k => ({ name: `S${i}-${k}`, price: 2 + Math.floor(rng() * 20), final: Math.floor(rng() * 40) })) }));
  return { slots, budget: 200, startYear: 2020, finalYear: 2025 };
}
row('rarity-round', {
  site: ['src/pages/RarityRound.tsx'],
  zero: () => ({ rankedRun: true, recordedScore: L.rarity.recordedRunScore(range(5).map(() => ({ points: L.rarity.scoreRound(1, 40, 'rarity') })), 'rarity') }),
  perfect: () => ({ rankedRun: true, recordedScore: L.rarity.recordedRunScore(range(5).map(() => ({ points: L.rarity.scoreRound(40, 40, 'rarity') })), 'rarity') }),
  requires: [['src/pages/RarityRound.tsx', /const recordedScore = useMemo\(\(\) => recordedRunScore\(results, rarityMode\)/, 'records recordedRunScore']],
});
row('higher-lower-transfers', { site: ['src/pages/HigherLowerTransfers.tsx', null, 'completionScore'], zero: () => ({ streak: 0 }), perfect: null });
row('list-quiz', { site: ['src/pages/ListQuiz.tsx', null, 'completionScore'], zero: () => ({ found: range(10).map(() => false) }), perfect: null });
row('player-bingo', {
  site: ['src/pages/PlayerBingo.tsx', null, 'completionScore'],
  zero: () => ({ linesCompleted: 0, blackout: false }),
  perfect: null,
});

/* Connect four: a finish needs four correct names in a line, so a run with no
   correct answer never records; a loss or a daily with no winner records 0. */
row('football-connect-4', { site: ['src/hooks/useFootballConnect4.ts'], zero: () => ({ winner: null }), perfect: () => ({ winner: 'blue' }) });
for (const [key, file] of [
  ['mlb-connect-4', 'src/hooks/useMlbConnect4.ts'], ['nba-connect-4', 'src/hooks/useNbaConnect4.ts'],
  ['nfl-connect-4', 'src/hooks/useNflConnect4.ts'], ['nhl-connect-4', 'src/hooks/useNhlConnect4.ts'],
]) {
  row(key, {
    site: [file],
    zero: () => ({ phase: 'playing', recorded: false }),
    perfect: () => ({ phase: 'won' }),
    gatedZero: [file, /useGameCompletion\('[a-z0-9-]+', phase === 'won' \|\| phase === 'draw',/, 'records only a won or drawn board'],
  });
}

/* The front offices and dynasties record only a title (Round 647 is their
   per season ledger); zero skill wins nothing and never records. */
for (const [key, file, flag] of [
  ['front-office', 'src/components/front-office/FrontOfficeBoard.tsx', 'wonTitleNow'],
  ['mlb-front-office', 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', 'wonNow'],
  ['nba-front-office', 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx', 'wonNow'],
  ['nhl-front-office', 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', 'wonNow'],
  ['cbb-dynasty', 'src/components/cbb-dynasty/CbbDynastyBoard.tsx', 'wonNow'],
  ['cfb-dynasty', 'src/components/cfb-dynasty/CfbDynastyBoard.tsx', 'wonNow'],
]) {
  row(key, {
    site: [file],
    zero: () => ({ titles: 0, seasonsPlayed: 0, st: { myTitles: 0, seasonsPlayed: 0 }, recorded: false }),
    perfect: null,
    gatedZero: [file, new RegExp(`useGameCompletion\\('${key}', ${flag},`), 'records only a title season'],
  });
}

/* The career sims: retiring before a season records nothing earned. */
row('nfl-my-career', { site: ['src/components/nfl-my-career/NflMyCareerBoard.tsx'], zero: () => ({ career: bareCareer('QB'), legacyOf: L.nflCareer.legacyOf }), perfect: null });
row('nba-my-career', { site: ['src/components/nba-my-career/NbaMyCareerBoard.tsx'], zero: () => ({ career: bareCareer('PG'), nbaLegacyOf: L.nbaCareer.nbaLegacyOf }), perfect: null });
row('mlb-my-career', { site: ['src/components/mlb-my-career/MlbMyCareerBoard.tsx'], zero: () => ({ career: bareCareer('SP'), mlbLegacyOf: L.mlbCareer.mlbLegacyOf }), perfect: null });
row('nhl-my-career', { site: ['src/components/nhl-my-career/NhlMyCareerBoard.tsx'], zero: () => ({ career: bareCareer('C'), nhlLegacyOf: L.nhlCareer.nhlLegacyOf }), perfect: null });
function bareCareer(pos) {
  return { pos, seasons: [], rings: 0, mvps: 0, allPros: 0, finalsMvps: 0, allNbas: 0, mvpCys: 0, allStars: 0, cups: 0, harts: 0, connSmythes: 0, earnings: 0, draftPick: 1 };
}
row('soccer-career', {
  site: ['src/pages/SoccerCareer.tsx'],
  zero: () => range(6).map(i => {
    const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
    let s = L.soccer.initCareer(`Kid ${i}`, ['England', 'Brazil', 'Japan'][i % 3], ['ST', 'CM', 'CB'][i % 3], '2020s', stats(55), 55, 2020, L.soccer.FALLBACK_CLUBS, null, 80);
    s = L.soccer.manualRetire(s);
    return { isRetired: true, career: s };
  }),
  perfect: () => ({ isRetired: true, career: { legacy: { score: 100 } } }),
  requires: [['src/lib/soccerCareerEngine.ts', /score = Math\.round\(clamp\(score, 0, 100\)\);/, 'scales a legacy to 100 at most']],
});
row('fight-career', {
  site: ['src/components/fight-career/FightCareerBoard.tsx'],
  zero: () => {
    const fighter = { wins: 0, losses: 3, draws: 0, kos: 0, damage: 40, age: 30 };
    const history = range(3).map(() => ({ result: 'L', title: false, oppRating: 60, myRating: 50, method: 'UD' }));
    return { legacy: L.fightCareer.legacyOf({ fighter, history, titleDefences: 0, earnings: 0.1 }) };
  },
  perfect: () => ({ legacy: { score: 100 } }),
  requires: [['src/lib/fightCareer.ts', /0, 100,\s*\);\s*const \{ tier, hof \} = legacyTier\(score\);/, 'clamps a legacy to 100']],
});
row('fight-gym', {
  site: ['src/components/fight-gym/FightGymBoard.tsx'],
  zero: () => range(20).map(i => {
    let g = L.gym.newGym('Idle', `idle-${i}`);
    for (let w = 0; w < 2000 && !g.closed; w++) g = L.gym.advanceWeek(g);
    return { verdict: L.gym.gymVerdict(g) };
  }).concat(range(20).map(i => {
    /* The churn: never book a fight, release everyone, sign and release the
       cheapest prospect every week. It paid 17 of 100 before this round. */
    let g = L.gym.newGym('Churn', `churn-${i}`);
    for (let w = 0; w < 2000 && !g.closed; w++) {
      for (const f of g.roster.slice()) g = L.gym.releaseFighter(g, f.id) ?? g;
      const cheap = [...g.prospects].sort((a, b) => a.fee - b.fee)[0];
      const signed = cheap ? L.gym.signProspect(g, cheap.id) : null;
      g = signed ?? L.gym.advanceWeek(g);
    }
    return { verdict: L.gym.gymVerdict(g) };
  })),
  perfect: () => ({ verdict: { score: 100 } }),
});
row('fight-promoter', {
  site: ['src/components/fight-promoter/FightPromoterBoard.tsx'],
  zero: () => range(20).map(i => ({ verdict: L.promoter.promoterVerdict({ ...L.promoter.newPromoter('Nobody', `p-${i}`), history: [], money: -0.2, reputation: 2, closed: true }) })),
  perfect: () => ({ verdict: { score: 100 } }),
});
row('club-manager', {
  site: ['src/hooks/useClubManager.ts', "'/club-manager'"],
  zero: () => ({ currentSeasonScore: () => L.ledger.seasonLedgerScore({
    inTable: true, leaguePts: 0, leaguePlayed: 38, leagueRounds: 38, wonLeague: false, cupRank: 0, euroRank: 0,
    objectivesDone: [], seasonDone: true, handover: null, legacyStart: null, calendarLength: 50, legacyLog: null,
  }), career: null, sm: { seasonScore: 0 } }),
  perfect: () => ({ currentSeasonScore: () => L.ledger.ledgerCeiling(), career: null, sm: { seasonScore: L.ledger.ledgerCeiling() } }),
  requires: [['src/lib/clubManager.ts', /export function currentSeasonScore\(career: CareerState\): number \{\s*return seasonLedgerScore\(seasonLedgerInputOf\(career\)\);/, 'scores a season through the ledger']],
});

/* Conquest: the calls are the skill, the favourite is the ride. A run that
   calls no game right, over every favourite. */
for (const [sportKey, gameKey] of [
  ['NFL_IMPERIALISM', 'NFL_CONQUEST_GAME'], ['NBA_IMPERIALISM', 'NBA_CONQUEST_GAME'], ['MLB_IMPERIALISM', 'MLB_CONQUEST_GAME'],
  ['NHL_IMPERIALISM', 'NHL_CONQUEST_GAME'], ['SOCCER_IMPERIALISM', 'SOCCER_CONQUEST_GAME'],
]) {
  row(null, {
    keyOf: () => L[gameKey].gameId,
    site: ['src/components/conquest/ImperialismBoardShared.tsx', 'game.gameId'],
    zero: () => {
      const sport = L[sportKey];
      return sport.teams.flatMap((t, ti) => range(4).map(s => {
        const rng = mulberry(ti * 131 + s * 7 + 1);
        let run = L.conquest.startRun(sport, t.id, rng);
        for (let guard = 0; !run.champion && guard < 300; guard++) {
          if (run.phase === 'recap') run = L.conquest.continueRun(sport, run, rng);
          if (run.phase === 'done') break;
          const f = L.conquest.featuredPairing(sport, run);
          const miss = sport.teams.find(x => !f || (x.id !== f[0] && x.id !== f[1])).id;
          run = L.conquest.playRound(sport, run, miss, rng);
        }
        return { score: L.conquest.runScore(run) };
      }));
    },
    perfect: () => ({ score: L.imp.perfectScore(L[sportKey]) }),
    requires: [['src/components/conquest/ImperialismBoardShared.tsx', /const score = run \? runScore\(run\) : 0;/, 'scores the run with runScore']],
  });
}

row('dart-draft', {
  site: ['src/pages/DartDraft.tsx'],
  zero: () => {
    const trialists = L.sd.FORMATIONS[0].slots.map(slot => L.dartMap.oceanTrialist(slot));
    return { series: { outcome: 'loss' }, finalScore: L.dart.finalScore, points: 0, userRating: L.dart.squadRating(trialists) };
  },
  perfect: () => ({ series: { outcome: 'win' }, finalScore: L.dart.finalScore, points: 11 * 55, userRating: 99 }),
  requires: [['src/lib/dartMap.ts', /if \(hit\.kind === 'ocean'\) return 0;/, 'pays an ocean throw 0']],
});

/* ---------------- the games this round rescaled ---------------- */

row('build-your-xi', {
  site: ['src/hooks/useLineupBuilder.ts'],
  zero: () => [
    { verdict: { rating: 'Sunday League 😂' }, buildXiPoints: L.verdicts.buildXiPoints },
    { verdict: { rating: 'Relegation Scrap 😬', judge: 'offline' }, buildXiPoints: L.verdicts.buildXiPoints },
    { verdict: { rating: 'Error' }, buildXiPoints: L.verdicts.buildXiPoints },
  ],
  perfect: () => ({ verdict: { rating: 'Treble Winners 🏆🏆🏆' }, buildXiPoints: L.verdicts.buildXiPoints }),
  before: s => (s.verdict ? 500 : 0),
});
row('nba-starting-5', {
  site: ['src/hooks/useNbaLineup.ts'],
  zero: () => [
    { verdict: { rating: 'Picked From the Stands 😂' }, startingFivePoints: L.verdicts.startingFivePoints },
    { verdict: { rating: 'All-Time Five 🏆', judge: 'offline' }, startingFivePoints: L.verdicts.startingFivePoints },
    { verdict: { rating: 'Error' }, startingFivePoints: L.verdicts.startingFivePoints },
  ],
  perfect: () => ({ verdict: { rating: 'GOAT Squad 🐐' }, startingFivePoints: L.verdicts.startingFivePoints }),
  before: s => (s.verdict ? 500 : 0),
});
row('ball-iq', {
  site: ['src/hooks/useBallIq.ts'],
  zero: () => ({ iq: L.iq.computeIq(iqBoard(false)), ballIqPoints: L.iq.ballIqPoints }),
  perfect: () => ({ iq: L.iq.computeIq(iqBoard(true)), ballIqPoints: L.iq.ballIqPoints }),
  before: s => s.iq * 10,
});
function iqBoard(right) {
  const values = [200, 200, 200, 400, 400, 400, 600, 600, 800, 800, 1000, 1000];
  return values.map((value, i) => ({ clue: { value, answer: `A${i}` }, options: [`A${i}`, `B${i}`], chosen: right ? `A${i}` : `B${i}` }));
}
row('hof-or-bust', {
  site: ['src/hooks/useHofOrBust.ts'],
  zero: () => dates.map(d => {
    const seed = L.hof.dateSeedOf(d);
    const p = L.hof.dailyHofPlayer(seed);
    const wrong = x => (x.verdict === 'hof' ? 'bust' : 'hof');
    /* The draw this round replaced dealt hofPlayers[seed % n], borderline
       players included, for the report's before column. */
    const was = L.hofPlayers[seed % L.hofPlayers.length];
    return { score: L.hof.hofVoteScore(p, wrong(p), 0), scoreBefore: L.hof.hofVoteScore(was, wrong(was), 0) };
  }),
  perfect: () => {
    const p = L.hof.dailyHofPlayer(L.hof.dateSeedOf(dates[0]));
    return { score: L.hof.hofVoteScore(p, p.verdict === 'bust' ? 'bust' : 'hof', 0) };
  },
  before: s => s.scoreBefore ?? s.score,
  requires: [
    ['src/hooks/useHofOrBust.ts', /const s = hofVoteScore\(player, v, hintsRevealed\);\s*setScore\(s\);/, 'scores a vote with hofVoteScore'],
    ['src/hooks/useHofOrBust.ts', /return dailyHofPlayer\(getDateSeed\(\)\);/, 'deals the daily through dailyHofPlayer'],
  ],
});
row('pack-battle', {
  site: ['src/pages/PackBattle.tsx'],
  zero: () => range(40).map(i => {
    const values = range(5).map(k => 5_000_000 + ((i * 7919 + k * 104729) % 90) * 1_000_000);
    return { packScore: L.pack.packScore, result: { calls: [false, null, null, null], bankedValue: values[0] } };
  }),
  perfect: () => ({ packScore: L.pack.packScore, result: { calls: [true, true, true, true], bankedValue: 60_000_000 } }),
  before: s => s.result.bankedValue,
});
row('mystery-box', {
  site: ['src/hooks/useMysteryBox.ts'],
  /* Binning every pack leaves eleven empty slots, each rated EMPTY_SLOT_RATING. */
  zero: () => ({ rating: L.box.EMPTY_SLOT_RATING, mysteryBoxPoints: L.box.mysteryBoxPoints }),
  perfect: () => ({ rating: L.sd.PLAYER_RATING_CEILING, mysteryBoxPoints: L.box.mysteryBoxPoints }),
  before: s => s.rating * 10,
  requires: [['src/hooks/useMysteryBox.ts', /squad\.map\(p => \(p \? playerRating\(p\) : EMPTY_SLOT_RATING\)\)/, 'rates an empty slot EMPTY_SLOT_RATING']],
});

/* Perfect Lineup: the worst and best eligible picks on dealt boards. */
function lineupBoard(cfg, seed, worst) {
  const slots = L.ple.rollLineup(cfg, seed);
  const used = new Set();
  const picks = [];
  for (const slot of slots) {
    const el = L.ple.eligiblePlayers(cfg, slot, used);
    const p = worst ? el[el.length - 1] : el[0];
    used.add(cfg.nameOf(p));
    picks.push(p);
  }
  return { config: cfg, slots, result: L.ple.simulate(cfg, picks), lineupPoints: L.ple.lineupPoints };
}
for (const cfgName of ['NBA_LINEUP_CONFIG', 'NHL_LINEUP_CONFIG', 'F1_LINEUP_CONFIG']) {
  row(null, {
    keyOf: () => L[cfgName].gameId,
    site: ['src/hooks/usePerfectLineupGeneric.ts', 'config.gameId'],
    zero: () => range(150).map(i => lineupBoard(L[cfgName], 20260000 + i * 37, true)),
    perfect: () => lineupBoard(L[cfgName], 20260101, false),
    before: s => s.result.rating,
  });
}
function classicBoard(seed, worst) {
  const slots = L.pl.rollLineup(seed);
  const used = new Set();
  const picks = [];
  for (const slot of slots) {
    const el = L.pl.eligiblePlayers(slot, used);
    const p = worst ? el[el.length - 1] : el[0];
    used.add(p.name);
    picks.push(p);
  }
  return { unbeatenPhase: 'picking', unbeatenRun: null, slots, result: L.pl.simulate(picks), classicLineupPoints: L.pl.classicLineupPoints };
}
row('perfect-lineup', {
  site: ['src/hooks/usePerfectLineup.ts'],
  zero: () => range(150).map(i => classicBoard(20260000 + i * 37, true)),
  perfect: () => classicBoard(20260101, false),
  before: s => s.result.rating,
});

/* Gauntlet: the weakest card in every pick of a dealt draft. */
function gauntletRuns(cfg, soccer, worst) {
  return range(120).map(i => {
    const draft = soccer ? L.gd.buildDraft(L.fallbackPlayers, 7919 * (i + 1)) : L.ge.buildDraft(cfg, 7919 * (i + 1));
    const rating = p => (soccer ? L.sd.playerRating(p) : cfg.ratingOf(p));
    const squad = draft.picks.map(p => [...p.choices].sort((a, b) => (worst ? rating(a) - rating(b) : rating(b) - rating(a)))[0]);
    const run = soccer ? L.gd.runGauntlet(squad) : L.ge.runGauntlet(cfg, squad);
    return { run, dealt: draft, config: cfg, gauntletPoints: soccer ? L.gd.gauntletPoints : L.ge.gauntletPoints };
  });
}
for (const [cfgName, key] of [['NBA_GAUNTLET_CONFIG', 'nba-gauntlet-draft'], ['NFL_GAUNTLET_CONFIG', 'nfl-gauntlet-draft'], ['MLB_GAUNTLET_CONFIG', 'mlb-gauntlet-draft']]) {
  row(key, {
    site: ['src/components/gauntlet/GauntletBoard.tsx', 'config.gameId'],
    zero: () => gauntletRuns(L[cfgName], false, true),
    perfect: () => ({ ...gauntletRuns(L[cfgName], false, false)[0], run: { score: 100, champion: true } }),
    before: s => s.run.score,
  });
}
row('gauntlet-draft', {
  site: ['src/pages/GauntletDraft.tsx'],
  zero: () => gauntletRuns(null, true, true),
  perfect: () => ({ ...gauntletRuns(null, true, false)[0], run: { score: 100, champion: true } }),
  before: s => s.run.score,
});

/* The duels: Search and Discard replays the deal with the worst keep every
   turn; Fantasy drafts the worst legal player every pick against the AI. */
function worstKeeperSeason(pool, seed) {
  let st = L.duel.newDuel(pool, seed);
  while (!L.duel.duelOver(st)) {
    const offer = L.duel.drawOffer(st);
    const k = st.turn === 0 ? L.duel.worstKeep(st, offer) : L.duel.cpuKeep(st, offer);
    st = L.duel.applyKeep(st, offer, k.keep, k.slotIndex);
  }
  return L.duel.settleSeason(st.squads[0], st.squads[1]);
}
row('search-and-discard', {
  site: ['src/pages/SearchAndDiscard.tsx'],
  zero: () => range(60).map(i => {
    const seed = 7717 * (i + 1);
    const played = worstKeeperSeason(L.fallbackPlayers, seed);
    return { zeroSeason: L.duel.zeroSkillDuel(L.fallbackPlayers, seed), duelScore: L.duel.duelScore, myPoints: played.points[0] };
  }),
  perfect: () => ({ zeroSeason: L.duel.zeroSkillDuel(L.fallbackPlayers, 7717), duelScore: L.duel.duelScore, myPoints: L.duel.SEASON_POINTS_MAX }),
  before: s => L.duel.seasonShare(s.myPoints),
});
function fantasyPool(seed) {
  const rng = mulberry(seed);
  const positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
  return range(200).map(i => ({ id: `f${i}`, name: `Draftee ${i}`, position: positions[i % positions.length], nationality: 'Nowhere', market_value_millions: 5 + Math.floor(rng() * 180), dominant_foot: 'Right', age: 19 + Math.floor(rng() * 16) }));
}
function fantasyZeroDraft(seed) {
  const pool = fantasyPool(seed);
  const rng = mulberry(seed + 1);
  const user = []; const ai = []; const taken = new Set();
  const rating = p => L.sd.playerRating(L.fantasy.fantasySettlePlayer(p));
  for (let pick = 0; pick < 22; pick++) {
    const available = pool.filter(p => !taken.has(p.id));
    if (pick % 2 === 0) {
      const legal = available.filter(p => L.fantasy.pickIsLegal(null, user, p));
      const from = legal.length ? legal : available;
      const worst = from.reduce((lo, p) => (rating(p) < rating(lo) ? p : lo));
      user.push(worst); taken.add(worst.id);
    } else {
      const top = [...available].sort((a, b) => b.market_value_millions - a.market_value_millions).slice(0, 6);
      const p = top[Math.floor(rng() * top.length)];
      ai.push(p); taken.add(p.id);
    }
  }
  return { pool, user, ai };
}
row('fantasy-draft', {
  site: ['src/pages/FantasyDraft.tsx', "'/fantasy-draft'"],
  zero: () => range(40).map(i => {
    const { pool, user, ai } = fantasyZeroDraft(900 + i);
    const toP = L.fantasy.fantasySettlePlayer;
    return {
      season: L.duel.settleSeason(user.map(toP), ai.map(toP)),
      zeroSeason: L.duel.settleSeason(L.fantasy.zeroSkillFantasyXi(pool, ai, null, 11).map(toP), ai.map(toP)),
      duelScore: L.duel.duelScore,
    };
  }),
  perfect: () => ({ season: { points: [L.duel.SEASON_POINTS_MAX, 0] }, zeroSeason: { points: [40, 60] }, duelScore: L.duel.duelScore }),
  before: s => L.duel.seasonShare(s.season.points[0]),
  requires: [['src/pages/FantasyDraft.tsx', /const zeroSeason = settleSeason\(zeroSkillFantasyXi\(players, aiTeam, ruleForCriteria\(criteria\), TEAM_SIZE\)/, 'plays the zero skill draft against the real AI team']],
});

/* Squad Deal: ten boxes dealt per slot, the worst box and the worst extra. */
function squadDealRun(era, seed, worst) {
  const pool = era === 'legends' ? L.sd.LEGENDS : L.fallbackPlayers;
  const formation = L.sd.FORMATIONS[seed % L.sd.FORMATIONS.length];
  const used = new Set();
  const dealt = [];
  const picks = [];
  const rate = p => L.sd.ratingFor(p, era);
  for (const slot of formation.slots) {
    const boxes = L.sd.buildCandidates(pool, slot, used, []);
    dealt.push(boxes);
    const p = [...boxes].sort((a, b) => (worst ? rate(a) - rate(b) : rate(b) - rate(a)))[0];
    used.add(p.name);
    picks.push(p);
  }
  const worth = e => e.ratingMod + e.chemMod * 0.18;
  const extras = L.sd.EXTRA_DEALS.map(c => [...c.options].sort((a, b) => (worst ? worth(a) - worth(b) : worth(b) - worth(a)))[0]);
  return { result: L.sd.simulateSquad(picks, extras, era), dealt, era, squadDealPoints: L.sd.squadDealPoints, Object };
}
row('squad-deal', {
  site: ['src/hooks/useSquadDeal.ts'],
  zero: () => range(60).map(i => squadDealRun(i % 2 ? 'legends' : 'current', i, true)).map(s => ({ ...s, dealt: { ...s.dealt } })),
  perfect: () => { const s = squadDealRun('current', 3, false); return { ...s, dealt: { ...s.dealt } }; },
  before: s => s.result.rating,
});

/* Budget Builder: the lowest rated XI the budget buys, over every demand. */
function budgetRun(criterion, worst) {
  const pool = L.fallbackPlayers;
  const formation = L.sd.FORMATIONS[0];
  const budget = L.budget.budgetFor(L.budget.moneyXiFor(pool, formation), 'today');
  const xi = L.budget.budgetXi(pool, formation, budget, worst);
  const rating = Math.round(xi.reduce((s, p) => s + L.sd.playerRating(p), 0) / xi.length);
  const left = budget - xi.reduce((s, p) => s + p.marketValue, 0);
  const series = worst ? L.dart.simulateSeries(xi, L.budget.moneyXiFor(pool, formation)) : { outcome: 'win' };
  const finalScore = L.budget.budgetScore(rating, left, criterion.check(xi, budget, left), series.outcome);
  return { finalScore, bounds: L.budget.budgetBounds(pool, formation, budget, criterion), budgetPoints: L.budget.budgetPoints };
}
row('budget-builder', {
  site: ['src/hooks/useBudgetBuilder.ts'],
  zero: () => L.budget.CRITERIA.flatMap(c => range(4).map(() => budgetRun(c, true))),
  perfect: () => budgetRun(L.budget.CRITERIA[0], false),
  before: s => s.finalScore,
});

/* Sign the Player: a bidder who never raises a paddle. */
function auctionRoom(seed) {
  /* The legends theme builds its room from the repo's own legends, no database. */
  const rng = mulberry(seed);
  const saved = Math.random;
  Math.random = rng;
  try {
    return L.auction.buildAuctionPool('legends');
  } finally {
    Math.random = saved;
  }
}
async function signThePlayerRows() {
  const rooms = [];
  for (let i = 0; i < 30; i++) rooms.push(await auctionRoom(500 + i));
  return rooms;
}
const AUCTION_ROOMS = await signThePlayerRows();
function sitOut(room, seed) {
  const { lots, weakFills } = L.auction.orderLots(room, mulberry(seed));
  let bidders = L.auction.createBidders();
  /* The two rivals take every lot at list price, alternating; you take none. */
  lots.forEach((l, i) => {
    const rival = bidders.filter(b => b.id !== 'you')[i % 2];
    if (rival.squad[l.player.slotKey] === null && rival.budget >= l.player.basePrice) bidders = L.auction.applySale(bidders, l.player, rival.id, l.player.basePrice);
  });
  const filled = L.auction.fillOpenChairs(bidders, weakFills);
  const you = filled.find(b => b.id === 'you');
  const result = L.auction.simulateShowdown(filled);
  return { result, you, bounds: L.auction.auctionBounds([...weakFills, ...lots.map(l => l.player)]) };
}
row('sign-the-player', {
  site: ['src/pages/SignThePlayer.tsx'],
  zero: () => AUCTION_ROOMS.filter(Boolean).map((room, i) => {
    const s = sitOut(room, 900 + i);
    return { result: s.result, auctionScore: L.auction.auctionScore, you: s.you, auctionBounds: () => s.bounds, weakFills: [], lots: [] };
  }),
  perfect: () => {
    const room = AUCTION_ROOMS.find(Boolean);
    const bounds = L.auction.auctionBounds(room);
    const you = { id: 'you', name: 'You', budget: 1000, squad: {} };
    for (const slot of L.auction.AUCTION_SLOTS) {
      you.squad[slot.key] = room.filter(p => p.slotKey === slot.key).sort((a, b) => b.rating - a.rating)[0];
    }
    const result = { table: [{ bidderId: 'you', moneyLeft: 0 }, { bidderId: 'sheikh', moneyLeft: 0 }, { bidderId: 'mike', moneyLeft: 0 }] };
    return { result, auctionScore: L.auction.auctionScore, you, auctionBounds: () => bounds, weakFills: [], lots: [] };
  },
  before: s => {
    const place = s.result.table.findIndex(r => r.bidderId === 'you');
    const placeBonus = place === 0 ? 300 : place === 1 ? 150 : 50;
    return placeBonus + L.auction.squadRatingOf(s.you) * 3 + Math.round(s.result.table[place].moneyLeft / 10);
  },
});

/* Rebuild: change nothing. */
function rebuildRun(seed) {
  const pool = L.fallbackPlayers;
  const club = pool[seed % pool.length].club;
  const squad = pool.filter(p => p.club === club);
  const padded = squad.length >= 11 ? squad : squad.concat(pool.filter(p => p.club !== club).slice(seed % 50, seed % 50 + 11 - squad.length));
  const setup = { club: { club, squadSize: padded.length, squadValueM: padded.reduce((s, p) => s + p.marketValue, 0), tier: 'mid' }, clubs: [], squad: padded, market: pool, preset: 'none', seed: 1000 + seed };
  return L.rebuild.createRun(setup);
}
row('rebuild', {
  site: ['src/hooks/useRebuild.ts'],
  zero: () => range(20).map(i => ({ scored: rebuildRun(i * 13), loop: { rebuildPoints: L.rebuild.rebuildPoints } })),
  perfect: () => {
    const run = rebuildRun(7);
    const star = { name: 'Star', club: 'X', nationality: 'X', league: 'X', goals: 0, assists: 0, position: 'ST', kitNumber: 0, age: 22, marketValue: 2000, difficulty: 'easy' };
    const scored = { ...run, manager: { ...L.rebuildDeck.KEEP_MANAGER, profile: 'youth', lift: 3 }, reckoning: { xi: range(11).map(k => ({ ...star, name: `Star ${k}` })), ratingPen: 0, notes: [], funds: 0, windowFunds: 0 } };
    return { scored, loop: { rebuildPoints: L.rebuild.rebuildPoints } };
  },
  before: s => L.rebuild.ratingOf(s.scored) * 10,
});

/* Perfect Season: spin squads, take the worst player a slot can use. */
function spunSquad(rng, slots) {
  return {
    squadId: `sq${Math.floor(rng() * 1e9)}`, teamName: 'Spun', year: 2000,
    players: range(14).map(k => ({ playerId: `p${k}`, name: `Player ${Math.floor(rng() * 1e9)}`, rating: 40 + Math.floor(rng() * 60), eligible: [slots[Math.floor(rng() * slots.length)].key, slots[Math.floor(rng() * slots.length)].key], detail: '' })),
  };
}
function zeroSeason(sport, i) {
  const slots = L[`${sport.toUpperCase()}_SLOTS`];
  const games = L[`${sport.toUpperCase()}_GAMES`];
  const rng = mulberry(4000 + i);
  const picks = Object.fromEntries(slots.map(s => [s.key, null]));
  const floor = Object.fromEntries(slots.map(s => [s.key, null]));
  const used = new Set();
  for (let guard = 0; guard < 400 && Object.values(picks).some(p => p === null); guard++) {
    const open = slots.map(s => s.key).filter(k => !picks[k]);
    const squad = spunSquad(rng, slots);
    if (!L.ps.squadFillsAny(squad, open, used)) continue;
    const fits = squad.players.filter(p => !used.has(p.name) && p.eligible.some(e => open.includes(e)));
    const p = fits.reduce((lo, x) => (x.rating < lo.rating ? x : lo));
    const slotKey = p.eligible.find(e => open.includes(e));
    floor[slotKey] = L.ps.worstFitFor(squad, slotKey, used);
    picks[slotKey] = p;
    used.add(p.name);
  }
  const overall = L.ps.teamOverall(slots, picks);
  const fair = sport === 'nba' || sport === 'nfl';
  const sim = fair ? L.psx.simulateSeasonFair(sport, overall, games, 77 + i) : L.ps.simulateSeason(overall, games, 77 + i);
  const zeroSkillWins = fair ? L.psx.fairExpectedWins(sport, L.ps.teamOverall(slots, floor), games) : L.ps.coreExpectedWins(L.ps.teamOverall(slots, floor), games);
  return { sim, zeroSkillWins, perfectSeasonPoints: L.ps.perfectSeasonPoints, [`${sport.toUpperCase()}_GAMES`]: games };
}
for (const sport of ['nba', 'nfl', 'mlb', 'nhl']) {
  row(`perfect-season-${sport}`, {
    site: [`src/pages/PerfectSeason${sport[0].toUpperCase()}${sport.slice(1)}.tsx`],
    zero: () => range(150).map(i => zeroSeason(sport, i)),
    perfect: () => { const s = zeroSeason(sport, 0); const games = L[`${sport.toUpperCase()}_GAMES`]; return { ...s, sim: { wins: games } }; },
    before: s => s.sim.wins,
  });
}

/* ---------------- section 1: the table ---------------- */

console.log('1) zero skill against perfect, one row per game, through the real scorer');
const red = new Set();
const measured = [];
for (const r of ROWS) {
  const key = r.key ?? r.keyOf();
  r.key = key;
  const [file, slugArg, kind] = r.site;
  let zero;
  let perfect = null;
  let before = null;
  let zeroBefore = null;
  try {
    for (const [f, re, what] of r.requires ?? []) requireCode(f, re, what);
    if (r.gatedZero) requireCode(r.gatedZero[0], r.gatedZero[1], r.gatedZero[2]);
    const exprs = kind === 'completionScore'
      ? [...new Set(recordersIn(file).filter(x => x.kind === 'completionScore').map(x => x.scoreExpr))].map(e => resolveLocal(file, e))
      : sitesFor(file, key, slugArg);
    /* More than one recorder for a game: the zero is the worst of them and the
       perfect the best, so no one of them can hide behind another. */
    const valueOf = s => Math.max(...exprs.map(expr => Number(evaluate(expr, s))));
    const zs = [].concat(r.zero());
    zero = r.gatedZero ? 0 : mean(zs.map(valueOf));
    /* What the replaced formula paid the same zero skill runs, for the report. */
    if (r.before) zeroBefore = mean(zs.map(s => Number(r.before(s))));
    if (r.perfect) {
      const ps = r.perfect();
      perfect = valueOf(ps);
      if (r.before) before = Number(r.before(ps));
    }
    if (!Number.isFinite(zero)) throw new Error(`the zero skill run evaluates to ${zero}`);
  } catch (e) {
    fail(`${key}: ${e.message}`);
    red.add(key);
    continue;
  }
  const share = perfect ? zero / perfect : zero === 0 ? 0 : Infinity;
  measured.push({ key, zero, perfect, before, zeroBefore, share });
  const tooMuch = perfect === null ? zero !== 0 : share > ZERO_SHARE_LIMIT;
  if (tooMuch) {
    fail(`${key}: zero skill records ${zero.toFixed(1)}${perfect === null ? ' where nothing but 0 is allowed' : ` of a perfect ${perfect}, ${(share * 100).toFixed(1)} percent (limit ${ZERO_SHARE_LIMIT * 100})`}`);
    red.add(key);
  }
  if (perfect !== null && !(perfect > 0)) { fail(`${key}: the perfect run records ${perfect}`); red.add(key); }
  if (before !== null && perfect !== before) { fail(`${key}: the perfect run records ${perfect}, the formula this round replaced recorded ${before} for it`); red.add(key); }
}
const pad = (s, n) => String(s).padEnd(n);
console.log(`   ${pad('game', 30)}${pad('zero skill', 12)}${pad('perfect', 12)}${pad('share', 9)}${pad('perfect before', 16)}zero skill before`);
for (const m of measured) {
  const was = m.zeroBefore === null ? '' : `${m.zeroBefore.toFixed(1)} (${m.perfect ? ((100 * m.zeroBefore) / m.perfect).toFixed(1) : '-'}%)`;
  console.log(`   ${pad(m.key, 30)}${pad(m.zero.toFixed(1), 12)}${pad(m.perfect ?? 'none', 12)}${pad(`${(m.share * 100).toFixed(1)}%`, 9)}${pad(m.before ?? '', 16)}${was}`);
}
console.log(`   ${measured.length} rows measured, ${ROWS.length - measured.length} could not be`);

/* ---------------- section 2: coverage ---------------- */

console.log('2) every recorder that records a score has a row, and every row a recorder');
{
  const files = [];
  const walk = d => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(rel);
    }
  };
  walk('src');
  const rowKeys = new Set(ROWS.map(r => r.key));
  const multi = new Map([
    ['config.gameId', [...ROWS.filter(r => r.site[1] === 'config.gameId').map(r => r.key)]],
    ['game.gameId', [...ROWS.filter(r => r.site[1] === 'game.gameId').map(r => r.key)]],
  ]);
  const siteKeys = new Set();
  let scoreless = 0;
  for (const rel of files) {
    if (rel === 'src/hooks/useGameCompletion.ts' || rel === 'src/components/game/ResultScreen.tsx') continue;
    for (const rec of recordersIn(rel)) {
      if (rec.scoreExpr === undefined || rec.scoreExpr === 'undefined') { scoreless += 1; continue; }
      let keys = [];
      if (rec.kind === 'completionScore') {
        const gp = code(rel).match(/gamePath:\s*['"]\/([a-z0-9-]+)['"]/);
        keys = gp ? [gp[1]] : [];
      } else if (multi.has(rec.slugArg)) keys = multi.get(rec.slugArg);
      else {
        const k = slugOf(rel, rec.slugArg);
        keys = k ? [k] : [];
      }
      if (keys.length === 0) { fail(`${rel}: a recorder whose game this harness cannot name (${rec.slugArg})`); continue; }
      /* A mode ternary recording undefined for one branch still records a
         score for the other, so it counts. */
      for (const k of keys) {
        siteKeys.add(k);
        if (!rowKeys.has(k)) fail(`${k} (${rel}) records a score and has no row here`);
      }
    }
  }
  for (const k of rowKeys) if (!siteKeys.has(k)) fail(`the row for ${k} names a game no recorder in src records any more`);
  console.log(`   ${siteKeys.size} games record a score, ${rowKeys.size} rows, ${scoreless} recorders record a play with no score`);
}

/* ---------------- section 3: the judges' labels ---------------- */

console.log("3) every label a lineup judge can give is on a ladder");
{
  const key = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const onLadder = (label, ladder) => ladder.some(l => key(l) === key(label));
  /* The verdict list lines, not the JSON field lines (`- "rating": ...`). */
  const promptLabels = rel => [...readLF(rel).matchAll(/^- "([^"]+)"(?!:)/gm)].map(m => m[1]);
  const xiReferee = promptLabels('supabase/functions/evaluate-lineup/index.ts');
  const xiFallback = [...readLF('supabase/functions/evaluate-lineup/index.ts').matchAll(/rating = "([^"]+)"/g)].map(m => m[1]);
  const fiveReferee = promptLabels('supabase/functions/nba-evaluate-lineup/index.ts');
  const local = readLF('src/lib/localLineupEval.ts');
  const localSplit = local.split('/* ---------------- NBA: Starting 5 ---------------- */');
  const xiOffline = [...localSplit[0].matchAll(/rating: '([^']+)'/g)].map(m => m[1]);
  if (xiReferee.length < 5 || fiveReferee.length < 5 || xiOffline.length < 5 || xiFallback.length < 3) {
    fail(`the label read is broken: ${xiReferee.length} XI referee, ${xiFallback.length} XI fallback, ${fiveReferee.length} Starting 5 referee, ${xiOffline.length} XI offline labels`);
  }
  for (const l of [...xiReferee, ...xiFallback]) if (!onLadder(l, L.verdicts.XI_REFEREE_LADDER)) fail(`Build Your XI referee label "${l}" is on no ladder, so it records 0`);
  for (const l of xiOffline) if (!onLadder(l, L.verdicts.XI_OFFLINE_LADDER)) fail(`Build Your XI offline label "${l}" is on no ladder, so it records 0`);
  for (const l of fiveReferee) if (!onLadder(l, L.verdicts.FIVE_REFEREE_LADDER)) fail(`Starting 5 referee label "${l}" is on no ladder, so it records 0`);
  console.log(`   ${xiReferee.length + xiFallback.length} XI referee labels, ${xiOffline.length} XI offline labels, ${fiveReferee.length} Starting 5 referee labels checked`);
}

/* ---------------- the verdict ---------------- */

if (CONTROL) {
  const want = new Set(CONTROLS[CONTROL].rows);
  const extra = [...red].filter(k => !want.has(k));
  const missing = [...want].filter(k => !red.has(k));
  if (missing.length === 0 && extra.length === 0) {
    console.log(`\nsimFreePoints control ${CONTROL}: green. It turned ${[...want].join(', ')} red and nothing else.`);
    process.exit(0);
  }
  console.error(`\nsimFreePoints control ${CONTROL}: RED. ${missing.length ? `Did not turn ${missing.join(', ')} red. ` : ''}${extra.length ? `Also turned ${extra.join(', ')} red.` : ''}`);
  process.exit(1);
}
if (failures) {
  console.error(`\nsimFreePoints: ${failures} failure(s).`);
  process.exit(1);
}
console.log(`\nsimFreePoints: green. ${measured.length} games measured, none pays more than ${ZERO_SHARE_LIMIT * 100} percent of a perfect run for no skill, and every rescaled game's perfect run records what it always did.`);
