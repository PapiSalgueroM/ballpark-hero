/**
 * Round 1229 harness: Club Manager, the league keeps its book (part one, the book is kept).
 *
 * HEADER GROWS WITH THE ROUND. Sections, controls and the measured numbers are written in below as each
 * step lands (docs/audits/ROUND-1229-NOTES.md has the runner result names).
 *
 * Exit: 0 green, 1 red (or a control that FIRED: read the last line), 2 could not run, 3 a control that
 * did not fire.
 *
 *   node scripts/simCmLeagueBook.mjs                      the default (small) fleet
 *   BOOK_FLEET=full node scripts/simCmLeagueBook.mjs      the whole fleet (the round's remote check)
 *   BOOK_BASE=<a worktree of the base commit> ...         adds the base arm of section stream
 *   SEEDSET=n                                             another set of seeds
 * Offline: bundles the engine from src, reads no network and no database.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BOOK_BASE ? path.resolve(process.env.BOOK_BASE) : null;
const CONTROL = process.env.BOOK_CONTROL || '';
const FULL = process.env.BOOK_FLEET === 'full';
const SEEDSET = Number(process.env.SEEDSET ?? 0);
const SEASONS = Number(process.env.SEASONS ?? 2);
const T0 = Date.now();
const cannot = why => { console.error(`simCmLeagueBook: cannot run: ${why}`); process.exit(2); };

const WEIGHT = 'src/lib/clubManagerGoalWeight.ts';
/** name -> { patch: [{ file, from, to }], red: the one section that must go red, needs?: 'base' } */
const CONTROLS = {
  weight: { patch: [{ file: WEIGHT, from: "pos === 'ST' || pos === 'CF' ? 5 :", to: "pos === 'ST' || pos === 'CF' ? 8 :" }], red: 'stream', needs: 'base' },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) cannot(`unknown control "${CONTROL}"`);
if (CONTROL && CONTROLS[CONTROL].needs === 'base' && !BASE) cannot(`control ${CONTROL} is judged against the base commit: set BOOK_BASE`);

/* The fleet: [club, era]. The clubs cover the league sizes (20, 18, 24) and both pair ledger cases. */
const ALL_CLUBS = [
  ['Everton', 'now'], ['Arsenal', 'now'], ['Bayern Munich', 'now'], ['Southampton', 'now'],
  ['Hertha BSC', 'now'], ['Real Madrid', 'now'], ['Ajax', 'now'], ['Barcelona', 'era2010'],
];
const CLUBS = FULL ? ALL_CLUBS : [ALL_CLUBS[0], ALL_CLUBS[3], ALL_CLUBS[4], ALL_CLUBS[7]];
const SEEDS = FULL ? 3 : 1;
const seedOf = (clubIndex, k) => (0x1229 + SEEDSET * 7919 + clubIndex * 131 + k * 17) >>> 0;

