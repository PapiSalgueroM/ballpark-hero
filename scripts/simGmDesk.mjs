/* Round 907: the GM desk seam (gmSport, gmDesk, GmDeskMount).
 *
 * The four Front Office sims are about to grow the systems Club Manager
 * already has (contract talks, draft capital, a staff desk), each built once
 * and shared. This round is only the seam they hang on: one sport descriptor,
 * one optional save block read a block at a time, one mount that draws a
 * caller's panels as hub boxes. Nothing a player sees ships with it, so there
 * is no game to play here. What CAN go wrong is exactly what this harness
 * walks: a sport missing a field, a descriptor number that drifts from the
 * engine rule it mirrors, a corrupt block being trusted or taking its
 * neighbours down with it, an old save not opening clean, and an empty panel
 * list leaving a gap on the hub.
 *
 * CHECKS
 *   1  every sport declares every field, and all four in the same shape
 *   2  every number and word in the descriptor mirrors the engine constant or
 *      the board line it copies (so the two cannot quietly disagree)
 *   3  a desk with one corrupt block: that block comes back fresh, every other
 *      block comes back as stored, and a write keeps the others
 *   4  a save with no gm block, or an envelope this build does not know, is a
 *      fresh desk, and the save itself is not touched
 *   5  an empty panel list draws nothing, on all four sports (with a non empty
 *      list beside it as the baseline, so "nothing" is not a dead renderer)
 *   6  hub boxes: keyed apart from a board's own, the first of a repeated key
 *      only, and a tile that says null left off
 *
 * NEGATIVE CONTROLS, each a source rewrite applied at bundle time and never on
 * disk. GM_DESK_CONTROL=<name>; the named check must go red and no other.
 *   nofield     gmSport.ts loses one descriptor field (MLB's coach)   check 1
 *   drift       gmSport.ts says MLB plays 26 rounds, not 27           check 2
 *   failopen    gmBlock returns a block without asking its validator  check 3
 *   dropothers  withGmBlock writes one block and forgets the rest     check 3
 *   trustany    readGmDesk stops reading the envelope version         check 4
 *   ghost       the mount keeps its wrapper when there are no boxes   check 5
 *   nodedupe    gmDeskTiles draws a repeated key twice                check 6
 * A control whose anchor is not in the file aborts with exit 2 ("control
 * cannot run") instead of passing, and every anchor is one line, so it
 * matches on a CRLF checkout as well as an LF one.
 *
 * NO BANDS, AND WHY. Nothing in these three files draws a random number or
 * simulates anything, so there is no distribution to measure and no margin to
 * set: every check is exact. What is measured is how much each check walked,
 * and the floors below are those counts, so a walk that quietly shrinks
 * cannot pass for want of cases. Measured 2026-10-02, identical on SIM_SEED
 * unset, 1, 2 and 3 (the seed changes nothing here, which is the point):
 *     fields read (1)                 68   floor 68
 *     mirrors compared (2)            46   floor 46
 *     corrupt block cases (3)         70   floor 70
 *     envelope cases (4)              20   floor 20
 *     renders (5)                     20   floor 20
 * The walk is fixed lists, not a sample, so each floor is the count itself:
 * dropping a case on purpose means changing its floor on purpose.
 * Check 2 does not cover cap.model for the NFL, NBA and NHL: no engine
 * exports a constant that says "hard" or "soft", so there is nothing to
 * mirror it against. MLB's line word is checked against its board.
 *
 * Reaches no network: the bundle is the four engines, their committed data
 * and three new files, and the run refuses to load a bundle that names the
 * database host or its client (exit 2).
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const lf = s => s.replaceAll('\r\n', '\n');
const J = v => JSON.stringify(v);

const CONTROL = process.env.GM_DESK_CONTROL || '';
const CONTROLS = { nofield: '1', drift: '2', failopen: '3', dropothers: '3', trustany: '4', ghost: '5', nodedupe: '6' };
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`GM_DESK_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

/* Floors: the measured size of each walk, see the header. */
const T = { minFields: 68, minMirrors: 46, minCorrupt: 70, minNotDesk: 20, minRenders: 20 };

/* The node_modules that holds react and esbuild, found by walking up, so a
   worktree inside the repo resolves the main one the way node itself does. */
