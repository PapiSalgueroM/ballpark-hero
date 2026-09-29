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
 *   1) The families. Every completion key src can send (the scan in
 *      scripts/lib/completionKeys.mjs, less the declared retirements) is filed
 *      in src/data/pointsFamilies.ts exactly once, in one family; every filed
 *      key is one src can send and has a game_score_caps row
 *      (scripts/data/gameScoreCaps.mjs), which the seed's foreign key needs;
 *      and the committed seed, scripts/data/gameRulesSeed.sql, is what
 *      scripts/genGameRules.mjs generates from the table now.
 *   2) The line. (a) Every paying game has a row in LINE_ROWS below and every
 *      row's game pays. (b) The runner plays each row over its boards (the
 *      365 dailies of 2026 for a static pool, or 400 seeded boards): every
 *      naive policy of the game's family, through the game's moves, averages
 *      at most 5 of 100 through the engine's pointsFor; a deterministic naive
 *      policy pays exactly 0 on every board; the oracle records exactly 100
 *      on every board; the 70 percent player averages at least 15 (an
 *      exception is printed with the round that clears it); no dealt board
 *      is without room. The runner is proved on every run on synthetic boards
 *      (the probes): a coin keyed true or false daily lined on its family
 *      must pass, and four boards must be caught, each for its own reason: a
 *      balanced key lined without counter (counter beats it), a line under
 *      the constant answer, a perfect one past the oracle, and a coin flip
 *      after every pick (no room for skill). (c) The perfect side of scale g:
 *      every typed family game with a perfect run driver in
 *      scripts/lib/scoreCeilingTable.mjs records exactly 100 through
 *      pointsFromCeiling on its perfect runs, and no run records past its
 *      ceiling, so the ceiling it would be valued at is a play the board
 *      really allows.
 *   3) The recorder sends the line. (a) tsc refuses a raw number as day
 *      points: src/lib/knowledgeLine.brand.ts is compiled against
 *      knowledgeLine.ts with the project's own settings and must come back
 *      clean, every marked line still an error. (b) Nothing in src mints a
 *      DayPoints but knowledgeLine.ts, once. (c) For every row in LINE_ROWS,
 *      every recorder of its game, read as code with comments stripped,
 *      sends `pointsFor(...).points` (directly or through one local const)
 *      with pointsFor imported from the row's engine. The recorder read is
 *      proved on every run on synthetic call sites: the shapes that must pass
 *      pass and the ones that must be refused (a raw number, another field,
 *      another engine, a wrapped value, a local stand in) are refused.
 *
 * AT ROUND 678 nothing pays yet (each game waits on its own round), so
 * LINE_ROWS is empty and 2(b) and 3(c) run on their probes alone. 2(c) and
 * the rest run on the real tree.
 *
 * NEGATIVE CONTROLS, KNOWLEDGE_LINE_CONTROL=<name>. Each writes one planted
 * copy of one file into this run's own temporary directory, refuses to run
 * unless its anchor occurs exactly once in that file's code (comments
 * stripped, line endings folded), proves the copy was read by the reader its
 * check uses (the key scan, the family bundle, the seed read, the framework
 * bundle, the ceiling bundle, the brand compile or the mint scan), and must
 * turn exactly its own section red:
 *   unclassified  Ball IQ gains a second recorder under a key the table has
 *                 never heard of: section1
 *   twofamilies   Footle is filed under choice as well as typed: section1
 *   staleseed     the committed seed moves Ball IQ's claim without the table:
 *                 section1
 *   unmeasured    the table flips Ball IQ to paying with no row here (the
 *                 seed copy regenerated with it, so only the missing row is
 *                 wrong): section2
 *   counterblind  counter picks the answer revealed most, so the balanced
 *                 probe is no longer caught: section2
 *   ceilingoff    the grid ceiling sits one cell above what a perfect grid
 *                 records: section2
 *   rawrecord     DayPoints loses its brand, so a raw number passes as day
 *                 points: section3
 *   mint          a DayPoints is minted outside knowledgeLine.ts: section3
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
import { loadFamilies, familyRows, seedSql, md5, FAMILIES_FILE, SEED_FILE } from './lib/gameRulesSeed.mjs';

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
   prove anything: keys, families, seed, framework, ceilings, tsc or mint. */
