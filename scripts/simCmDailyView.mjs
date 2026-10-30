/**
 * Round 1600 (Proposal 2 of the veteran ratings design): no daily is dealt again when Club Manager's 2026 world
 * starts reading age. Manager Hot Seat and Deadline Day deal from that world; a day dated before
 * CM_DAILY_NEW_NUMBERS_FROM (src/lib/managerHotSeat.ts) is dealt and played on the curve 1 view (onCurve1View in
 * src/data/clubManagerWorldRosters.ts, the ages of src/data/clubManagerCurve1View.ts).
 *
 * THREE ARMS of the real engine and both dailies, bundled with esbuild:
 *   A    the files as shipped (the world every day so far was dealt on).
 *   F    the main squads file flipped (stamped curve 2, every man at his 1 August 2026 age: scripts/lib/cmFlipProbe.mjs),
 *        the view in place: the release as it will ship.
 *   F0   the same flip with the view taken out of onStaticWorld: what the release would deal with no view.
 *
 * SECTIONS
 *   1  every date from 2026-09-01 to the day before the cutover, and Deadline Day's worked example 2023-02-21: both
 *      dailies' setup, their opening run, and their first action (a Hot Seat match, a Deadline Day phone call) are
 *      arm A's, byte for byte, in arm F. And F0 deals another day on some of them (the flip moves the dailies, so the
 *      view is doing work, not passing on files that changed nothing).
 *   2  the cutover and the 13 days after it: arm F deals exactly what F0 deals (the view retires on its date).
 *   3  no leak either way: in arm F a Club Manager market and the call up bars read before every early daily are the
 *      same after them, and differ from arm A's (they are the live, flipped world).
 *
 * CONTROLS (CM_DAILY_VIEW_CONTROL=name), each proving its anchor first:
 *   off       onStaticWorld never takes the view (section 1)
 *   untagged  the caches stop telling the two worlds apart (sections 1 or 3)
 *   halfswap  the eras module keeps the live world inside the view (section 1)
 *   stuck     the view never retires (section 2)
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { stampedSquads, agedSquads } from './lib/cmFlipProbe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CM_DAILY_VIEW_CONTROL || '';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');
const HOT = 'src/lib/managerHotSeat.ts', WORLD = 'src/data/clubManagerWorldRosters.ts', ERAS = 'src/lib/clubManagerEras.ts';
const SRC = { [HOT]: read(HOT), [WORLD]: read(WORLD), [ERAS]: read(ERAS) };
const VIEW_LINE = '  if (daily !== undefined && daily < CM_DAILY_NEW_NUMBERS_FROM) return onCurve1View(CM_CURVE1_VIEW, () => onStaticWorld(fn));\n';
const CONTROLS = {
  off: [HOT, VIEW_LINE, ''],
  untagged: [WORLD, "  return ACTIVE_WORLD ? 'curve1|' : '';\n", "  return '';\n"],
  halfswap: [ERAS, '  return cmWorld();\n}', '  return CM_ROSTERS;\n}'],
  stuck: [HOT, '  if (daily !== undefined && daily < CM_DAILY_NEW_NUMBERS_FROM) return', '  if (daily !== undefined) return'],
};
function rewrite(src, [file, from, to], label) {
  if (src[file].split(from).length !== 2) { console.log(`simCmDailyView: ${label} ABORTED, its anchor is not in ${file} exactly once`); process.exit(2); }
  return { ...src, [file]: src[file].replace(from, to) };
}
let srcF = SRC;
if (CONTROL) {
  if (!CONTROLS[CONTROL]) { console.log(`simCmDailyView: unknown control ${CONTROL}`); process.exit(2); }
  srcF = rewrite(SRC, CONTROLS[CONTROL], `control ${CONTROL}`);
  console.log(`CONTROL ${CONTROL} APPLIED`);
}
const srcF0 = rewrite(SRC, CONTROLS.off, 'arm F0');
const CUTOVER = /export const CM_DAILY_NEW_NUMBERS_FROM = '(\d{4}-\d{2}-\d{2})';/.exec(SRC[HOT])?.[1];
if (!CUTOVER) { console.log('simCmDailyView: ABORTED, no CM_DAILY_NEW_NUMBERS_FROM'); process.exit(2); }

const SQUADS = read('src/data/clubManagerRosters.ts');
const FLIPPED = agedSquads(stampedSquads(SQUADS), JSON.parse(read('scripts/data/cmAgesBasis2026.json'))).text;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdailyview-'));
const FILTERS = {
  [HOT]: /[\\/]src[\\/]lib[\\/]managerHotSeat\.ts$/,
  [WORLD]: /[\\/]src[\\/]data[\\/]clubManagerWorldRosters\.ts$/,
  [ERAS]: /[\\/]src[\\/]lib[\\/]clubManagerEras\.ts$/,
};
async function bundle(name, src, squads) {
  const outfile = path.join(TMP, `${name}.cjs`);
  await build({
    stdin: { contents: "export * as cm from '@/lib/clubManager'; export * as hs from '@/lib/managerHotSeat'; export * as dd from '@/lib/deadlineDay'; export * as intl from '@/lib/clubManagerInternationals';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'cjs', platform: 'node', outfile, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'arm', setup(b) {
      for (const [rel, filter] of Object.entries(FILTERS)) b.onLoad({ filter }, () => ({ contents: src[rel], loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerRosters\.ts$/ }, () => ({ contents: squads, loader: 'ts' }));
    } }],
  });
  return createRequire(import.meta.url)(outfile);
}
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } };
const A = await bundle('A', SRC, SQUADS);
const F = await bundle('F', srcF, FLIPPED);
const F0 = await bundle('F0', srcF0, FLIPPED);
for (const arm of [A, F, F0]) await arm.cm.ensureAllEraRosters();

/* ---------- helpers ---------- */
const FIXED_NOW = Date.UTC(2026, 9, 30, 12, 0, 0);
Date.now = () => FIXED_NOW;
const sha = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function seeded(key, fn) {
  const outer = Math.random;
  Math.random = mulberry(hash(key));
  try { return fn(); } finally { Math.random = outer; }
}
let section = 0, checks = 0;
const failures = {};
const check = (ok, msg) => { checks += 1; if (!ok) { failures[section] = (failures[section] ?? 0) + 1; console.log(`  FAIL ${msg}`); } };
const day = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const datesFrom = (from, to) => { const out = []; for (let d = from; d < to; d = day(d, 1)) out.push(d); return out; };