function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'react', 'package.json')) && fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) { console.error(`no node_modules with react and esbuild above ${ROOT}`); process.exit(2); }
    d = up;
  }
}
const NM = modulesDir();

/* ---- failures, attributed to the check they fell in ---- */
let check = '';
const failedIn = new Map();
const fail = m => {
  const n = (failedIn.get(check) ?? 0) + 1;
  failedIn.set(check, n);
  if (n <= 8) console.error(`  FAIL [${check}]: ${m}`);
  else if (n === 9) console.error(`  FAIL [${check}]: (further failures in this check not printed)`);
};
const begin = (id, title) => { check = id; console.log(`${id}) ${title}`); };
const same = (a, b) => J(a) === J(b);

/* ---- the controls: source rewrites applied at bundle time, never on disk ---- */
const FILES = {
  sport: path.join(ROOT, 'src', 'lib', 'gmSport.ts'),
  desk: path.join(ROOT, 'src', 'lib', 'gmDesk.ts'),
  mount: path.join(ROOT, 'src', 'components', 'front-office-shared', 'GmDeskMount.tsx'),
};
const EDITS = {
  nofield: ['sport', "released: 'You designated him for assignment this season.', coach: 'manager',",
    "released: 'You designated him for assignment this season.',"],
  drift: ['sport', '    periods: 27,', '    periods: 26,'],
  failopen: ['desk', '      if (isValid(v)) return v as T;', '      return v as T;'],
  dropothers: ['desk', 'blocks: { ...desk.blocks, [key]: value } };', 'blocks: { [key]: value } };'],
  trustany: ['desk', 'if (!isBag(raw) || raw.v !== GM_DESK_VERSION || !isBag(raw.blocks)) return freshGmDesk();',
    'if (!isBag(raw) || !isBag(raw.blocks)) return freshGmDesk();'],
  ghost: ['mount', '  if (tiles.length === 0) return null;', ''],
  nodedupe: ['desk', '    if (seen.has(p.key)) continue;', ''],
};
const overrides = new Map();
if (CONTROL) {
  const [which, from, to] = EDITS[CONTROL];
  const src = lf(fs.readFileSync(FILES[which], 'utf8'));
  if (!src.includes(from)) {
    console.error(`control cannot run: ${path.basename(FILES[which])} is not in the shape GM_DESK_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
    process.exit(2);
  }
  if (src.split(from).length !== 2) {
    console.error(`control cannot run: ${path.basename(FILES[which])} carries the line GM_DESK_CONTROL=${CONTROL} rewrites more than once`);
    process.exit(2);
  }
  const out = src.replace(from, to);
  if (out === src) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
  overrides.set(path.resolve(FILES[which]).toLowerCase(), out);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; check ${CONTROLS[CONTROL]} must go red, and no other check`);
}

/* ---- one bundle, in a folder of this run's own so two runs cannot mix ---- */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simGmDesk-')).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as sport from '${ROOT_URL}/src/lib/gmSport.ts';
export * as desk from '${ROOT_URL}/src/lib/gmDesk.ts';
export { GmDeskMount } from '${ROOT_URL}/src/components/front-office-shared/GmDeskMount.tsx';
export * as nfl from '${ROOT_URL}/src/lib/frontOffice.ts';
export * as nba from '${ROOT_URL}/src/lib/nbaFrontOffice.ts';
export * as nbaTax from '${ROOT_URL}/src/lib/nbaLuxuryTax.ts';
export * as mlb from '${ROOT_URL}/src/lib/mlbFrontOffice.ts';
export * as nhl from '${ROOT_URL}/src/lib/nhlFrontOffice.ts';
export * as cuts from '${ROOT_URL}/src/lib/frontOfficeCuts.ts';
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
export const h = React.createElement;
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
const esbuild = createRequire(`${NM}/`)('esbuild');
await esbuild.build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  alias: { '@': `${ROOT_URL}/src` },
  outfile: BUNDLE,
  logLevel: 'error',
  plugins: [{
    name: 'control',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const hit = overrides.get(path.resolve(args.path).toLowerCase());
        if (hit === undefined) return undefined;
        return { contents: hit, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    },
  }],
});
/* Production is off limits to a harness. This one bundles four engines it did
   not write, so before a line of the bundle runs, prove none of them pulled
   the database client in. A refusal, not a check: it says nothing about the
   seam, only that this run is allowed to happen. */
{
  const text = fs.readFileSync(BUNDLE, 'utf8');
  for (const host of ['supabase.co', 'integrations/supabase']) {
    if (text.includes(host)) { console.error(`refusing to run: the bundle names ${host}, so loading it could reach the live database`); process.exit(2); }
  }
}
const M = createRequire(import.meta.url)(BUNDLE);
const { GM_SPORTS, GM_SPORT_KEYS } = M.sport;
const { freshGmDesk, readGmDesk, gmBlock, withGmBlock, gmDeskTiles, gmPanelFor, gmTileKey, GM_DESK_VERSION } = M.desk;
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const own = (o, k) => o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);

