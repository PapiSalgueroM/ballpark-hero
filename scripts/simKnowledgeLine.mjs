/*
 * Round 678: points start past the knowledge line, and 100 is a play the
 * board really allows. docs/design/POINTS-ECONOMY-V2.md, rule 3 and section 7.
 *
 * WHAT THIS REPLACES, row by row. scripts/simFreePoints.mjs held each game's
 * zero skill run to 5 percent of its perfect run, but it bound its own zero
 * (R2.D2 in the spec's review): a row handed the scorer the zero it believed
 * in, so a recorder that paid something else stayed green. Here the engine's
 * own pointsFor is driven by the naive policies playing the game's own moves
 * (src/lib/naivePolicies.ts), and section 3 requires the recorder to send
 * exactly that. Each game round from 681 to 687 moves its games here, one row
 * each, as it puts them on the line.
 *
 * SECTIONS
 *   1) The families. Every completion key src can send (the shared scan in
 *      scripts/lib/completionKeys.mjs, handed comment stripped code, less the
 *      declared retirements) is filed in src/data/pointsFamilies.ts exactly
 *      once, in one family; every filed key is one src can send and has a
 *      game_score_caps row (scripts/data/gameScoreCaps.mjs), which the seed's
 *      foreign key needs. The committed seed, scripts/data/gameRulesSeed.sql,
 *      is what scripts/genGameRules.mjs generates now, AND every row of it,
 *      read back as SQL by scripts/lib/gameRulesRows.mjs (which never imports
 *      the generator), is the table's own (game, family, scale, pays, claim,
 *      round), both ways: a generator bug cannot check out against its own
 *      output. Each family's naive policy list, and each game's own, holds
 *      at least what spec sections 7.2 to 7.6 line it on (SPEC_POLICIES
 *      below). And the flagship, Soccer Career, is filed as holding Release
 *      G until it pays (section 7.6: it does not go for fun silently).
 *   2) The line. (a) Every paying game has a row in LINE_ROWS below and every
 *      row's game pays. (b) The runner plays each row over its boards (the
 *      365 dailies of 2026 for a static pool, or 400 seeded boards), on the
 *      policies the family table lists, and asserts, on EVERY board (section
 *      7.1 sets the line per board, so a pooled average hides a line set too
 *      low on half the days): every naive policy averages at most 5 of 100;
 *      a deterministic policy pays exactly 0 (on a board with chance, its
 *      expected result sits at or under the line); every points value is a
 *      whole number from 0 to 100; the oracle records exactly 100 (its
 *      expected result on a board with chance); no board is dealt without
 *      room; a choice daily with no chance is measured exactly, not sampled;
 *      and the game is measured on every policy its moves give something to
 *      read (a game that reveals answers on counter, one that prints numbers
 *      on biggestNumber, and so on). The 70 percent player averages at least
 *      15 over the boards (an exception is printed with the round that clears
 *      it). The runner is proved on every run on synthetic boards (PROBES):
 *      four that must pass (coin keys over 365 days, four options over twelve
 *      items walked exactly, a wide scale rating board where the one step
 *      under the top listed rating would still pay 5, and a board partly left
 *      to luck, valued in expectation) and nine that must be caught, each for
 *      its own reason. The formula and the policies are pinned by CASES:
 *      whole numbers, the line 0 of scale g, the floor at the best
 *      deterministic policy, the 70 percent player's exact average, the exact
 *      walk on four options, and what lifelineReader, biggestNumber and
 *      structureStacker read. (c) Scale g: every typed family game with a
 *      perfect run driver in scripts/lib/scoreCeilingTable.mjs records
 *      exactly 100 through pointsFromCeiling on its perfect runs, every run
 *      records its share of the ceiling on a line of 0, and no run records
 *      past its ceiling.
 *   3) The recorder sends the line. src is read through the TypeScript
 *      checker, on one program with tsconfig.app.json's own settings.
 *      (a) src/lib/knowledgeLine.brand.ts compiles clean, its takesDayPoints
 *      takes the brand, and at least two of its calls are refused by a
 *      @ts-expect-error written directly above the call in code (a mention in
 *      a comment elsewhere counts for nothing). (b) Day points are made in
 *      one place: the only cast to a type that carries the brand (under any
 *      name: an alias, PointsAnswer['points'], a local type naming the same
 *      brand) is inside knowledgeLine.ts's unexported mint; no expression of
 *      type any flows into day points in any file that can reach
 *      knowledgeLine.ts; nothing casts day points to any or unknown; and
 *      knowledgeLine.ts exports no maker of day points but dayPoints,
 *      pointsFromCeiling and pointsAnswer. A value laundered through a
 *      generic helper (identity<DayPoints>(x)) is not caught here. (c) For
 *      every row in LINE_ROWS, every recorder of its game, read as code with
 *      comments stripped, sends `pointsFor(...).points` (directly or through
 *      one local const) with pointsFor imported from the row's engine. The
 *      recorder read is proved on every run on synthetic call sites.
 *
 * AT ROUND 678 nothing pays yet (each game waits on its own round), so
 * LINE_ROWS is empty and 2(b) and 3(c) run on their probes and cases alone.
 *
 * NEGATIVE CONTROLS, KNOWLEDGE_LINE_CONTROL=<name>. Each writes one planted
 * copy of one file into this run's own temporary directory, refuses to run
 * unless its anchor occurs exactly once in that file's code (comments
 * stripped, line endings folded), proves the copy was read by the reader its
 * check uses (the key scan, the family bundle, the generator, the seed read,
 * the framework bundle, the ceiling bundle or the TypeScript program), and
 * must turn exactly its own section red:
 *   section1  unclassified  Ball IQ gains a recorder under a key the table
 *                           has never heard of
 *             commentkey    Ball IQ's only recorder is commented out, so the
 *                           key is filed and seeded while nothing sends it
 *             twofamilies   Footle is filed under choice as well as typed
 *             staleseed     the committed seed moves Ball IQ's claim
 *             seedpays      the generator writes true for pays on every row,
 *                           and the seed is regenerated with it
 *             seeddrop      the generator drops the never scored rows, and
 *                           the seed is regenerated with it
 *             familylist    counter leaves the choice family's list
 *             flagship      Soccer Career no longer holds Release G
 *   section2  unmeasured    Ball IQ pays with no row here
 *             counterblind  counter picks the answer revealed most
 *             ceilingoff    the grid ceiling sits one cell above a perfect grid
 *             lineonelow    lineFor returns one step under the line it found
 *             nofloor       lineFor loses its floor at the best
 *                           deterministic policy
 *             noround       dayPoints stops rounding
 *             ceilinghalf   pointsFromCeiling sets its line at half the ceiling
 *             k70oracle     the 70 percent player plays the oracle every move
 *             nomerge       the exact walk stops merging equal states
 *             luckyperfect  a board with chance takes its luckiest oracle
 *                           sample as perfect
 *             fallbacknumber, fallbackbonus, fallbackadvice
 *                           biggestNumber, structureStacker and
 *                           lifelineReader stop refusing a screen with
 *                           nothing to read
 *   section3  rawrecord     DayPoints loses its brand
 *             markeroff     a refused call stops being a takesDayPoints call,
 *                           its directive still in the text
 *             mint          62 cast to DayPoints outside knowledgeLine.ts
 *             mintany       an any handed to a DayPoints variable
 *             mintalias     a cast to DayPoints imported under another name
 *             mintindexed   a cast to PointsAnswer['points']
 *             mintredeclare a local type DayPoints naming the brand
 *             mintunbrand   day points cast to any and written over
 *             mintexport    knowledgeLine.ts exports mint
 *
 * Nothing here reads the database, dist or the clock. Every draw is seeded.
 *
 * Run: node scripts/simKnowledgeLine.mjs
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripComments, callsOf, resolveSlug, resolveExpr, srcFiles } from './lib/readSource.mjs';
import { sourceCompletionKeys, declaredRetirements } from './lib/completionKeys.mjs';
import { CEILINGS, PERFECT_RUNS, UNPLAYED, bundleCeilingModules, resolveCeiling } from './lib/scoreCeilingTable.mjs';
import { CAPS } from './data/gameScoreCaps.mjs';
import * as GEN from './lib/gameRulesSeed.mjs';
import { seedAgainstTable } from './lib/gameRulesRows.mjs';

const { loadFamilies, familyRows, md5, FAMILIES_FILE, SEED_FILE } = GEN;
const GEN_FILE = 'scripts/lib/gameRulesSeed.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.KNOWLEDGE_LINE_CONTROL || '';
const require = createRequire(path.join(ROOT, 'package.json'));
const { build } = require('esbuild');

let failures = 0;
const red = new Set();
const failIn = (section, m) => { failures += 1; red.add(section); console.error(`  FAIL: ${m}`); };
const relOf = p => path.relative(ROOT, p).split('\\').join('/');
const readLF = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n');

/* ---------------- the controls ---------------- */