const CONTROLS = {
  unclassified: {
    section: 'section1',
    via: 'keys',
    file: 'src/hooks/useBallIq.ts',
    from: "useGameCompletion('ball-iq', finished, ballIqPoints(iq), correctCount);",
    to: "useGameCompletion('ball-iq', finished, ballIqPoints(iq), correctCount);\n  useGameCompletion('ball-iq-rapid', finished, ballIqPoints(iq), correctCount);",
  },
  twofamilies: {
    section: 'section1',
    via: 'families',
    file: FAMILIES_FILE,
    from: "      'teammates': waits('deal', '687', LUCK),",
    to: "      'teammates': waits('deal', '687', LUCK),\n      'footle': waits('first-action', '687', LUCK),",
  },
  staleseed: {
    section: 'section1',
    via: 'seed',
    file: SEED_FILE,
    from: "  ('ball-iq', 'choice', null, false, 'first-action', '681'),",
    to: "  ('ball-iq', 'choice', null, false, 'deal', '681'),",
  },
  unmeasured: {
    section: 'section2',
    via: 'families',
    file: FAMILIES_FILE,
    from: "      'ball-iq': waits('first-action', '681', LUCK),",
    to: "      'ball-iq': paid('dp', 'first-action', '681'),",
    reseed: true,
  },
  counterblind: {
    section: 'section2',
    via: 'framework',
    file: 'src/lib/naivePolicies.ts',
    from: 'if (count(opts[i].key) < count(opts[at].key)) at = i;',
    to: 'if (count(opts[i].key) > count(opts[at].key)) at = i;',
  },
  ceilingoff: {
    section: 'section2',
    via: 'ceilings',
    file: 'src/lib/gridScore.ts',
    from: 'export const GRID_CEILING = gridScore(GRID_CELLS);',
    to: 'export const GRID_CEILING = gridScore(GRID_CELLS) + GRID_CELL_POINTS;',
  },
  rawrecord: {
    section: 'section3',
    via: 'tsc',
    file: 'src/lib/knowledgeLine.ts',
    from: 'export type DayPoints = number & { readonly __dayPoints: true };',
    to: 'export type DayPoints = number;',
  },
  mint: {
    section: 'section3',
    via: 'mint',
    file: 'src/lib/pointsHowTo.ts',
    from: 'export function pointsOf(points: number): string {',
    to: 'export const MINTED = 62 as DayPoints;\nexport function pointsOf(points: number): string {',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`KNOWLEDGE_LINE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

/* Every run gets its own directory: the ceiling bundle, the families bundle
   and any planted copy live there, never in dist or src. */
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
  plant(c.file, text.replace(c.from, c.to));
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
/* The shapes a file must hold before the key scan reads it for recorders. */
const RECORDS = /useGameCompletion\(|recordCompletion\(|recordCompletionOnMount|gameId:/;

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

/* ---------------- section 1: the families ---------------- */

console.log('1) every sendable key is filed in exactly one family, and the seed is the table');
let rows = [];
try {
  const groups = await loadFamilies(ROOT, TMP, [copyPlugin('families')]);
  rows = familyRows(groups);
  if (CONTROL && CONTROLS[CONTROL].reseed) plant(SEED_FILE, seedSql(groups));
  /* The key scan reads src from disk; a planted recorder is scanned beside it. */
  const extra = [...COPIES.keys()]
    .filter(r => r.startsWith('src/') && RECORDS.test(fs.readFileSync(COPIES.get(r), 'utf8')))
    .map(r => source(r, 'keys'));
  const retired = declaredRetirements(ROOT);
  if (!retired) failIn('section1', 'src/data/completionSlugs.ts no longer holds RETIRED_COMPLETION_SLUGS where this reads it');
  const sendable = new Set([...sourceCompletionKeys(ROOT, extra)].filter(k => !retired?.has(k)));
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
    else if (!sendable.has(key)) failIn('section1', `${key} is filed but nothing in src sends it`);
    if (!caps.has(key)) failIn('section1', `${key} has no game_score_caps row, so its game_rules row would break the foreign key`);
  }
  let seed = null;
  try {
    seed = seedSql(groups);
  } catch (e) {
    failIn('section1', e.message);
  }
  if (seed !== null) {
    const committed = fs.existsSync(path.join(ROOT, SEED_FILE)) || COPIES.has(SEED_FILE) ? source(SEED_FILE, 'seed') : null;
    if (committed !== seed) {
      const have = (committed ?? '').split('\n');
      const first = seed.split('\n').find(l => !have.includes(l)) ?? have.find(l => !seed.split('\n').includes(l));
      failIn('section1', `${SEED_FILE} is not what the table generates (first difference: ${first}). Run node scripts/genGameRules.mjs.`);
    }
  }
  const byFamily = new Map();
  for (const [, family, rule] of rows) byFamily.set(family, [...(byFamily.get(family) ?? []), rule]);
  const paying = rows.filter(r => r[2].pays).length;
  console.log(`   ${sendable.size} sendable keys, ${rows.length} filed: ${[...byFamily].map(([f, rs]) => `${f} ${rs.length}`).join(', ')}; ${paying} paying${seed ? `; seed md5 ${md5(seed)}` : ''}`);
  const waiting = new Map();
  for (const [key, , rule] of rows) if (!rule.pays) waiting.set(rule.round, [...(waiting.get(rule.round) ?? []), key]);
  console.log(`   waiting: ${[...waiting].sort().map(([r, ks]) => `${r === 'none' ? 'never scored' : `Round ${r}`} ${ks.length}`).join(', ')}`);
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
 * Rows need a bundle of their engines, which Round 681 brings with the first.
 */
const LINE_ROWS = [];

const mean = xs => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const days2026 = Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));

/** Plays one row through the framework; returns its failures, each with a kind. */
function measureRow(row) {
  const fails = [];
  const note = (kind, msg) => fails.push({ kind, msg });
  const sums = new Map();
  let k70 = 0;
  let boards = 0;
  let deterministicPays = 0;
  let oracleMisses = 0;
  let roomless = 0;
  try {
    for (const board of row.boards()) {
      boards += 1;
      const m = row.moves(board);
      const at = v => row.points(board, v);
      const first = at(0);
      if (!(first.perfect > first.line)) roomless += 1;
      for (const p of N.policiesFor(row.policies, m)) {
        const out = N.outcomeOf(m, p, board.salt);
        const pts = out.results.reduce((s, r) => s + r.weight * at(r.value).points, 0);
        sums.set(p.name, (sums.get(p.name) ?? 0) + pts);
        if (out.deterministic && pts !== 0) {
          deterministicPays += 1;
          if (deterministicPays <= 3) note('deterministic', `${p.name} always ends on ${out.results[0].value} on board ${board.salt} and is paid ${pts}`);
        }
      }
      for (const r of N.outcomeOf(m, N.ORACLE, board.salt).results) {
        if (at(r.value).points !== 100) {
          oracleMisses += 1;
          if (oracleMisses <= 3) note('oracle', `the oracle ends on ${r.value} on board ${board.salt} and records ${at(r.value).points}, not 100`);
        }
      }
      const k = N.outcomeOf(m, N.KNOWLEDGE_70, board.salt);
      k70 += k.results.reduce((s, r) => s + r.weight * at(r.value).points, 0);
    }
  } catch (e) {
    note('error', e.message ?? String(e));
    return { fails, means: new Map(), k70: 0, boards };
  }
  const means = new Map([...sums].map(([name, s]) => [name, s / boards]));
  for (const [name, avg] of means) if (avg > K.NAIVE_LIMIT) note(`naive:${name}`, `${name} averages ${avg.toFixed(2)} of 100 over ${boards} boards (limit ${K.NAIVE_LIMIT})`);
  if (deterministicPays > 3) note('deterministic', `and ${deterministicPays - 3} more boards where a deterministic policy is paid`);
  if (oracleMisses > 3) note('oracle', `and ${oracleMisses - 3} more oracle runs short of 100`);
  if (roomless > 0) note('noroom', `${roomless} of ${boards} boards dealt with no room above the line`);
  const k70mean = k70 / Math.max(1, boards);
  if (k70mean < K.SKILL_FLOOR && !row.headroom) note('headroom', `the 70 percent player averages ${k70mean.toFixed(2)} (floor ${K.SKILL_FLOOR})`);
  return { fails, means, k70: k70mean, boards };
}

/* The probes: a true or false daily of ten items dealt the way the spec
   deals Champ or Not, lined by an engine written the way each game's will
   be (measureBoard at deal time, a redraw when the board has no room). */
function tfBoard(day, balanced) {
  const rng = N.saltedRng(`probe|${balanced ? 'balanced' : 'coin'}|${day}`);
  let answers;
  if (balanced) {
    answers = [true, true, true, true, true, false, false, false, false, false];
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
  } else {
    answers = Array.from({ length: 10 }, () => rng() < 0.5);
  }
  return { salt: `probe|${day}`, answers };
}
function tfMoves(board, luck) {
  return {
    chance: luck,
    start: () => ({ i: 0, right: 0, revealed: [] }),
    options: () => [{ key: 'true' }, { key: 'false' }],
    play: (s, index, ctx) => {
      const truth = board.answers[s.i];
      const right = luck ? ctx.rng() < 0.5 : (index === 0) === truth;
      return { i: s.i + 1, right: s.right + (right ? 1 : 0), revealed: [...s.revealed, truth ? 'true' : 'false'] };
    },
    done: s => s.i >= board.answers.length,
    result: s => s.right,
    best: s => (board.answers[s.i] ? 0 : 1),
    revealed: s => s.revealed,
  };
}
const CHOICE_POLICIES = ['topListed', 'constant', 'random', 'counter'];
function probeRow(label, { balanced = false, luck = false, days = 120, enginePolicies = CHOICE_POLICIES, lineOf, perfectOf }) {
  const dealt = new Map();
  const deal = day => {
    if (dealt.has(day)) return dealt.get(day);
    for (let k = 0; k < 20; k++) {
      const board = tfBoard(`${day}#${k}`, balanced);
      const m = tfMoves(board, luck);
      const measured = N.measureBoard(m, enginePolicies, board.salt);
      const line = lineOf ? lineOf(measured) : measured.line;
      const perfect = perfectOf ? perfectOf(measured) : measured.perfect;
      if (K.hasRoom({ perfect }, line)) {
        const b = { ...board, line, perfect };
        dealt.set(day, b);
        return b;
      }
    }
    throw new Error(`${label}: no board with room in 20 draws on ${day}`);
  };
  return {
    key: label,
    policies: CHOICE_POLICIES,
    boards: () => days2026.slice(0, days).map(deal),
    moves: b => tfMoves(b, luck),
    points: (b, result) => K.pointsAnswer(result, b.line, b.perfect, 'right'),
  };
}
const maxDeterministic = measured => Math.max(...measured.outcomes.filter(o => o.deterministic).map(o => o.results[0].value));
const PROBES = [
  { row: probeRow('coin keyed daily, lined on its family', { days: 365 }), want: [] },
  { row: probeRow('balanced key lined without counter', { balanced: true, enginePolicies: ['topListed', 'constant', 'random'] }), want: ['naive:counter'] },
  { row: probeRow('line under the constant answer', { lineOf: m => maxDeterministic(m) - 1 }), want: ['deterministic'] },
  { row: probeRow('perfect past the oracle', { perfectOf: m => m.perfect + 1 }), want: ['oracle'] },
  { row: probeRow('a coin flip after every pick', { luck: true, days: 60 }), want: ['headroom'] },
];