/* ================================================================== */
begin('1', 'every sport declares every field');
const WORD_FIELDS = ['title', 'playoffs', 'round', 'league', 'period', 'play', 'release', 'released', 'coach'];
const CAP_MODELS = ['hard', 'softTax', 'cbtLine'];
let fields = 0;
const words = (sport, where, o, k) => {
  fields++;
  if (!own(o, k) || typeof o[k] !== 'string' || o[k].trim() === '') fail(`${sport}: ${where}.${k} is ${J(o?.[k])}, wanted words`);
};
const count = (sport, where, o, k) => {
  fields++;
  if (!own(o, k) || !Number.isInteger(o[k]) || o[k] <= 0) fail(`${sport}: ${where}.${k} is ${J(o?.[k])}, wanted a whole number above zero`);
};
if (!same(GM_SPORT_KEYS, SPORTS)) fail(`GM_SPORT_KEYS is ${J(GM_SPORT_KEYS)}, wanted ${J(SPORTS)}`);
if (!same(Object.keys(GM_SPORTS ?? {}).sort(), [...SPORTS].sort())) fail(`GM_SPORTS holds ${J(Object.keys(GM_SPORTS ?? {}))}, wanted exactly ${J(SPORTS)}`);
/* Every key path an object carries, so "the same shape" is a string compare. */
const shape = (o, at = '') => (o !== null && typeof o === 'object'
  ? Object.keys(o).sort().flatMap(k => shape(o[k], `${at}.${k}`))
  : [at]);
for (const k of SPORTS) {
  const s = GM_SPORTS?.[k];
  if (!s) { fail(`${k}: no descriptor`); continue; }
  fields++;
  if (s.key !== k) fail(`${k}: key is ${J(s.key)}`);
  for (const f of WORD_FIELDS) words(k, 'words', s.words, f);
  count(k, 'words', s.words, 'games');
  count(k, 'descriptor', s, 'periods');
  count(k, 'roster', s.roster, 'min');
  count(k, 'roster', s.roster, 'max');
  fields++;
  if (!own(s.roster, 'floor')) fail(`${k}: roster.floor is not declared (a sport with none says null, it does not leave the field out)`);
  else if (s.roster.floor !== null && !(Number.isInteger(s.roster.floor) && s.roster.floor > s.roster.min && s.roster.floor <= s.roster.max)) {
    fail(`${k}: roster.floor ${J(s.roster.floor)} is neither null nor a count above min ${s.roster.min} and at most max ${s.roster.max}`);
  }
  if (own(s.roster, 'min') && own(s.roster, 'max') && !(s.roster.min < s.roster.max)) fail(`${k}: roster.min ${s.roster.min} is not below roster.max ${s.roster.max}`);
  fields++;
  if (!own(s.cap, 'model') || !CAP_MODELS.includes(s.cap.model)) fail(`${k}: cap.model is ${J(s.cap?.model)}, wanted one of ${J(CAP_MODELS)}`);
  words(k, 'cap', s.cap, 'line');
  if (!same(shape(s), shape(GM_SPORTS.nfl))) {
    const a = new Set(shape(s)), b = new Set(shape(GM_SPORTS.nfl));
    const missing = [...b].filter(p => !a.has(p)), extra = [...a].filter(p => !b.has(p));
    fail(`${k}: not the NFL descriptor's shape (missing ${J(missing)}, extra ${J(extra)})`);
  }
  try {
    if (M.sport.gmSport(k) !== s) fail(`${k}: gmSport('${k}') is not GM_SPORTS.${k}`);
  } catch (e) { fail(`${k}: gmSport threw ${e.message}`); }
}
let threw = false;
try { M.sport.gmSport('xfl'); } catch { threw = true; }
if (!threw) fail("gmSport('xfl') handed back a descriptor; a sport that is not one of the four must throw");
if (fields < T.minFields) fail(`only ${fields} fields read, wanted at least ${T.minFields}`);
console.log(`   ${fields} fields read across ${SPORTS.length} sports`);