/* `via` is the reader that must take the planted copy for the control to
   prove anything: keys, families, generator, seed, framework, ceilings or
   program. `reseed` regenerates the committed seed with the (possibly
   planted) generator, so only the check under test can see the damage. */
const HOWTO_ANCHOR = 'export function pointsOf(points: number): string {';
const CONTROLS = {
  unclassified: {
    section: 'section1', via: 'keys', file: 'src/hooks/useBallIq.ts',
    from: "useGameCompletion('ball-iq', finished, ballIqPoints(iq), correctCount);",
    to: "useGameCompletion('ball-iq', finished, ballIqPoints(iq), correctCount);\n  useGameCompletion('ball-iq-rapid', finished, ballIqPoints(iq), correctCount);",
  },
  commentkey: {
    section: 'section1', via: 'keys', file: 'src/hooks/useBallIq.ts',
    from: "useGameCompletion('ball-iq', finished, ballIqPoints(iq), correctCount);",
    to: "// useGameCompletion('ball-iq', finished, ballIqPoints(iq), correctCount);",
  },
  twofamilies: {
    section: 'section1', via: 'families', file: FAMILIES_FILE,
    from: "      'teammates': waits('deal', '687', LUCK),",
    to: "      'teammates': waits('deal', '687', LUCK),\n      'footle': waits('first-action', '687', LUCK),",
  },
  staleseed: {
    section: 'section1', via: 'seed', file: SEED_FILE,
    from: "  ('ball-iq', 'choice', null, false, 'first-action', '681'),",
    to: "  ('ball-iq', 'choice', null, false, 'deal', '681'),",
  },
  seedpays: {
    section: 'section1', via: 'generator', file: GEN_FILE, reseed: true,
    from: '${rule.pays}, ${q(rule.claim)}',
    to: 'true, ${q(rule.claim)}',
  },
  seeddrop: {
    section: 'section1', via: 'generator', file: GEN_FILE, reseed: true,
    from: 'const sorted = [...rows].sort(',
    to: "const sorted = [...rows].filter(r => r[2].round !== 'none').sort(",
  },
  familylist: {
    section: 'section1', via: 'families', file: FAMILIES_FILE,
    from: "    policies: ['topListed', 'constant', 'random', 'counter'],",
    to: "    policies: ['topListed', 'constant', 'random'],",
  },
  flagship: {
    section: 'section1', via: 'families', file: FAMILIES_FILE,
    from: "'soccer-career': holdsRelease('G', waits('finish', '687', UNTOUCHED)),",
    to: "'soccer-career': waits('finish', '687', UNTOUCHED),",
  },
  unmeasured: {
    section: 'section2', via: 'families', file: FAMILIES_FILE, reseed: true,
    from: "      'ball-iq': waits('first-action', '681', LUCK),",
    to: "      'ball-iq': paid('dp', 'first-action', '681'),",
  },
  counterblind: {
    section: 'section2', via: 'framework', file: 'src/lib/naivePolicies.ts',
    from: 'if (count(opts[i].key) < count(opts[at].key)) at = i;',
    to: 'if (count(opts[i].key) > count(opts[at].key)) at = i;',
  },
  ceilingoff: {
    section: 'section2', via: 'ceilings', file: 'src/lib/gridScore.ts',
    from: 'export const GRID_CEILING = gridScore(GRID_CELLS);',
    to: 'export const GRID_CEILING = gridScore(GRID_CELLS) + GRID_CELL_POINTS;',
  },
  lineonelow: {
    section: 'section2', via: 'framework', file: 'src/lib/knowledgeLine.ts',
    from: 'return onGrid(hi, step);',
    to: 'return onGrid(lo, step);',
  },
  nofloor: {
    section: 'section2', via: 'framework', file: 'src/lib/knowledgeLine.ts',
    from: 'const low = floors.length > 0',
    to: 'const low = floors.length < 0',
  },
  noround: {
    section: 'section2', via: 'framework', file: 'src/lib/knowledgeLine.ts',
    from: 'return mint(Math.round((100 * (result - line)) / (perfect - line)));',
    to: 'return mint((100 * (result - line)) / (perfect - line));',
  },
  ceilinghalf: {
    section: 'section2', via: 'framework', file: 'src/lib/knowledgeLine.ts',
    from: 'return dayPoints(raw, 0, ceiling);',
    to: 'return dayPoints(raw, ceiling / 2, ceiling);',
  },
  k70oracle: {
    section: 'section2', via: 'framework', file: 'src/lib/naivePolicies.ts',
    from: 'weight: 0.3 / n + (i === best ? 0.7 : 0),',
    to: 'weight: i === best ? 1 : 0,',
  },
  nomerge: {
    section: 'section2', via: 'framework', file: 'src/lib/naivePolicies.ts',
    from: 'const key = stateKey(m, s);',
    to: 'const key = null;',
  },
  luckyperfect: {
    section: 'section2', via: 'framework', file: 'src/lib/naivePolicies.ts',
    from: 'const perfect = expectedResult(oracle);',
    to: 'const perfect = Math.max(...oracle.results.map(r => r.value));',
  },
  fallbacknumber: {
    section: 'section2', via: 'framework', file: 'src/lib/naivePolicies.ts',
    from: "if (at < 0) throw new Error('biggestNumber: no option on screen shows a number, so it has nothing to read');",
    to: '',
  },
  fallbackbonus: {
    section: 'section2', via: 'framework', file: 'src/lib/naivePolicies.ts',
    from: "if (at < 0) throw new Error('structureStacker: no option on screen shows a bonus, so it has nothing to read');",
    to: '',
  },
  fallbackadvice: {
    section: 'section2', via: 'framework', file: 'src/lib/naivePolicies.ts',
    from: 'if (advised.length === 0 && left.length > 0) {',
    to: 'if (advised.length === 0 && left.length < 0) {',
  },
  rawrecord: {
    section: 'section3', via: 'program', file: 'src/lib/knowledgeLine.ts',
    from: 'export type DayPoints = number & { readonly __dayPoints: true };',
    to: 'export type DayPoints = number;',
  },
  markeroff: {
    section: 'section3', via: 'program', file: 'src/lib/knowledgeLine.brand.ts',
    from: 'takesDayPoints(62),',
    to: 'takesNothing(62),',
  },
  mint: {
    section: 'section3', via: 'program', file: 'src/lib/pointsHowTo.ts', from: HOWTO_ANCHOR,
    to: `import type { DayPoints } from '@/lib/knowledgeLine';\nexport const MINTED = 62 as DayPoints;\n${HOWTO_ANCHOR}`,
  },
  mintany: {
    section: 'section3', via: 'program', file: 'src/lib/pointsHowTo.ts', from: HOWTO_ANCHOR,
    to: `import type { DayPoints } from '@/lib/knowledgeLine';\nexport const LEAK: DayPoints = 62 as any;\n${HOWTO_ANCHOR}`,
  },
  mintalias: {
    section: 'section3', via: 'program', file: 'src/lib/pointsHowTo.ts', from: HOWTO_ANCHOR,
    to: `import { type DayPoints as DP } from '@/lib/knowledgeLine';\nexport const LEAK = 62 as DP;\n${HOWTO_ANCHOR}`,
  },
  mintindexed: {
    section: 'section3', via: 'program', file: 'src/lib/pointsHowTo.ts', from: HOWTO_ANCHOR,
    to: `export const LEAK = 62 as PointsAnswer['points'];\n${HOWTO_ANCHOR}`,
  },
  mintredeclare: {
    section: 'section3', via: 'program', file: 'src/lib/pointsHowTo.ts', from: HOWTO_ANCHOR,
    to: `type DayPoints = import('@/lib/knowledgeLine').DayPoints;\nexport const LEAK = 62 as DayPoints;\n${HOWTO_ANCHOR}`,
  },
  mintunbrand: {
    section: 'section3', via: 'program', file: 'src/lib/pointsHowTo.ts', from: HOWTO_ANCHOR,
    to: `export function bump(answer: PointsAnswer): void { (answer as any).points = 62; }\n${HOWTO_ANCHOR}`,
  },
  mintexport: {
    section: 'section3', via: 'program', file: 'src/lib/knowledgeLine.ts',
    from: 'function mint(n: number): DayPoints {',
    to: 'export function mint(n: number): DayPoints {',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`KNOWLEDGE_LINE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

/* Every run gets its own directory: the bundles, the key scan's root and any
   planted copy live there, never in dist or src. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledgeLine-'));
const COPIES = new Map();
const LOADED = new Set();
const sqlCode = s => s.split('\n').map(l => l.replace(/--.*$/, '')).join('\n');
const codeOf = (rel, text) => (rel.endsWith('.sql') ? sqlCode(text) : stripComments(text));
const plant = (rel, text) => {
  const at = path.join(TMP, 'copies', rel);
  fs.mkdirSync(path.dirname(at), { recursive: true });
  fs.writeFileSync(at, text);
  COPIES.set(rel, at);
};
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const text = readLF(c.file);
  const inCode = codeOf(c.file, text).split(c.from).length - 1;
  const inText = text.split(c.from).length - 1;
  if (inCode !== 1 || inText !== 1) {
    console.error(`control ${CONTROL}: its anchor occurs ${inCode} times in the code of ${c.file} (${inText} in the text), not once. Refusing to run a control that changes nothing.`);
    process.exit(1);
  }
  plant(c.file, text.replace(c.from, () => c.to));
  console.log(`NEGATIVE CONTROL ON: ${CONTROL} plants a copy of ${c.file} in ${relOf(TMP) || TMP}`);
}
/** A file as the reader `via` reads it: the planted copy when there is one. */
const source = (rel, via) => {
  if (COPIES.has(rel)) { LOADED.add(`${via}|${rel}`); return fs.readFileSync(COPIES.get(rel), 'utf8'); }
  return readLF(rel);
};
/** An esbuild plugin that hands the reader `via` the planted copy. */
const copyPlugin = via => ({
  name: `knowledge-line-control-${via}`,
  setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const rel = relOf(args.path);
      if (!COPIES.has(rel)) return undefined;
      return { contents: source(rel, via), loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
    });
  },
});
/** The seed generator, or the planted copy of it a control hands in. */
const generator = async () => {
  if (!COPIES.has(GEN_FILE)) return GEN;
  LOADED.add(`generator|${GEN_FILE}`);
  return import(pathToFileURL(COPIES.get(GEN_FILE)).href);
};
/* src as the readers see it: LF, tests left out, a planted copy in its place. */
const SRC = srcFiles(ROOT);
const srcText = (rel, via) => (COPIES.has(rel) ? source(rel, via) : SRC.get(rel));

/* The framework under test: the knowledge line and the naive policies. */
const K = {};
const N = {};
try {
  const built = await build({
    stdin: { contents: "export * as K from '@/lib/knowledgeLine';\nexport * as N from '@/lib/naivePolicies';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [copyPlugin('framework')],
  });
  const file = path.join(TMP, 'framework.bundle.mjs');
  fs.writeFileSync(file, built.outputFiles[0].text);
  const mod = await import(pathToFileURL(file).href);
  Object.assign(K, mod.K);
  Object.assign(N, mod.N);
} catch (e) {
  console.error(`the knowledge line and the naive policies did not build: ${e.message ?? e}`);
  process.exit(1);
}

/* ---------------- what the spec lines each family on ---------------- */

/* Sections 7.1 to 7.7, transcribed. `needs` is what every game of the family
   is measured on; `whereShown` is what the family's own list carries for the
   games that show a number or a bonus during the pick, and a game whose
   picks show neither may leave it off its own list (the runner's
   policiesItOffers check makes sure a game that does show one keeps it). A
   game the spec names by itself holds its own list instead. */
const SPEC_POLICIES = {
  choice: { needs: ['topListed', 'constant', 'random', 'counter'], at: '7.2' },
  typed: { needs: ['random', 'suggestionBox'], at: '7.3' },
  draft: { needs: ['topListed', 'random'], whereShown: ['structureStacker', 'biggestNumber'], at: '7.4' },
  numbers: { needs: ['biggestNumber', 'firstSlot', 'random'], at: '7.5' },
  arcade: { needs: ['speedTapper', 'random'], at: '7.1' },
  season: { needs: ['idle'], at: '7.1 and 7.6' },
  sim: { needs: ['idle'], at: '7.1 and 7.6' },
};
const HL_NEEDS = { needs: ['topListed', 'constant', 'random', 'counter', 'medianCall'], at: '7.2 (a value shown, the next hidden)' };
const ESTIMATE_NEEDS = { needs: ['constant', 'random'], at: '7.2 (estimates: constant is the pool median guess)' };
const ORDERING_NEEDS = { needs: ['topListed', 'random'], at: '7.2 and 7.7 (orderings)' };
const SPEC_GAME_POLICIES = {
  ...Object.fromEntries(['afl', 'cfb', 'f1', 'golf', 'hockey', 'mlb', 'nba', 'nfl', 'tennis'].map(s => [`${s}-higher-lower`, HL_NEEDS])),
  'higher-lower': HL_NEEDS,
  'higher-lower-transfers': HL_NEEDS,
  'pack-battle': HL_NEEDS,
  'sports-millionaire': { needs: ['random', 'topListed', 'lifelineReader'], at: '7.2 (rungs)' },
  'guess-transfer-value': ESTIMATE_NEEDS,
  'grade-transfer': ESTIMATE_NEEDS,
  'score-predictor': ESTIMATE_NEEDS,
  'silverware-sort': ORDERING_NEEDS,
  'football-timeline': ORDERING_NEEDS,
  'rank-em': ORDERING_NEEDS,
};
/* Section 7.6: the flagship does not go for fun silently; Release G waits. */
const SPEC_HOLDS = { 'soccer-career': { release: 'G', at: '7.6' } };

/* ---------------- section 1: the families ---------------- */

console.log('1) every sendable key is filed once, the seed is the table row by row, and the lists are the spec\'s');
let rows = [];
/* The naive policies each game is measured on, and its family, as the table files them. */
const naiveOf = new Map();
const familyOf = new Map();
try {
  const groups = await loadFamilies(ROOT, TMP, [copyPlugin('families')]);
  rows = familyRows(groups);
  for (const g of groups) {
    for (const [key, rule] of Object.entries(g.games)) {
      naiveOf.set(key, rule.policies ?? g.policies);
      familyOf.set(key, g.family);
    }
  }
  const G = await generator();
  if (CONTROL && CONTROLS[CONTROL].reseed) plant(SEED_FILE, G.seedSql(groups));

  /* The key scan reads code: every src file with its comments stripped,
     handed to the shared scan as extra sources over an empty tree. */
  const keyRoot = path.join(TMP, 'keyroot');
  fs.mkdirSync(path.join(keyRoot, 'src'), { recursive: true });
  const code = [...SRC.keys()].map(rel => stripComments(srcText(rel, 'keys')));
  const retired = declaredRetirements(ROOT);
  if (!retired) failIn('section1', 'src/data/completionSlugs.ts no longer holds RETIRED_COMPLETION_SLUGS where this reads it');
  const sendable = new Set([...sourceCompletionKeys(keyRoot, code)].filter(k => !retired?.has(k)));
  const filed = new Map();
  for (const [key, family] of rows) filed.set(key, [...(filed.get(key) ?? []), family]);
  const caps = new Set(CAPS.map(r => r[0]));
  for (const key of [...sendable].sort()) {
    const fams = filed.get(key) ?? [];
    if (fams.length === 0) failIn('section1', `${key} can be sent and is filed in no family in ${FAMILIES_FILE}`);
    if (fams.length > 1) failIn('section1', `${key} is filed ${fams.length} times (${fams.join(', ')})`);
  }
  for (const key of [...filed.keys()].sort()) {
    if (retired?.has(key)) failIn('section1', `${key} is filed but retired in src/data/completionSlugs.ts`);
    else if (!sendable.has(key)) failIn('section1', `${key} is filed but nothing in src's code sends it`);
    if (!caps.has(key)) failIn('section1', `${key} has no game_score_caps row, so its game_rules row would break the foreign key`);
  }

  /* The seed: what the generator writes now, and row by row the table's own. */
  let seed = null;
  try {
    seed = G.seedSql(groups);
  } catch (e) {
    failIn('section1', e.message);
  }
  const committed = fs.existsSync(path.join(ROOT, SEED_FILE)) || COPIES.has(SEED_FILE) ? source(SEED_FILE, 'seed') : null;
  if (seed !== null && committed !== seed) {
    const have = (committed ?? '').split('\n');
    const first = seed.split('\n').find(l => !have.includes(l)) ?? have.find(l => !seed.split('\n').includes(l));
    failIn('section1', `${SEED_FILE} is not what the table generates (first difference: ${first}). Run node scripts/genGameRules.mjs.`);
  }
  const disagree = committed === null ? [`${SEED_FILE} is missing`] : seedAgainstTable(groups, committed);
  for (const d of disagree.slice(0, 5)) failIn('section1', `${SEED_FILE} against ${FAMILIES_FILE}: ${d}`);
  if (disagree.length > 5) failIn('section1', `and ${disagree.length - 5} more rows of ${SEED_FILE} disagree with the table`);

  /* The policy lists, against the spec. */
  let listed = 0;
  for (const g of groups) {
    const spec = SPEC_POLICIES[g.family];
    if (!spec) { failIn('section1', `the ${g.family} family has no policy list transcribed from the spec here`); continue; }
    const lack = [...spec.needs, ...(spec.whereShown ?? [])].filter(p => !g.policies.includes(p));
    if (lack.length) failIn('section1', `the ${g.family} family's list leaves out ${lack.join(', ')}, which section ${spec.at} lines it on`);
    for (const [key, rule] of Object.entries(g.games)) {
      const own = SPEC_GAME_POLICIES[key];
      const list = rule.policies ?? g.policies;
      const miss = (own ?? spec).needs.filter(p => !list.includes(p));
      if (miss.length) failIn('section1', `${key} is measured on ${list.join(', ')}, without ${miss.join(', ')} (section ${(own ?? spec).at})`);
      listed += 1;
    }
  }
  for (const key of Object.keys(SPEC_GAME_POLICIES)) if (!familyOf.has(key)) failIn('section1', `the spec names ${key}'s policies and the table files no such key`);

  /* The flagship holds its release until it pays. */
  for (const [key, h] of Object.entries(SPEC_HOLDS)) {
    const found = rows.find(r => r[0] === key);
    if (!found) failIn('section1', `${key} is not filed, and section ${h.at} makes Release ${h.release} wait on it`);
    else if (!found[2].pays && found[2].holds !== h.release) {
      failIn('section1', `${key} does not pay and is not filed as holding Release ${h.release}, so it would go for fun at the release silently (section ${h.at})`);
    }
  }

  const byFamily = new Map();
  for (const [, family] of rows) byFamily.set(family, (byFamily.get(family) ?? 0) + 1);
  const paying = rows.filter(r => r[2].pays).length;
  console.log(`   ${sendable.size} sendable keys (read as code), ${rows.length} filed: ${[...byFamily].map(([f, n]) => `${f} ${n}`).join(', ')}; ${paying} paying${seed ? `; seed md5 ${md5(seed)}` : ''}`);
  console.log(`   the seed, row by row against the table: ${disagree.length ? `${disagree.length} disagreement(s)` : `all ${rows.length} rows agree`}; ${listed} games' policy lists hold the spec's`);
  const waiting = new Map();
  for (const [key, , rule] of rows) if (!rule.pays) waiting.set(rule.round, [...(waiting.get(rule.round) ?? []), key]);
  console.log(`   waiting: ${[...waiting].sort().map(([r, ks]) => `${r === 'none' ? 'never scored' : `Round ${r}`} ${ks.length}`).join(', ')}`);
  const held = rows.filter(r => r[2].holds && !r[2].pays).map(r => `${r[0]} holds Release ${r[2].holds} (Round ${r[2].round})`);
  console.log(`   release holds: ${held.join(', ') || 'none'}`);
} catch (e) {
  failIn('section1', `the family table did not load: ${e.message ?? e}`);
}