console.log('2) the line: every paying game measured, and the runner proved');
{
  const paying = rows.filter(r => r[2].pays).map(r => r[0]);
  const rowKeys = new Set(LINE_ROWS.map(r => r.key));
  for (const key of paying) if (!rowKeys.has(key)) failIn('section2', `${key} pays and no row in LINE_ROWS measures it`);
  for (const key of rowKeys) if (!paying.includes(key)) failIn('section2', `LINE_ROWS measures ${key}, which does not pay`);
  for (const row of LINE_ROWS) {
    const rs = measureRow(row);
    for (const f of rs.fails) failIn('section2', `${row.key}: ${f.msg}`);
    if (row.headroom && rs.k70 < K.SKILL_FLOOR) console.log(`   ${row.key}: the 70 percent player averages ${rs.k70.toFixed(2)}, allowed until Round ${row.headroom}`);
    console.log(`   ${row.key}: ${rs.boards} boards, ${[...rs.means].map(([n, v]) => `${n} ${v.toFixed(2)}`).join(', ')}, 70 percent ${rs.k70.toFixed(1)}`);
  }
  console.log(`   ${paying.length} paying games, ${LINE_ROWS.length} rows`);
  for (const { row, want } of PROBES) {
    const rs = measureRow(row);
    const kinds = new Set(rs.fails.map(f => f.kind));
    const missing = want.filter(k => !kinds.has(k));
    const extra = want.length === 0 ? [...kinds] : [...kinds].filter(k => k === 'error');
    if (missing.length || extra.length) {
      failIn('section2', `probe "${row.key}": ${missing.length ? `not caught for ${missing.join(', ')}` : ''}${extra.length ? ` flagged ${extra.join(', ')} (${rs.fails.map(f => f.msg).join('; ')})` : ''}`);
    }
    const detail = [...rs.means].map(([n, v]) => `${n} ${v.toFixed(1)}`).join(', ');
    console.log(`   probe "${row.key}": ${want.length ? `caught (${[...kinds].join(', ')})` : 'passes'}; ${detail}, 70 percent ${rs.k70.toFixed(1)}`);
  }
}