/* ================================================================== */
begin('2', 'the descriptor mirrors the engines and the boards');
let mirrors = 0;
const mirror = (what, got, want) => {
  mirrors++;
  if (want === undefined) fail(`${what}: the game no longer exports or declares the thing this mirrors, so it cannot be checked`);
  else if (got !== want) fail(`${what}: the descriptor says ${J(got)}, the game says ${J(want)}`);
};
const S = GM_SPORTS;
mirror('nfl.periods vs REGULAR_WEEKS', S.nfl?.periods, M.nfl.REGULAR_WEEKS);
mirror('nfl.roster.min vs NFL_ROSTER_MIN', S.nfl?.roster.min, M.nfl.NFL_ROSTER_MIN);
mirror('nfl.roster.max vs DEEP_ROSTER_MAX', S.nfl?.roster.max, M.nfl.DEEP_ROSTER_MAX);
mirror('nba.periods vs NBA_ROUNDS', S.nba?.periods, M.nba.NBA_ROUNDS);
mirror('nba.roster.min vs NBA_ROSTER_MIN', S.nba?.roster.min, M.nba.NBA_ROSTER_MIN);
mirror('nba.roster.max vs NBA_ROSTER_MAX', S.nba?.roster.max, M.nba.NBA_ROSTER_MAX);
mirror('nba.roster.floor vs NBA_TIPOFF_MIN', S.nba?.roster.floor, M.nbaTax.NBA_TIPOFF_MIN);
mirror('mlb.periods vs MLB_ROUNDS', S.mlb?.periods, M.mlb.MLB_ROUNDS);
mirror('mlb.roster.min vs MLB_ROSTER_MIN', S.mlb?.roster.min, M.mlb.MLB_ROSTER_MIN);
mirror('mlb.roster.max vs MLB_ROSTER_MAX', S.mlb?.roster.max, M.mlb.MLB_ROSTER_MAX);
mirror('nhl.periods vs NHL_FO_ROUNDS', S.nhl?.periods, M.nhl.NHL_FO_ROUNDS);
mirror('nhl.roster.min vs NHL_ROSTER_MIN', S.nhl?.roster.min, M.nhl.NHL_ROSTER_MIN);
mirror('nhl.roster.max vs NHL_ROSTER_MAX', S.nhl?.roster.max, M.nhl.NHL_ROSTER_MAX);