/* ---------------- section 2: the line ---------------- */

/**
 * One row per paying game, added by the round that puts it on the line:
 *   key       the completion key
 *   engine    the module whose pointsFor the recorder sends and this plays
 *   site      [file, slugArg?]: the recorder, slugArg when the slug is an
 *             expression (config.gameId), matched verbatim
 *   boards()  the boards: every daily of 2026, or 400 seeded boards, each
 *             carrying its `salt`
 *   moves(b)  the game's own moves on a board (naivePolicies' Moves)
 *   points(b, result)  the engine's pointsFor(board, result)
 *   headroom  a round number when the 70 percent player is allowed under 15
 *             until that round (printed, never silent)
 * A row never names its naive policies or its family: it is measured on what
 * the family table files for its game, so a row cannot leave out the policy
 * that beats it. Rows need a bundle of their engines, which Round 681 brings
 * with the first.
 */
const LINE_ROWS = [];

const EPS = 1e-9;
const days2026 = Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));

/** Plays one row through the framework; returns its failures, each with a kind. */
function measureRow(row) {
  const fails = [];
  const note = (kind, msg) => fails.push({ kind, msg });
  const counts = new Map();
  const once = (kind, msg) => {
    const n = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, n);
    if (n <= 3) note(kind, msg);
  };
  const sums = new Map();
  const over = new Map();
  let k70 = 0;
  let boards = 0;
  try {
    for (const board of row.boards()) {
      boards += 1;
      const m = row.moves(board);
      const at = v => row.points(board, v);
      const first = at(0);
      const { line, perfect } = first;
      if (!(perfect > line)) once('noroom', `board ${board.salt} was dealt with no room above its line (line ${line}, perfect ${perfect})`);
      const paid = (value, who) => {
        const pts = at(value).points;
        if (!(Number.isInteger(pts) && pts >= 0 && pts <= 100)) once('whole', `${who} ends on ${value} on board ${board.salt} and is paid ${pts}, not a whole number from 0 to 100`);
        return pts;
      };
      const unlisted = N.policiesItOffers(m, board.salt).filter(p => !row.policies.includes(p));
      if (unlisted.length) once('unlisted', `board ${board.salt}: the moves give ${unlisted.join(', ')} something to read, and the game is not measured on it`);
      for (const p of N.policiesFor(row.policies, m)) {
        const out = N.outcomeOf(m, p, board.salt);
        if (row.family === 'choice' && !m.chance && !out.exact) once('sampled', `${p.name} on board ${board.salt} was sampled, and a choice daily with no chance is measured exactly`);
        const pts = out.results.reduce((s, r) => s + r.weight * paid(r.value, p.name), 0);
        sums.set(p.name, (sums.get(p.name) ?? 0) + pts);
        if (pts > K.NAIVE_LIMIT + EPS) {
          const o = over.get(p.name) ?? { n: 0, worst: -Infinity, at: '' };
          o.n += 1;
          if (pts > o.worst) { o.worst = pts; o.at = board.salt; }
          over.set(p.name, o);
        }
        if (out.deterministic && !m.chance && pts !== 0) once('deterministic', `${p.name} always ends on ${out.results[0].value} on board ${board.salt} and is paid ${pts}`);
        if (out.deterministic && m.chance && K.expectedResult(out) > line + EPS) once('deterministic', `${p.name} expects ${K.expectedResult(out).toFixed(3)} on board ${board.salt}, past its line ${line}`);
      }
      const oracle = N.outcomeOf(m, N.ORACLE, board.salt);
      if (m.chance) {
        const e = K.expectedResult(oracle);
        if (paid(e, 'the oracle in expectation') !== 100) once('oracle', `the oracle expects ${e.toFixed(3)} on board ${board.salt} and records ${at(e).points}, not 100`);
      } else {
        for (const r of oracle.results) if (paid(r.value, 'the oracle') !== 100) once('oracle', `the oracle ends on ${r.value} on board ${board.salt} and records ${at(r.value).points}, not 100`);
      }
      const k = N.outcomeOf(m, N.KNOWLEDGE_70, board.salt);
      k70 += k.results.reduce((s, r) => s + r.weight * paid(r.value, 'the 70 percent player'), 0);
    }
  } catch (e) {
    note('error', e.message ?? String(e));
    return { fails, means: new Map(), k70: 0, boards };
  }
  for (const [kind, n] of counts) if (n > 3) note(kind, `and ${n - 3} more like it`);
  const means = new Map([...sums].map(([name, s]) => [name, s / boards]));
  for (const [name, o] of over) {
    note(`naive:${name}`, `${name} averages more than ${K.NAIVE_LIMIT} of 100 on ${o.n} of ${boards} boards, worst ${o.worst.toFixed(2)} on ${o.at} (over all boards ${means.get(name).toFixed(2)})`);
  }
  const k70mean = k70 / Math.max(1, boards);
  if (k70mean < K.SKILL_FLOOR && !row.headroom) note('headroom', `the 70 percent player averages ${k70mean.toFixed(2)} (floor ${K.SKILL_FLOOR})`);
  return { fails, means, k70: k70mean, boards };
}