/** Both dailies of one date in one arm: the setup, the opening run and the first action, as one digest. */
function dealt(arm, date) {
  return seeded(`deal|${date}`, () => {
    const ds = arm.dd.dailyDeadlineDay(date);
    const drun = arm.dd.startDeadlineDay(ds);
    const dcall = drun.targets.length ? arm.dd.openTalks(drun, 0) : drun;
    const hsu = arm.hs.dailyHotSeat(date);
    const hrun = arm.hs.startHotSeat(hsu);
    const hplay = arm.hs.playHotSeatMatch(hrun, 'balanced', null);
    return sha([ds, drun, dcall, hsu, hrun, hplay]);
  });
}
/** What Club Manager reads in one arm: a fresh Liverpool career's market and the call up bars. */
const cmRead = arm => seeded('cm|Liverpool', () => {
  const s = arm.cm.startCareer('Liverpool');
  return sha([arm.cm.buildMarket(s).slice(0, 600), [...arm.intl.nationBars('now')]]);
});

const leakBefore = cmRead(F);
const leakA = cmRead(A);

/* ---------- section 1: every early date is the base's ---------- */
section = 1;
const EARLY = ['2023-02-21', ...datesFrom('2026-09-01', CUTOVER)];
console.log(`1. ${EARLY.length} dates before the cutover ${CUTOVER}`);
let same = 0, moved = 0;
const off = [];
for (const date of EARLY) {
  const a = dealt(A, date), f = dealt(F, date), f0 = dealt(F0, date);
  if (a === f) same += 1; else off.push(date);
  if (a !== f0) moved += 1;
}
console.log(`   arm F deals arm A's day on ${same} of ${EARLY.length}${off.length ? `; not on ${off.slice(0, 6).join(', ')}` : ''}`);
console.log(`   with no view (F0) the flip deals another day on ${moved} of ${EARLY.length}`);
check(same === EARLY.length, `${EARLY.length - same} early dates are dealt again on the flipped world`);
check(moved > 0, 'the flip moves no daily, so this section proves nothing about the view');

/* ---------- section 2: from the cutover the view is gone ---------- */
section = 2;
/* Fresh instances of both arms: the engine keeps module counters (makeYouth's sequence, which goes into a youth
   pad's id), and section 1 walked F on the view and F0 on the live world, so their counters no longer agree. */
const F2 = await bundle('F2', srcF, FLIPPED);
const F02 = await bundle('F02', srcF0, FLIPPED);
for (const arm of [F2, F02]) await arm.cm.ensureAllEraRosters();
const LATE = datesFrom(CUTOVER, day(CUTOVER, 14));
let lateSame = 0;
for (const date of LATE) if (dealt(F2, date) === dealt(F02, date)) lateSame += 1;
console.log(`2. from the cutover: arm F deals what F0 deals on ${lateSame} of ${LATE.length} dates`);
check(lateSame === LATE.length, `${LATE.length - lateSame} dates from the cutover still deal on the view`);

/* ---------- section 3: no leak between the two worlds ---------- */
section = 3;
const leakAfter = cmRead(F);
console.log(`3. Club Manager in arm F before the dailies ${leakBefore}, after ${leakAfter}; arm A ${leakA}`);
check(leakBefore === leakAfter, 'a daily on the view left its numbers in Club Manager');
check(leakBefore !== leakA, 'Club Manager in the flipped arm reads the shipped world');

const total = Object.values(failures).reduce((s, n) => s + n, 0);
for (const [s, n] of Object.entries(failures)) console.log(`   section ${s}: ${n} failures`);
console.log(`simCmDailyView: ${checks} checks, ${total} failures${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(total ? 1 : 0);