/* The words live as constants on the four boards. Read the CODE, not the
   comments: prose about a constant is the one place its text is sure to be. */
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const BOARDS = {
  nfl: 'src/components/front-office/FrontOfficeBoard.tsx',
  nba: 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx',
  mlb: 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx',
  nhl: 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx',
};
const WORDS_LINE = /const [A-Z]+_WORDS: FoSportWords = \{ title: '([^']+)', playoffs: '([^']+)', round: '([^']+)', games: (\d+) \};/;
for (const k of SPORTS) {
  const code = stripComments(lf(fs.readFileSync(path.join(ROOT, BOARDS[k]), 'utf8')));
  const w = code.match(WORDS_LINE);
  mirror(`${k}.words.title vs the board`, S[k]?.words.title, w?.[1]);
  mirror(`${k}.words.playoffs vs the board`, S[k]?.words.playoffs, w?.[2]);
  mirror(`${k}.words.round vs the board`, S[k]?.words.round, w?.[3]);
  mirror(`${k}.words.games vs the board`, S[k]?.words.games, w ? Number(w[4]) : undefined);
  mirror(`${k}.words.play vs the board's playWord`, S[k]?.words.play, code.match(/^\s*playWord: '([^']+)',$/m)?.[1]);
  mirror(`${k}.words.period vs the board's periodWord`, S[k]?.words.period, code.match(/^\s*periodWord: '([^']+)',$/m)?.[1]);
  /* Only the NBA board hands its hub a tip off floor. */
  mirror(`${k}.roster.floor set vs the board passing rosterFloor`, S[k]?.roster.floor !== null, /^\s*rosterFloor: /m.test(code));
  if (k === 'nfl') {
    /* The NFL board says nothing of its own: it takes the shared default. */
    const said = M.cuts.signRefusal({ releasedThisSeason: ['x'] }, 'x') ?? '';
    mirror('nfl.words.released vs the shared refusal', said.startsWith(`${S.nfl?.words.released} `), true);
  } else {
    mirror(`${k}.words.released vs the board's CUT_SAID`, S[k]?.words.released, code.match(/^const CUT_SAID = '([^']+)';$/m)?.[1]);
  }
  if (k === 'mlb') mirror('mlb.cap.line vs the board', code.includes(`M ${S.mlb?.cap.line}`), true);
}
if (mirrors < T.minMirrors) fail(`only ${mirrors} mirrors compared, wanted at least ${T.minMirrors}`);
console.log(`   ${mirrors} mirrors compared`);

/* ================================================================== */
begin('3', 'a corrupt block resets that block alone');
/* Three systems the way the real ones will be written: a key, a validator, a
   fresh value. One validator checks a list, one its own inner version, and
   one throws on a shape it does not expect, which must count as a no. */
const SYSTEMS = {
  contracts: {
    isValid: v => own(v, 'offers') && Array.isArray(v.offers) && v.offers.every(o => typeof o === 'string'),
    fresh: () => ({ offers: [] }), good: { offers: ['two years', 'one year'] }, half: { offers: ['two years', 2] },
  },
  picks: {
    isValid: v => own(v, 'v') && v.v === 1 && Number.isInteger(v.owned) && v.owned >= 0,
    fresh: () => ({ v: 1, owned: 7 }), good: { v: 1, owned: 3 }, half: { v: 1, owned: -1 },
  },
  staff: {
    isValid: v => { if (typeof v.scout !== 'string') throw new TypeError('no scout on this block'); return v.scout.length > 0; },
    fresh: () => ({ scout: 'none' }), good: { scout: 'area' }, half: { scout: '' },
  },
};
/* A block from a system this build does not load. Nobody validates it, and it must ride along untouched. */
const LATER = { any: ['thing'], n: 4 };
const ABSENT = Symbol('absent');
const GENERIC = [ABSENT, null, 7, 'text', true, [], [1, 2], {}, { wrong: 1 }, { v: 99 }];
const sysKeys = Object.keys(SYSTEMS);
const goodBlocks = () => ({ ...Object.fromEntries(sysKeys.map(k => [k, structuredClone(SYSTEMS[k].good)])), later: structuredClone(LATER) });