/* The probe boards: fixed items with fixed options, the answer to each drawn
   from the day's salt the way the spec deals the choice dailies. `deal` is
   coin (independent keys), balanced (five of each, the counting exploit) or
   sorted (the top listed option right on all but one item). */
const KEYS2 = ['true', 'false'];
const keyName = (width, i) => (width === 2 ? KEYS2[i] : String(i));
function keyedBoard(tag, day, { items = 10, width = 2, deal = 'coin' } = {}) {
  const salt = `probe|${tag}|${day}`;
  const rng = N.saltedRng(salt);
  let answers;
  if (deal === 'balanced') {
    answers = Array.from({ length: items }, (_, i) => (i < items / 2 ? 0 : 1));
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
  } else if (deal === 'sorted') {
    answers = Array.from({ length: items }, () => 0);
    answers[Math.floor(rng() * items)] = 1;
  } else {
    answers = Array.from({ length: items }, () => Math.floor(rng() * width));
  }
  return { salt, answers, width };
}
/* Moves on a keyed board. `luck` is the chance a pick is overruled by a coin
   of the board's own; `lifeline` gives one lifeline that points at the answer
   (honest) or at nothing (blind); `shown` and `bonus` print a number or a
   bonus on each option, the biggest on the right one. */
function keyedMoves(board, { luck = 0, lifeline = null, shown = false, bonus = false } = {}) {
  const w = board.width;
  const m = {
    chance: luck > 0,
    start: () => ({ i: 0, right: 0, revealed: [], lifelines: lifeline ? 1 : 0, advice: -1 }),
    options: s => Array.from({ length: w }, (_, k) => {
      const truth = board.answers[s.i];
      const o = { key: keyName(w, k) };
      if (shown) o.shown = k === truth ? 90 : 40 + k;
      if (bonus) o.bonus = k === truth ? 3 : 0;
      if (s.advice === k) o.advised = true;
      return o;
    }),
    play: (s, index, ctx) => {
      const truth = board.answers[s.i];
      const right = luck > 0 && ctx.rng() < luck ? ctx.rng() < 1 / w : index === truth;
      return { i: s.i + 1, right: s.right + (right ? 1 : 0), revealed: [...s.revealed, keyName(w, truth)], lifelines: s.lifelines, advice: -1 };
    },
    done: s => s.i >= board.answers.length,
    result: s => s.right,
    best: s => board.answers[s.i],
    revealed: s => s.revealed,
  };
  if (lifeline) {
    m.lifelines = s => (s.lifelines > 0 ? ['ask'] : []);
    m.useLifeline = s => ({ ...s, lifelines: s.lifelines - 1, advice: lifeline === 'honest' ? board.answers[s.i] : -1 });
  }
  return m;
}
/* A rating board: four picks from five, the top listed always rated 20, the
   best 25, the rest 0 to 10, and the result the summed rating. On this wide a
   scale the step under the top listed rating would still pay it 5, so only
   the floor at the best deterministic policy holds it to 0. */