/* The perfect side of scale g, off the drivers the caps fence already plays. */
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
      const past = runs.filter(r => r.score > ceiling.value);
      if (past.length) failIn('section2', `${key}: ${past.length} runs record past the ${ceiling.value} ceiling, first "${past[0].label}" at ${past[0].score}`);
      proved.push(key);
    }
    console.log(`   scale g's perfect side: ${proved.length} typed games record exactly 100 on a perfect run; ${waiting.length} have no offline driver yet and prove theirs in Round 687 (${waiting.filter(k => UNPLAYED[k]).length} of them listed with a reason in scoreCeilingTable)`);
  }
}

/* ---------------- section 3: the recorder sends the line ---------------- */

console.log('3) the recorder sends the line: the brand, the mint and the recorder read');
const BRAND_FILE = 'src/lib/knowledgeLine.brand.ts';
{
  /* (a) tsc on the brand file, with the project's own settings. */
  const ts = require('typescript');
  const settings = JSON.parse(readLF('tsconfig.app.json')).compilerOptions;
  const { options, errors } = ts.convertCompilerOptionsFromJson({ ...settings, types: [], paths: undefined }, ROOT);
  if (errors.length) failIn('section3', `tsconfig.app.json's settings did not convert: ${errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('; ')}`);
  const host = ts.createCompilerHost(options);
  const fromDisk = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, language, ...rest) => {
    const rel = relOf(fileName);
    if (rel.startsWith('src/') && fs.existsSync(path.join(ROOT, rel))) return ts.createSourceFile(fileName, source(rel, 'tsc'), language, true);
    return fromDisk(fileName, language, ...rest);
  };
  const program = ts.createProgram([path.join(ROOT, BRAND_FILE)], { ...options, noEmit: true }, host);
  const diags = ts.getPreEmitDiagnostics(program);
  const markers = (readLF(BRAND_FILE).match(/@ts-expect-error/g) ?? []).length;
  const inProgram = program.getSourceFiles().map(f => relOf(f.fileName)).filter(r => r.startsWith('src/'));
  if (markers < 2) failIn('section3', `${BRAND_FILE} carries ${markers} raw number markers, so it holds nothing`);
  if (!inProgram.includes('src/lib/knowledgeLine.ts')) failIn('section3', `${BRAND_FILE} was compiled without knowledgeLine.ts`);
  for (const d of diags) {
    const where = d.file ? `${relOf(d.file.fileName)}:${d.file.getLineAndCharacterOfPosition(d.start).line + 1}` : 'tsc';
    failIn('section3', `${where}: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
  }
  console.log(`   the brand: ${BRAND_FILE} compiles clean with ${markers} raw numbers still refused (${inProgram.length} src files in the program)`);

  /* (b) Only knowledgeLine.ts mints a DayPoints. A file that declares a
     DayPoints of its own and takes none from the knowledge line means its own
     type by the name (src/lib/streaks.ts keeps Round 648's day record under
     it until Round 690 removes that code), so its casts are not this brand. */
  const files = srcFiles(ROOT);
  for (const rel of COPIES.keys()) if (files.has(rel)) files.set(rel, source(rel, 'mint'));
  const mints = [];
  let ownName = 0;
  for (const [rel, text] of files) {
    const code = stripComments(text);
    const takesBrand = /import\s*(?:type\s+)?\{[^}]*\bDayPoints\b[^}]*\}\s*from\s*['"][^'"]*knowledgeLine['"]/.test(code);
    if (!takesBrand && /\b(?:interface|type|class)\s+DayPoints\b/.test(code) && rel !== 'src/lib/knowledgeLine.ts') { ownName += 1; continue; }
    for (const m of code.matchAll(/\bas\s+DayPoints\b|<DayPoints>/g)) mints.push(`${rel}:${code.slice(0, m.index).split('\n').length}`);
  }
  if (mints.length !== 1 || !mints[0].startsWith('src/lib/knowledgeLine.ts:')) {
    failIn('section3', `a DayPoints may be minted once, in src/lib/knowledgeLine.ts; found ${mints.length}: ${mints.join(', ') || 'none'}`);
  }
  console.log(`   the mint: ${mints.length} cast to DayPoints in ${files.size} src files, at ${mints.join(', ')}; ${ownName} file(s) with a DayPoints of their own skipped`);

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
    for (const [rel, text] of files) {
      if (RECORDERS.some(r => r[1] === rel)) continue;
      const code = stripComments(text);
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
console.log(`\nsimKnowledgeLine: green. ${rows.length} keys filed once each with the seed in step, the runner proved on ${PROBES.length} probes, scale g's perfect side held, and only knowledgeLine.ts makes day points.`);