/* Baseline first: with nothing corrupt every block comes back as stored, so
   "fresh" below is a decision and not the only thing gmBlock can say. */
{
  const desk = readGmDesk(JSON.parse(J({ v: GM_DESK_VERSION, blocks: goodBlocks() })));
  for (const k of sysKeys) {
    const got = gmBlock(desk, k, SYSTEMS[k].isValid, SYSTEMS[k].fresh);
    if (!same(got, SYSTEMS[k].good)) fail(`baseline: a good ${k} block came back as ${J(got)}`);
  }
}
let corruptCases = 0;
for (const sys of sysKeys) {
  for (const bad of [...GENERIC, SYSTEMS[sys].half]) {
    for (const route of ['object', 'json']) {
      corruptCases++;
      const blocks = goodBlocks();
      if (bad === ABSENT) delete blocks[sys]; else blocks[sys] = bad;
      const raw = { v: GM_DESK_VERSION, blocks };
      const desk = readGmDesk(route === 'json' ? JSON.parse(J(raw)) : raw);
      const tag = `${sys} = ${bad === ABSENT ? 'absent' : J(bad)} (${route})`;
      const before = J(desk);
      /* fails closed: the corrupt block is its owner's fresh value */
      const got = gmBlock(desk, sys, SYSTEMS[sys].isValid, SYSTEMS[sys].fresh);
      if (!same(got, SYSTEMS[sys].fresh())) fail(`${tag}: read back as ${J(got)}, wanted the fresh ${J(SYSTEMS[sys].fresh())}`);
      /* that block alone: every other system still reads what it stored */
      for (const other of sysKeys.filter(k => k !== sys)) {
        const o = gmBlock(desk, other, SYSTEMS[other].isValid, SYSTEMS[other].fresh);
        if (!same(o, SYSTEMS[other].good)) fail(`${tag}: took ${other} down with it, which read back as ${J(o)}`);
      }
      if (!same(desk.blocks.later, LATER)) fail(`${tag}: the block of a system this build does not load changed to ${J(desk.blocks.later)}`);
      if (J(desk) !== before) fail(`${tag}: reading wrote to the desk`);
      /* and the owner's next write replaces it without costing anybody else */
      const next = withGmBlock(desk, sys, got);
      if (J(desk) !== before) fail(`${tag}: writing changed the desk it was handed`);
      if (!same(next.blocks[sys], SYSTEMS[sys].fresh())) fail(`${tag}: the write did not land, the block is ${J(next.blocks[sys])}`);
      for (const other of sysKeys.filter(k => k !== sys)) {
        if (!same(next.blocks[other], SYSTEMS[other].good)) fail(`${tag}: the write lost ${other} (now ${J(next.blocks[other])})`);
      }
      if (!same(next.blocks.later, LATER)) fail(`${tag}: the write lost the unknown block (now ${J(next.blocks.later)})`);
      if (!same(readGmDesk(JSON.parse(J(next))), next)) fail(`${tag}: the written desk does not survive a save and a load`);
    }
  }
}
/* A name every object inherits is not a block, however eager the validator. */
for (const k of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
  corruptCases++;
  const got = gmBlock(readGmDesk({ v: GM_DESK_VERSION, blocks: {} }), k, () => true, () => 'fresh');
  if (got !== 'fresh') fail(`a desk with no blocks answered for the key ${k} with something it inherited`);
}
if (corruptCases < T.minCorrupt) fail(`only ${corruptCases} corrupt block cases walked, wanted at least ${T.minCorrupt}`);
console.log(`   ${corruptCases} corrupt block cases walked across ${sysKeys.length} systems`);

/* ================================================================== */
begin('4', 'a save with no gm block is a fresh desk');
const FRESH = { v: GM_DESK_VERSION, blocks: {} };
if (!Number.isInteger(GM_DESK_VERSION) || GM_DESK_VERSION < 1) fail(`GM_DESK_VERSION is ${J(GM_DESK_VERSION)}`);
if (!same(freshGmDesk(), FRESH)) fail(`freshGmDesk() is ${J(freshGmDesk())}`);
if (freshGmDesk() === freshGmDesk() || freshGmDesk().blocks === freshGmDesk().blocks) fail('two fresh desks share an object, so a write to one would show in the other');
const NOT_DESKS = [
  undefined, null, 0, 1, 'gm', true, [], [{ v: GM_DESK_VERSION, blocks: { a: 1 } }], {},
  { v: GM_DESK_VERSION }, { blocks: { a: 1 } }, { v: GM_DESK_VERSION + 1, blocks: { a: 1 } }, { v: 0, blocks: { a: 1 } },
  { v: String(GM_DESK_VERSION), blocks: { a: 1 } }, { v: GM_DESK_VERSION + 0.5, blocks: { a: 1 } },
  { v: GM_DESK_VERSION, blocks: [1] }, { v: GM_DESK_VERSION, blocks: null }, { v: GM_DESK_VERSION, blocks: 'a' },
];
let notDesk = 0;
for (const raw of NOT_DESKS) {
  notDesk++;
  const got = readGmDesk(raw);
  if (!same(got, FRESH)) fail(`readGmDesk(${J(raw) ?? 'undefined'}) is ${J(got)}, wanted a fresh desk`);
}
/* The old save itself: four boards' worth of fields, no gm, and not a byte of it moves. */
{
  notDesk++;
  const save = { league: { season: 2027, week: 4 }, myTeam: 'AAA', phase: 'hub', titles: 1, seasonsPlayed: 3, trust: 61 };
  const before = J(save);
  const got = readGmDesk(save.gm);
  if (!same(got, FRESH)) fail(`an old save's desk is ${J(got)}`);
  if (J(save) !== before || own(save, 'gm')) fail('reading the desk off an old save changed the save');
}
/* And the baseline: an envelope this build does know is read, not reset. */
{
  notDesk++;
  const known = { v: GM_DESK_VERSION, blocks: goodBlocks() };
  const got = readGmDesk(JSON.parse(J(known)));
  if (!same(got, known)) fail(`a good envelope read back as ${J(got)}`);
}
if (notDesk < T.minNotDesk) fail(`only ${notDesk} envelope cases walked, wanted at least ${T.minNotDesk}`);
console.log(`   ${notDesk} envelope cases walked`);