function ratingBoard(day) {
  const salt = `probe|rating|${day}`;
  const rng = N.saltedRng(salt);
  const slots = Array.from({ length: 4 }, () => {
    const rest = [25, ...Array.from({ length: 3 }, () => Math.floor(rng() * 11))];
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [20, ...rest];
  });
  return { salt, slots };
}
function ratingMoves(board) {
  return {
    start: () => ({ i: 0, sum: 0 }),
    options: s => board.slots[s.i].map((_, k) => ({ key: String(k) })),
    play: (s, index) => ({ i: s.i + 1, sum: s.sum + board.slots[s.i][index] }),
    done: s => s.i >= board.slots.length,
    result: s => s.sum,
    best: s => board.slots[s.i].indexOf(Math.max(...board.slots[s.i])),
  };
}

/* A probe row: boards dealt the way each game's engine will deal them
   (measureBoard at deal time, a redraw when a board has no room; after 20
   draws the last is dealt anyway, so the runner can say so). */
function probeRow(label, {
  board = d => keyedBoard('coin', d), moves = b => keyedMoves(b), days = 120, family = 'choice',
  policies = SPEC_POLICIES.choice.needs, enginePolicies = policies, lineOf, perfectOf,
}) {
  const dealt = new Map();
  const deal = day => {
    if (dealt.has(day)) return dealt.get(day);
    let last = null;
    for (let k = 0; k < 20; k++) {
      const b = board(`${day}#${k}`);
      const measured = N.measureBoard(moves(b), enginePolicies, b.salt);
      const line = lineOf ? lineOf(measured) : measured.line;
      const perfect = perfectOf ? perfectOf(measured) : measured.perfect;
      last = { ...b, line, perfect };
      if (K.hasRoom({ perfect }, line)) break;
    }
    dealt.set(day, last);
    return last;
  };
  return {
    key: label,
    family,
    policies,
    boards: () => days2026.slice(0, days).map(deal),
    moves,
    points: (b, result) => K.pointsAnswer(result, b.line, b.perfect, 'right'),
  };
}
const maxDeterministic = measured => Math.max(...measured.outcomes.filter(o => o.deterministic).map(K.expectedResult));
const PROBES = [
  { row: probeRow('coin keyed daily, lined on the choice family', { days: 365 }), want: [] },
  { row: probeRow('four options over twelve items, walked exactly', { board: d => keyedBoard('four', d, { items: 12, width: 4 }), days: 60 }), want: [] },
  { row: probeRow('a wide scale rating board', { board: ratingBoard, moves: ratingMoves, family: 'draft', policies: SPEC_POLICIES.draft.needs }), want: [] },
  { row: probeRow('a board partly left to luck, valued in expectation', { board: d => keyedBoard('partly', d), moves: b => keyedMoves(b, { luck: 0.3 }), days: 60 }), want: [] },
  { row: probeRow('balanced key lined without counter', { board: d => keyedBoard('balanced', d, { deal: 'balanced' }), enginePolicies: ['topListed', 'constant', 'random'] }), want: ['naive:counter'] },
  { row: probeRow('line under the constant answer', { lineOf: m => maxDeterministic(m) - 1 }), want: ['deterministic'] },
  { row: probeRow('perfect past the oracle', { perfectOf: m => m.perfect + 1 }), want: ['oracle'] },
  { row: probeRow('a sorted list, the top name right on 19 of 20', { board: d => keyedBoard('sorted', d, { items: 20, deal: 'sorted' }), days: 60 }), want: ['headroom'] },
  { row: probeRow('a coin flip after every pick', { moves: b => keyedMoves(b, { luck: 1 }), days: 8 }), want: ['noroom'] },
  { row: probeRow('a board that reveals, measured without counter', { policies: ['topListed', 'constant', 'random'], days: 20 }), want: ['unlisted'] },
  { row: probeRow('biggestNumber with no number on screen', { policies: ['biggestNumber'], days: 3 }), want: ['error'], error: /no option on screen shows a number/ },
  { row: probeRow('structureStacker with no bonus on screen', { policies: ['structureStacker'], days: 3 }), want: ['error'], error: /no option on screen shows a bonus/ },
  { row: probeRow('a lifeline that points at nothing', { moves: b => keyedMoves(b, { lifeline: 'blind' }), policies: ['lifelineReader'], days: 3 }), want: ['error'], error: /points at no option/ },
];

/* The cases: the formula and the policies, pinned to numbers worked by hand. */
const policy = name => N.policiesFor([name], null)[0];
const det = (name, value) => ({ policy: name, results: [{ value, weight: 1 }], deterministic: true });
const spread = (name, pairs) => ({ policy: name, results: pairs.map(([value, weight]) => ({ value, weight })), deterministic: false });
const tf = keyedBoard('case', '2026-01-01');
const four = keyedBoard('case', '2026-01-01', { items: 12, width: 4 });
const lucky = keyedBoard('case-luck', '2026-01-01');
const expectedOf = (moves, p, b) => K.expectedResult(N.outcomeOf(moves, p, b.salt));
const CASES = [
  ['8 right on a line of 7 of 10', () => K.dayPoints(8, 7, 10), 33],
  ['10 right on a line of 7 of 10', () => K.dayPoints(10, 7, 10), 100],
  ['7 right on a line of 7 of 10', () => K.dayPoints(7, 7, 10), 0],
  ['a result past the perfect', () => K.dayPoints(12, 7, 10), 100],
  ['a board with no room', () => K.dayPoints(9, 10, 10), 0],
  ['a rating of 85 on a line of 74, perfect 91', () => K.dayPoints(85, 74, 91), 65],
  ['7.37 expected wins on a line of 5.2, perfect 11.9, a whole number', () => K.dayPoints(7.37, 5.2, 11.9), 32],
  ['a typed board, 6 of 9 on a line of 0', () => K.pointsFromCeiling(6, 9), 67],
  ['a typed board, 0 of 9', () => K.pointsFromCeiling(0, 9), 0],
  ['a typed board, 9 of 9', () => K.pointsFromCeiling(9, 9), 100],
  ['575 of a 1000 ceiling, halfway, rounds up as the database does', () => K.pointsFromCeiling(575, 1000), 58],
  ['a wide scale board: the line sits on the top listed rating, not a step under', () => K.lineFor({ perfect: 91 }, [det('topListed', 60), spread('random', [[40, 0.5], [55, 0.5]])]), 60],
  ['the 70 percent player expects 8.5 of 10 true or false', () => expectedOf(keyedMoves(tf), N.KNOWLEDGE_70, tf), 8.5],
  ['the 70 percent player expects 9.3 of 12 four option items', () => expectedOf(keyedMoves(four), N.KNOWLEDGE_70, four), 9.3],
  ['random expects 3 of 12 four option items', () => expectedOf(keyedMoves(four), policy('random'), four), 3],
  ['random on twelve four option items is walked exactly', () => N.outcomeOf(keyedMoves(four), policy('random'), four.salt).exact, true],
  ['the 70 percent player on twelve four option items is walked exactly', () => N.outcomeOf(keyedMoves(four), N.KNOWLEDGE_70, four.salt).exact, true],
  ['counter on twelve four option items is walked exactly', () => N.outcomeOf(keyedMoves(four), policy('counter'), four.salt).exact, true],
  ['lifelineReader follows one honest lifeline, then guesses: 5.5 of 10', () => expectedOf(keyedMoves(tf, { lifeline: 'honest' }), policy('lifelineReader'), tf), 5.5],
  ['biggestNumber takes the biggest number shown: 10 of 10', () => expectedOf(keyedMoves(tf, { shown: true }), policy('biggestNumber'), tf), 10],
  ['structureStacker takes the biggest bonus shown: 10 of 10', () => expectedOf(keyedMoves(tf, { bonus: true }), policy('structureStacker'), tf), 10],
  ['a board with chance takes the oracle\'s expected result as perfect', () => {
    const m = keyedMoves(lucky, { luck: 0.3 });
    return N.measureBoard(m, SPEC_POLICIES.choice.needs, lucky.salt).perfect === K.expectedResult(N.outcomeOf(m, N.ORACLE, lucky.salt));
  }, true],
];