/* Each run its own temp folder: two bundling harnesses at once must never share one. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-book-'));
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** The engine and its neighbours, bundled from `root` with exact text patches applied to the bundle's copy. */
async function engine(label, root, patches = []) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  const has = f => fs.existsSync(path.join(root, f));
  fs.writeFileSync(entry, [
    `export * as cm from ${P('src/lib/clubManager.ts')};`,
    `export * as cal from ${P('src/lib/clubManagerCalendar.ts')};`,
    `export * as hs from ${P('src/lib/managerHotSeat.ts')};`,
    `export * as dd from ${P('src/lib/deadlineDay.ts')};`,
    has('src/lib/clubManagerLeagueBook.ts') ? `export * as book from ${P('src/lib/clubManagerLeagueBook.ts')};` : 'export const book = null;',
  ].join('\n') + '\n');
  const applied = new Set();
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    absWorkingDir: root, alias: { '@': path.join(root, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'cm-book-control', setup(b) {
      b.onLoad({ filter: /\.ts$/ }, args => {
        const mine = patches.filter(p => path.resolve(root, p.file) === path.resolve(args.path));
        if (!mine.length) return undefined;
        let text = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
        for (const p of mine) {
          const n = text.split(p.from).length - 1;
          if (n !== 1) throw new Error(`control anchor occurs ${n} times, not once, in ${p.file}: ${p.from}`);
          text = text.replace(p.from, p.to);
          applied.add(p);
        }
        return { contents: text, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (applied.size !== patches.length) throw new Error(`${label}: ${patches.length - applied.size} patch(es) never met their file`);
  const mod = await import(pathToFileURL(out).href);
  await mod.cm.ensureAllEraRosters();
  return mod;
}

/* ---------- the seeded stream, counted ---------- */
function seeded(seed) {
  let a = seed >>> 0;
  let calls = 0;
  const draw = () => {
    calls += 1;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  draw.calls = () => calls;
  return draw;
}

/** The whole save but the book, as text: what "the engine's stream did not move" is judged on. */
const withoutBook = s => JSON.stringify(s, (k, v) => (k === 'leagueBook' ? undefined : v));
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 24);

/**
 * One career on one seeded stream: SEASONS whole seasons, every match a quick sim, summers included.
 * hooks.entry(before, after, result) runs after every calendar entry, hooks.seasonEnd(s, season) the moment
 * before finishSeason, hooks.summer(s, season) after startNextSeason. Returns the faces section stream reads.
 */
function playCareer(mod, club, eraId, seed, hooks = {}, seasons = SEASONS) {
  const { cm } = mod;
  const draw = seeded(seed);
  const realRandom = Math.random;
  const realNow = Date.now;
  Math.random = draw;
  Date.now = () => 1791302400000;
  const faces = [];
  try {
    let s = hooks.start ? hooks.start(cm) : cm.startCareer(club, eraId);
    hooks.opened?.(s, 0);
    for (let season = 0; season < seasons; season++) {
      let guard = 0;
      while (s.week < s.calendar.length && guard++ < 220) {
        const before = hooks.entry ? hooks.peek?.(s) : null;
        const r = cm.playNextEntry(s, { skipHalftime: true });
        hooks.entry?.(before, r.state, r, season);
        s = r.state;
        if (r.kind === 'seasonOver') break;
      }
      faces.push(`${sha(withoutBook(s))}|${draw.calls()}`);
      hooks.seasonEnd?.(s, season);
      const fin = cm.finishSeason(s);
      hooks.finished?.(fin, season);
      s = cm.startNextSeason(fin.state);
      faces.push(`${sha(withoutBook(s))}|${draw.calls()}`);
      hooks.opened?.(s, season + 1);
    }
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
  }
  return faces;
}

/* ---------- the sections ---------- */
const SECTIONS = ['stream'];
const red = new Map(SECTIONS.map(s => [s, []]));
const checked = new Map(SECTIONS.map(s => [s, 0]));
const fail = (section, message) => { red.get(section).push(message); };
const tick = (section, n = 1) => checked.set(section, checked.get(section) + n);

const fleet = [];
CLUBS.forEach(([club, era], ci) => { for (let k = 0; k < SEEDS; k++) fleet.push({ club, era, seed: seedOf(ci, k) }); });

let candidate;
try {
  candidate = await engine('candidate', ROOT, CONTROL ? CONTROLS[CONTROL].patch : []);
} catch (e) { cannot(String(e?.message ?? e)); }

console.log(`simCmLeagueBook: ${fleet.length} careers x ${SEASONS} seasons (${FULL ? 'full' : 'default'} fleet, seed set ${SEEDSET})${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
const candFaces = fleet.map(f => playCareer(candidate, f.club, f.era, f.seed));

/* ---------- section stream, the base arm: the same careers on the source of the base commit ---------- */
if (BASE) {
  let base;
  try { base = await engine('base', BASE); } catch (e) { cannot(`the base tree at ${BASE} did not build: ${String(e?.message ?? e)}`); }
  let same = 0;
  fleet.forEach((f, i) => {
    const baseFaces = playCareer(base, f.club, f.era, f.seed);
    baseFaces.forEach((face, j) => {
      tick('stream');
      if (face === candFaces[i][j]) same += 1;
      else fail('stream', `${f.club} (${f.era}, seed ${f.seed}) ${j % 2 ? 'after the summer of' : 'at the end of'} season ${Math.floor(j / 2) + 1}: base ${face}, candidate ${candFaces[i][j]}`);
    });
  });
  console.log(`stream  base arm: ${same} of ${checked.get('stream')} faces (the whole save but the book, and the count of draws) equal to the base commit's source`);
} else {
  console.log('stream  base arm NOT RUN: set BOOK_BASE to a worktree of the base commit');
}

/* ---------- the verdict ---------- */
let total = 0;
for (const s of SECTIONS) {
  const xs = red.get(s);
  total += xs.length;
  console.log(`${xs.length ? 'RED  ' : 'green'} ${s.padEnd(8)} ${checked.get(s)} checks${xs.length ? `, ${xs.length} failed` : ''}`);
  for (const m of xs.slice(0, 6)) console.log(`        ${m}`);
}
const secs = Math.round((Date.now() - T0) / 1000);
if (CONTROL) {
  const want = CONTROLS[CONTROL].red;
  const others = SECTIONS.filter(s => s !== want && red.get(s).length);
  const fired = red.get(want).length > 0 && others.length === 0;
  console.log(fired
    ? `simCmLeagueBook: CONTROL ${CONTROL} FIRED: section ${want} went red (${red.get(want).length} failures) and no other section did (${secs}s)`
    : `simCmLeagueBook: CONTROL ${CONTROL} DID NOT FIRE as it must: ${want} has ${red.get(want).length} failures, other red sections [${others.join(', ')}] (${secs}s)`);
  process.exit(fired ? 1 : 3);
}
console.log(total === 0
  ? `simCmLeagueBook: green, ${SECTIONS.length} section(s), ${fleet.length} careers x ${SEASONS} seasons (${secs}s)`
  : `simCmLeagueBook: ${total} FAILURE(S) (${secs}s)`);
process.exit(total === 0 ? 0 : 1);