/* ================================================================== */
begin('5', 'an empty panel list draws nothing');
const HUB = {
  roster: [], freeAgents: [], capRoom: 12, wins: 3, losses: 1, period: 5, periods: 17,
  playWord: 'Play', periodWord: 'round', hasFixtures: false, nextOpponent: null, lastResult: null,
  place: 2, cut: 8, tableName: 'the conference', tradeLine: null, titles: 0,
};
const FACTS = { teamId: 'AAA', teamLabel: 'Test City Testers', seasonsPlayed: 2, phase: 'hub', hub: HUB };
/* A toy system: its box says what it is handed, its panel says whose desk it is and in which league. */
const toy = (key, title, face) => ({
  key, title,
  tile: () => face,
  Panel: ({ sport, facts }) => M.h('p', { 'data-toy': key }, `${title} desk for ${facts.teamLabel} in ${sport.words.league}`),
});
const ALPHA = toy('alpha', 'Alpha', { icon: 'A', value: 'Alpha value', sub: 'alpha sub', accent: true });
const BETA = toy('beta', 'Beta', { icon: 'B', value: 'Beta value', sub: 'beta sub', accent: false });
const QUIET = toy('quiet', 'Quiet', null);
const draw = (sport, panels, open) => M.render(M.GmDeskMount, { sport, desk: freshGmDesk(), facts: FACTS, panels, open, onOpen() {}, onDesk() {} });
let renders = 0;
for (const k of SPORTS) {
  /* the promise: no panels, no markup at all, whatever `open` says */
  for (const open of [null, 'alpha']) {
    renders++;
    const html = draw(k, [], open);
    if (html !== '') fail(`${k}: an empty panel list (open ${J(open)}) drew ${J(html.slice(0, 120))}`);
  }
  /* a list whose every tile says null is an empty hub too */
  renders++;
  const quiet = draw(k, [QUIET], null);
  if (quiet !== '') fail(`${k}: a list with no boxes to show drew ${J(quiet.slice(0, 120))}`);
  /* the baseline: the same call with panels does draw, so '' above is a decision */
  renders++;
  const hub = draw(k, [ALPHA, BETA, QUIET], null);
  for (const want of ['data-gm-desk="tiles"', 'Alpha', 'Alpha value', 'alpha sub', 'Beta', 'Beta value', 'beta sub']) {
    if (!hub.includes(want)) fail(`${k}: the hub with two boxes does not carry ${J(want)}`);
  }
  if (hub.includes('Quiet')) fail(`${k}: a box whose tile said null was drawn`);
  if (hub.includes('data-gm-desk="panel"') || hub.includes('data-toy')) fail(`${k}: the closed hub drew a panel`);
  if ((hub.match(/<button/g) ?? []).length !== 2) fail(`${k}: the hub drew ${(hub.match(/<button/g) ?? []).length} buttons for two boxes`);
  /* open: the bar back and that one panel, in this sport's words, and no boxes under it */
  renders++;
  const open = draw(k, [ALPHA, BETA, QUIET], 'alpha');
  const line = `Alpha desk for Test City Testers in ${GM_SPORTS[k]?.words.league}`;
  for (const want of ['data-gm-desk="panel"', 'data-gm-panel="alpha"', line, 'Hub']) {
    if (!open.includes(want)) fail(`${k}: the open panel does not carry ${J(want)}`);
  }
  for (const not of ['Alpha value', 'Beta value', 'data-gm-desk="tiles"']) {
    if (open.includes(not)) fail(`${k}: the open panel still shows ${J(not)}, so the hub is stacked under it`);
  }
  if ((open.match(/<button/g) ?? []).length !== 1) fail(`${k}: the open panel drew ${(open.match(/<button/g) ?? []).length} buttons, wanted the one back button`);
}
if (renders < T.minRenders) fail(`only ${renders} renders made, wanted at least ${T.minRenders}`);
console.log(`   ${renders} renders across ${SPORTS.length} sports`);