console.log('2) the line: every paying game measured board by board, the runner proved, the formula pinned');
{
  const paying = rows.filter(r => r[2].pays).map(r => r[0]);
  const rowKeys = new Set(LINE_ROWS.map(r => r.key));
  for (const key of paying) if (!rowKeys.has(key)) failIn('section2', `${key} pays and no row in LINE_ROWS measures it`);
  for (const key of rowKeys) if (!paying.includes(key)) failIn('section2', `LINE_ROWS measures ${key}, which does not pay`);
  for (const row of LINE_ROWS) {
    /* Measured on the family table's policies and family, never on a list the row picks. */
    const rs = measureRow({ ...row, policies: naiveOf.get(row.key) ?? [], family: familyOf.get(row.key) });
    for (const f of rs.fails) failIn('section2', `${row.key}: ${f.msg}`);
    if (row.headroom && rs.k70 < K.SKILL_FLOOR) console.log(`   ${row.key}: the 70 percent player averages ${rs.k70.toFixed(2)}, allowed until Round ${row.headroom}`);
    console.log(`   ${row.key}: ${rs.boards} boards, ${[...rs.means].map(([n, v]) => `${n} ${v.toFixed(2)}`).join(', ')}, 70 percent ${rs.k70.toFixed(1)}`);
  }
  console.log(`   ${paying.length} paying games, ${LINE_ROWS.length} rows`);
  for (const { row, want, error } of PROBES) {
    const rs = measureRow(row);
    const kinds = new Set(rs.fails.map(f => f.kind));
    const missing = want.filter(k => !kinds.has(k));
    const extra = want.length === 0 ? [...kinds] : (kinds.has('error') && !want.includes('error') ? ['error'] : []);
    const errors = rs.fails.filter(f => f.kind === 'error').map(f => f.msg).join('; ');
    const wrongError = error && kinds.has('error') && !error.test(errors) ? [`an error other than ${error}: ${errors}`] : [];
    if (missing.length || extra.length || wrongError.length) {
      failIn('section2', `probe "${row.key}": ${missing.length ? `not caught for ${missing.join(', ')}` : ''}${extra.length ? ` flagged ${extra.join(', ')} (${rs.fails.map(f => f.msg).join('; ')})` : ''}${wrongError.join('')}`);
    }
    const detail = [...rs.means].map(([n, v]) => `${n} ${v.toFixed(1)}`).join(', ');
    console.log(`   probe "${row.key}": ${want.length ? `caught (${[...kinds].join(', ')})` : 'passes'}${detail ? `; ${detail}, 70 percent ${rs.k70.toFixed(1)}` : ''}`);
  }
  let casesRight = 0;
  for (const [label, run, want] of CASES) {
    let got;
    try {
      got = run();
    } catch (e) {
      got = `a throw (${e.message ?? e})`;
    }
    const same = typeof want === 'number' ? typeof got === 'number' && Math.abs(got - want) < EPS : got === want;
    if (!same) failIn('section2', `case "${label}": got ${got}, not ${want}`);
    else casesRight += 1;
  }
  console.log(`   ${casesRight} of ${CASES.length} cases hold`);
}

/* Scale g, off the drivers the caps fence already plays: the perfect runs
   record exactly 100 and every run records its share on a line of 0. */
{
  let mods = null;
  try {
    ({ mods } = await bundleCeilingModules(ROOT, TMP, [copyPlugin('ceilings')]));
  } catch (e) {
    failIn('section2', `the ceiling modules did not build: ${e.message ?? e}`);
  }
  if (mods) {
    const proved = [];
    const waiting = [];
    let shares = 0;
    for (const [key, family, rule] of rows) {
      if (family !== 'typed' || rule.round === 'none') continue;
      const driver = PERFECT_RUNS[key];
      if (!driver || driver.days) { waiting.push(key); continue; }
      const ceiling = CEILINGS[key] ? resolveCeiling(mods, CEILINGS[key]) : { error: 'no ceiling export in scoreCeilingTable' };
      if (ceiling.error) { failIn('section2', `${key}: ${ceiling.error}`); continue; }
      let runs;
      try {
        runs = driver.runs(mods);
      } catch (e) {
        failIn('section2', `${key}: its perfect run driver threw: ${e.message ?? e}`);
        continue;
      }
      const perfect = runs.filter(r => r.perfect);
      if (perfect.length === 0) failIn('section2', `${key}: its driver flags no perfect run`);
      for (const r of perfect) {
        const pts = K.pointsFromCeiling(r.score, ceiling.value);
        if (pts !== 100 || r.score !== ceiling.value) failIn('section2', `${key}: the perfect run "${r.label}" records ${r.score} of a ${ceiling.value} ceiling, ${pts} points, not 100`);
      }
      const wrong = runs.filter(r => K.pointsFromCeiling(r.score, ceiling.value) !== Math.round(100 * Math.min(Math.max(r.score, 0), ceiling.value) / ceiling.value));
      if (wrong.length) failIn('section2', `${key}: ${wrong.length} runs are not paid their share of the ceiling on a line of 0, first "${wrong[0].label}" (${wrong[0].score} of ${ceiling.value}) paid ${K.pointsFromCeiling(wrong[0].score, ceiling.value)}`);
      shares += runs.length;
      const past = runs.filter(r => r.score > ceiling.value);
      if (past.length) failIn('section2', `${key}: ${past.length} runs record past the ${ceiling.value} ceiling, first "${past[0].label}" at ${past[0].score}`);
      proved.push(key);
    }
    console.log(`   scale g: ${proved.length} typed games record exactly 100 on a perfect run and their share of the ceiling on all ${shares} runs; ${waiting.length} have no offline driver yet and prove theirs in Round 687 (${waiting.filter(k => UNPLAYED[k]).length} of them listed with a reason in scoreCeilingTable)`);
  }
}

/* ---------------- section 3: the recorder sends the line ---------------- */