/* ================================================================== */
begin('6', 'hub boxes: keyed apart, first of a repeated key, null left off');
{
  const again = toy('alpha', 'Alpha again', { icon: 'Z', value: 'second value', sub: 'second sub', accent: false });
  const trade = toy('trade', 'Trade desk', { icon: 'T', value: 'one offer', sub: 'on the table', accent: true });
  const list = [ALPHA, QUIET, BETA, again, trade];
  const tiles = gmDeskTiles(GM_SPORTS.nba, freshGmDesk(), FACTS, list);
  const keys = tiles.map(t => t.key);
  if (!same(keys, ['gm:alpha', 'gm:beta', 'gm:trade'])) fail(`the boxes are ${J(keys)}, wanted gm:alpha, gm:beta, gm:trade in list order`);
  if (!same(tiles.map(t => t.title), ['Alpha', 'Beta', 'Trade desk'])) fail(`the box words are ${J(tiles.map(t => t.title))}`);
  if (!same(tiles[0], { key: 'gm:alpha', title: 'Alpha', icon: 'A', value: 'Alpha value', sub: 'alpha sub', accent: true })) fail(`the first box is ${J(tiles[0])}`);
  /* a board's own five boxes can never be answered by a desk box, even one named the same */
  for (const mine of ['team', 'market', 'trade', 'play', 'standings']) {
    if (keys.includes(mine)) fail(`a desk box took the board's own key ${mine}`);
  }
  if (gmTileKey('trade') !== 'gm:trade') fail(`gmTileKey('trade') is ${J(gmTileKey('trade'))}`);
  /* a tap opens the panel that drew the box, by either key */
  if (gmPanelFor(list, 'alpha') !== ALPHA || gmPanelFor(list, 'gm:alpha') !== ALPHA) fail('a repeated key opens the second panel, not the one whose box is on the hub');
  if (gmPanelFor(list, 'gm:trade') !== trade) fail('a tile key does not open its panel');
  if (gmPanelFor(list, 'nope') !== null || gmPanelFor(list, null) !== null || gmPanelFor([], 'alpha') !== null) fail('a key that names no panel opened one');
  if (!same(gmDeskTiles(GM_SPORTS.nba, freshGmDesk(), FACTS, []), [])) fail('an empty panel list made boxes');
  /* the tile maker is handed exactly what the board handed in */
  const desk = freshGmDesk();
  let seen = null;
  gmDeskTiles(GM_SPORTS.mlb, desk, FACTS, [{ key: 'spy', title: 'Spy', tile: ctx => { seen = ctx; return null; }, Panel: () => null }]);
  if (!seen || seen.sport !== GM_SPORTS.mlb || seen.desk !== desk || seen.facts !== FACTS) fail('a tile maker was not handed the sport, desk and facts the board passed');
  console.log(`   ${tiles.length} boxes from ${list.length} panels`);
}

/* ---------- verdict ---------- */
const red = [...failedIn.keys()];
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const went = red.includes(want);
  const others = red.filter(c => c !== want);
  console.log(`control ${CONTROL}: check ${want} ${went ? 'went red' : 'STAYED GREEN'}; other checks red: ${others.length ? others.join(', ') : 'none'}`);
}
if (red.length) {
  console.error(`simGmDesk: FAIL in ${red.map(c => `${c} (${failedIn.get(c)})`).join(', ')}`);
  process.exit(1);
}
console.log('simGmDesk: PASS. Four sports declare one descriptor that matches their engines and boards, a corrupt block costs that block alone, an old save opens on a fresh desk, and an empty panel list leaves nothing on the hub.');