console.log('3) the recorder sends the line: the brand, the mint and the recorder read, through the type checker');
const BRAND_FILE = 'src/lib/knowledgeLine.brand.ts';
const KL_FILE = 'src/lib/knowledgeLine.ts';
const MINTERS = ['dayPoints', 'pointsFromCeiling', 'pointsAnswer'];
{
  const ts = require('typescript');
  const cfgPath = path.join(ROOT, 'tsconfig.app.json');
  const cfgJson = ts.parseConfigFileTextToJson(cfgPath, readLF('tsconfig.app.json'));
  const parsed = ts.parseJsonConfigFileContent(cfgJson.config ?? {}, ts.sys, ROOT, { types: [], noEmit: true }, cfgPath);
  const cfgErrors = [cfgJson.error, ...parsed.errors].filter(Boolean);
  if (cfgErrors.length) failIn('section3', `tsconfig.app.json did not read: ${cfgErrors.map(e => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('; ')}`);
  const host = ts.createCompilerHost(parsed.options);
  const fromDisk = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, language, ...rest) => {
    const rel = relOf(fileName);
    if (SRC.has(rel)) return ts.createSourceFile(fileName, srcText(rel, 'program'), language, true);
    return fromDisk(fileName, language, ...rest);
  };
  const program = ts.createProgram([...SRC.keys()].map(rel => path.join(ROOT, rel)), parsed.options, host);
  const checker = program.getTypeChecker();
  const sfOf = rel => program.getSourceFile(path.join(ROOT, rel).split('\\').join('/')) ?? program.getSourceFile(path.join(ROOT, rel));
  const where = n => {
    const sf = n.getSourceFile();
    return `${relOf(sf.fileName)}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
  };
  const short = n => n.getText().replace(/\s+/g, ' ').slice(0, 70);

  /* A type carries the brand when it is day points, or holds day points: in
     a union or intersection, an array or other type argument, an index, a
     property of an object type written in src (or mapped from one), or what
     a function type returns. The brand is the property knowledgeLine.ts
     declares, so a local type that happens to be called DayPoints is not
     it, and any alias of the real one is. */
  const known = new Map();
  const carries = (type, depth = 0, seen = new Set()) => {
    if (!type || seen.has(type)) return false;
    const left = 3 - depth;
    if (left < 0) return false;
    const cached = known.get(type);
    if (cached && (cached.value || cached.left >= left)) return cached.value;
    seen.add(type);
    let value = false;
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never)) value = false;
    else if (type.isUnion()) value = type.types.some(t => carries(t, depth, seen));
    else {
      const brand = type.getProperty('__dayPoints');
      if (brand && (brand.declarations ?? []).some(d => relOf(d.getSourceFile().fileName) === KL_FILE)) value = true;
      else if (type.isIntersection()) value = type.types.some(t => carries(t, depth, seen));
      else if (type.flags & ts.TypeFlags.Object) {
        const next = [];
        if (type.objectFlags & ts.ObjectFlags.Reference) next.push(...checker.getTypeArguments(type));
        for (const idx of [type.getNumberIndexType(), type.getStringIndexType()]) if (idx) next.push(idx);
        for (const sig of type.getCallSignatures()) next.push(sig.getReturnType());
        const inSrc = (type.symbol?.declarations ?? []).some(d => !d.getSourceFile().isDeclarationFile);
        const props = type.getProperties();
        if ((inSrc || (type.objectFlags & ts.ObjectFlags.Mapped)) && props.length <= 60) {
          for (const p of props) {
            const d = p.valueDeclaration ?? p.declarations?.[0];
            next.push(d ? checker.getTypeOfSymbolAtLocation(p, d) : checker.getTypeOfSymbol(p));
          }
        }
        value = next.some(t => carries(t, depth + 1, seen));
      }
    }
    seen.delete(type);
    known.set(type, { value, left });
    return value;
  };
  const isAny = t => !!t && (t.flags & ts.TypeFlags.Any) !== 0;

  /* (a) the brand file: compiles clean, takes the brand, and refuses raw numbers
     where a directive sits directly above a takesDayPoints call. */
  const brandSf = sfOf(BRAND_FILE);
  let marked = 0;
  if (!brandSf) {
    failIn('section3', `${BRAND_FILE} is not in the program`);
  } else {
    for (const d of ts.getPreEmitDiagnostics(program, brandSf)) {
      const at = d.file ? `${relOf(d.file.fileName)}:${d.file.getLineAndCharacterOfPosition(d.start).line + 1}` : 'tsc';
      failIn('section3', `${at}: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
    }
    const text = brandSf.getFullText();
    let calls = 0;
    const visit = n => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'takesDayPoints') {
        calls += 1;
        const lead = ts.getLeadingCommentRanges(text, n.getFullStart()) ?? [];
        if (lead.some(c => /^\/[/*]\s*@ts-expect-error\b/.test(text.slice(c.pos, c.end)))) marked += 1;
      }
      ts.forEachChild(n, visit);
    };
    visit(brandSf);
    const fn = brandSf.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'takesDayPoints');
    const param = fn?.parameters?.[0];
    if (!param || !carries(checker.getTypeAtLocation(param))) failIn('section3', `${BRAND_FILE}'s takesDayPoints does not take day points, so what it refuses proves nothing`);
    if (marked < 2) failIn('section3', `${BRAND_FILE} refuses ${marked} raw number(s) with a directive above a takesDayPoints call (of ${calls} calls), so it holds nothing`);
    console.log(`   the brand: ${BRAND_FILE} compiles clean, ${marked} of its ${calls} takesDayPoints calls refused under a directive (${program.getSourceFiles().filter(f => relOf(f.fileName).startsWith('src/')).length} src files in the program)`);
  }

  /* (b) the mint. Casts to the brand, anywhere in src. */
  const casts = [];
  const leaks = [];
  const enclosing = n => { for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p; return null; };
  const inMint = n => {
    const fn = enclosing(n);
    return !!fn && ts.isFunctionDeclaration(fn) && fn.name?.text === 'mint' && relOf(n.getSourceFile().fileName) === KL_FILE
      && (ts.getCombinedModifierFlags(fn) & ts.ModifierFlags.Export) === 0;
  };
  for (const rel of SRC.keys()) {
    const sf = sfOf(rel);
    if (!sf) continue;
    const visit = n => {
      if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
        const target = checker.getTypeFromTypeNode(n.type);
        const from = checker.getTypeAtLocation(n.expression);
        if (carries(target) && !carries(from)) casts.push(n);
        else if ((target.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) && carries(from)) leaks.push(`${where(n)} takes the brand off day points (${short(n)})`);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }

  /* An any flowing into day points, in every file that can reach knowledgeLine.ts. */
  const cache = ts.createModuleResolutionCache(ROOT, x => x, parsed.options);
  const importsOfFile = new Map();
  for (const rel of SRC.keys()) {
    const sf = sfOf(rel);
    if (!sf) continue;
    const to = new Set();
    const add = spec => {
      const r = ts.resolveModuleName(spec, sf.fileName, parsed.options, host, cache).resolvedModule;
      if (r) to.add(relOf(r.resolvedFileName));
    };
    const visit = n => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) add(n.moduleSpecifier.text);
      else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) add(n.argument.literal.text);
      else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) add(n.arguments[0].text);
      ts.forEachChild(n, visit);
    };
    visit(sf);
    importsOfFile.set(rel, to);
  }
  const reach = new Set([KL_FILE]);
  for (let grew = true; grew;) {
    grew = false;
    for (const [rel, to] of importsOfFile) if (!reach.has(rel) && [...to].some(t => reach.has(t))) { reach.add(rel); grew = true; }
  }
  let sinks = 0;
  for (const rel of reach) {
    const sf = sfOf(rel);
    if (!sf) continue;
    const check = (e, ctx = () => checker.getContextualType(e)) => {
      if (!e) return;
      sinks += 1;
      if (!isAny(checker.getTypeAtLocation(e))) return;
      const want = ctx();
      if (want && carries(want)) leaks.push(`${where(e)} hands an any to day points (${short(e)})`);
    };
    const visit = n => {
      if ((ts.isVariableDeclaration(n) || ts.isPropertyDeclaration(n) || ts.isParameter(n)) && n.initializer) check(n.initializer);
      else if (ts.isReturnStatement(n)) check(n.expression);
      else if (ts.isArrowFunction(n) && !ts.isBlock(n.body)) check(n.body);
      else if ((ts.isCallExpression(n) || ts.isNewExpression(n)) && n.arguments) n.arguments.forEach(a => check(a));
      else if (ts.isPropertyAssignment(n)) check(n.initializer);
      else if (ts.isShorthandPropertyAssignment(n)) {
        check(n.name, () => {
          const whole = checker.getContextualType(n.parent);
          const prop = whole?.getProperty(n.name.text);
          return prop ? checker.getTypeOfSymbolAtLocation(prop, n) : undefined;
        });
      } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) check(n.right);
      else if (ts.isArrayLiteralExpression(n)) n.elements.forEach(e => check(e));
      else if (ts.isJsxExpression(n)) check(n.expression);
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }

  /* What knowledgeLine.ts hands out that makes day points. */
  const klSf = sfOf(KL_FILE);
  const modSym = klSf ? checker.getSymbolAtLocation(klSf) : undefined;
  const makers = [];
  if (!modSym) failIn('section3', `${KL_FILE} is not a module in the program`);
  else {
    for (const sym of checker.getExportsOfModule(modSym)) {
      const target = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
      const decl = target.valueDeclaration;
      if (!decl) continue;
      if (carries(checker.getTypeOfSymbolAtLocation(target, decl))) makers.push(sym.name);
    }
  }
  const beside = makers.filter(n => !MINTERS.includes(n));
  if (beside.length) leaks.push(`${KL_FILE} exports ${beside.join(', ')}, which make day points beside ${MINTERS.join(', ')}`);
  const gone = MINTERS.filter(n => !makers.includes(n));
  if (gone.length) failIn('section3', `${KL_FILE} no longer exports ${gone.join(', ')} as a maker of day points`);

  const castAt = casts.map(n => `${where(n)}${inMint(n) ? ' in mint' : ''}`);
  if (casts.length !== 1 || !inMint(casts[0])) {
    failIn('section3', `a DayPoints may be cast once, inside ${KL_FILE}'s unexported mint; found ${casts.length}: ${castAt.join(', ') || 'none'}`);
  }
  for (const l of leaks) failIn('section3', l);
  console.log(`   the mint: ${casts.length} cast to day points in ${SRC.size} src files, at ${castAt.join(', ') || 'none'}; ${leaks.length ? `${leaks.length} leak(s)` : 'no leak'} across ${sinks} sinks in the ${reach.size} files that reach ${KL_FILE}; makers exported: ${makers.join(', ') || 'none'}`);

  /* (c) The recorder read. Which argument carries the score is read off the
     recorders' own signatures, so a moved parameter is a red here, never a
     wrong argument read quietly. */
  const RECORDERS = [
    ['useGameCompletion', 'src/hooks/useGameCompletion.ts', 2],
    ['recordCompletion', 'src/lib/completions.ts', 1],
  ];
  for (const [name, rel, at] of RECORDERS) {
    const code = stripComments(readLF(rel));
    const decl = code.match(new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\s*\\(`));
    const params = decl ? callsOf(code.slice(decl.index + decl[0].length - name.length - 1), name)[0]?.args ?? [] : [];
    const param = (params[at] ?? '').match(/^([A-Za-z_$][\w$]*)/)?.[1];
    if (param !== 'score') failIn('section3', `${rel}: ${name}'s argument ${at + 1} is ${param ?? 'missing'}, not score; the recorder moved, so this read has to move with it`);
  }
  const importsOf = code => {
    const out = [];
    for (const m of code.matchAll(/import\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
      for (const part of m[1].split(',')) {
        const [orig, alias] = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
        if (orig) out.push({ name: orig.trim(), local: (alias ?? orig).trim(), from: m[2] });
      }
    }
    return out;
  };
  const moduleOf = (fileRel, spec) => {
    const bare = spec.startsWith('@/') ? `src/${spec.slice(2)}` : path.posix.normalize(path.posix.join(path.posix.dirname(fileRel), spec));
    return bare.replace(/\.(ts|tsx)$/, '');
  };
  /** null when `expr` is pointsFor(...).points from `engine`, else why not. */
  const whyNot = (fileRel, code, expr, engine) => {
    const member = String(expr ?? '').trim().match(/^([\s\S]+)\.points$/);
    if (!member) return `sends ${expr}, not pointsFor(...).points`;
    let target = member[1].trim();
    if (/^[A-Za-z_$][\w$]*$/.test(target)) target = resolveExpr(code, target);
    const call = target.match(/^([A-Za-z_$][\w$]*)\s*\(/);
    if (!call) return `sends ${expr}, and ${target} is not a call`;
    const inner = callsOf(target, call[1])[0];
    if (!inner || `${call[1]}(${inner.args.join(', ')})`.replace(/\s+/g, '') !== target.replace(/\s+/g, '')) return `sends ${expr}, which is more than one call`;
    const bound = importsOf(code).find(i => i.local === call[1]);
    if (!bound || bound.name !== 'pointsFor') return `calls ${call[1]}, which is not pointsFor imported from ${engine}`;
    const from = moduleOf(fileRel, bound.from);
    if (from !== engine.replace(/\.(ts|tsx)$/, '')) return `imports pointsFor from ${from}, not ${engine}`;
    return null;
  };
  /** The expression inside a JSX attribute's braces, from just after its '{'. */
  const braced = (code, from) => {
    let depth = 0;
    let quote = '';
    for (let i = from; i < code.length; i++) {
      const c = code[i];
      if (quote) { if (c === '\\') i += 1; else if (c === quote) quote = ''; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if ('([{'.includes(c)) depth += 1;
      if (')]}'.includes(c)) { if (depth === 0) return code.slice(from, i).trim(); depth -= 1; }
    }
    return '';
  };
  /** Every recorder in a file for `key`, as the expression it sends. */
  const sitesIn = (code, key, slugArg) => {
    const out = [];
    for (const [name, , at] of RECORDERS) {
      for (const c of callsOf(code, name)) {
        const slug = slugArg ? (c.args[0] === slugArg ? key : null) : (resolveSlug(code, c.args[0] ?? '') ?? '').replace(/^\//, '');
        if (slug === key) out.push(c.args[at]);
      }
    }
    const gp = code.match(/gamePath:\s*['"]\/([a-z0-9-]+)['"]/);
    if (gp && gp[1] === key) for (const m of code.matchAll(/completionScore=\{/g)) out.push(braced(code, m.index + m[0].length));
    return out;
  };
  let checked = 0;
  for (const row of LINE_ROWS) {
    const [siteFile, slugArg] = row.site;
    const sites = [];
    for (const rel of SRC.keys()) {
      if (RECORDERS.some(r => r[1] === rel)) continue;
      const code = stripComments(srcText(rel, 'recorders'));
      for (const expr of sitesIn(code, row.key, rel === siteFile ? slugArg : undefined)) sites.push([rel, code, expr]);
    }
    if (!sites.some(s => s[0] === siteFile)) failIn('section3', `${row.key}: no recorder in ${siteFile}`);
    for (const [rel, code, expr] of sites) {
      checked += 1;
      const why = whyNot(rel, code, expr, row.engine);
      if (why) failIn('section3', `${row.key} (${rel}) ${why}`);
    }
  }
  const PROBE_FILE = 'src/hooks/useProbe.ts';
  const PROBE_ENGINE = 'src/lib/probeEngine.ts';
  const SITE_PROBES = [
    ['a direct call', true, "import { pointsFor } from '@/lib/probeEngine';\nuseGameCompletion('probe', done, pointsFor(board, result).points, right);"],
    ['a local const and an alias', true, "import { pointsFor as probePoints } from '../lib/probeEngine';\nconst scored = probePoints(board, result);\nuseGameCompletion('probe', done, scored.points);"],
    ['the lib recorder', true, "import { pointsFor } from '@/lib/probeEngine';\nrecordCompletion('/probe', pointsFor(board, result).points);"],
    ['a raw number', false, "import { pointsFor } from '@/lib/probeEngine';\nuseGameCompletion('probe', done, right * 10);"],
    ['another field', false, "import { pointsFor } from '@/lib/probeEngine';\nuseGameCompletion('probe', done, pointsFor(board, result).result);"],
    ['another engine', false, "import { pointsFor } from '@/lib/otherEngine';\nuseGameCompletion('probe', done, pointsFor(board, result).points);"],
    ['a wrapped value', false, "import { pointsFor } from '@/lib/probeEngine';\nuseGameCompletion('probe', done, Math.max(5, pointsFor(board, result).points));"],
    ['a local stand in', false, "const pointsFor = (b, r) => ({ points: 100 });\nuseGameCompletion('probe', done, pointsFor(board, result).points);"],
    ['a sum of two calls', false, "import { pointsFor } from '@/lib/probeEngine';\nuseGameCompletion('probe', done, pointsFor(a, b).points + pointsFor(c, d).points);"],
  ];
  let probesRight = 0;
  for (const [label, pass, text] of SITE_PROBES) {
    const code = stripComments(text);
    const sites = sitesIn(code, 'probe');
    const verdicts = sites.map(e => whyNot(PROBE_FILE, code, e, PROBE_ENGINE));
    const passed = sites.length === 1 && verdicts[0] === null;
    if (passed !== pass) failIn('section3', `recorder probe "${label}" was ${passed ? 'passed' : `refused (${sites.length} sites, ${verdicts.join('; ')})`}, and should have been ${pass ? 'passed' : 'refused'}`);
    else probesRight += 1;
  }
  console.log(`   the recorder read: ${checked} recorder sites across ${LINE_ROWS.length} rows; ${probesRight} of ${SITE_PROBES.length} probes read right`);
}

/* ---------------- the verdict ---------------- */

const control = CONTROL ? CONTROLS[CONTROL] : null;
const copyLoaded = !control || LOADED.has(`${control.via}|${control.file}`);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* gone */ }
if (control) {
  if (!copyLoaded) {
    console.error(`\nsimKnowledgeLine control ${CONTROL}: RED. The ${control.via} reader never read the planted copy of ${control.file}, so the control proved nothing.`);
    process.exit(1);
  }
  const extra = [...red].filter(s => s !== control.section);
  if (red.has(control.section) && extra.length === 0) {
    console.log(`\nsimKnowledgeLine control ${CONTROL}: green. It turned ${control.section} red and nothing else, through the copy it planted.`);
    process.exit(0);
  }
  console.error(`\nsimKnowledgeLine control ${CONTROL}: RED. ${red.has(control.section) ? '' : `Did not turn ${control.section} red. `}${extra.length ? `Also turned ${extra.join(', ')} red.` : ''}`);
  process.exit(1);
}
if (failures) {
  console.error(`\nsimKnowledgeLine: ${failures} failure(s) in ${[...red].sort().join(', ')}.`);
  process.exit(1);
}
console.log(`\nsimKnowledgeLine: green. ${rows.length} keys filed once each with the seed the table's row by row, the line held board by board on ${PROBES.length} probes and ${CASES.length} cases, scale g's line of 0 held, and day points are made only in knowledgeLine.ts's mint.`);
