/* Round 1040: the daily club pool of Manager Hot Seat and Deadline Day.

   Both dailies deal one club a day by an index into a list of clubs. Until
   this round the list was worked out live from the engine, so any roster
   bake or new league re-dealt every date, the day a release went live
   included. Round 1040's bake did it three ways at once (Monza and Lecce
   swapped places in Serie A, Lausanne-Sport fell to seven real men and out of
   the live pool, Pisa, Verona, Cremonese and Vicenza came in), and measured
   2026-10-06 the live list re-dealt the very first day. The list is now the
   committed, append only src/data/dailyClubPool.json
   (scripts/genDailyClubPool.mjs), and this harness holds it:

   1. NO DAY RE-DEALT (hard). scripts/data/dailyPoolFixture1040.json is both
      dailies, club and seed, for 2026-10-06 to 2026-11-04 as the engine
      dealt them BEFORE the round (release-ah fc30942e). Every one must come
      out the same on this tree. Measured 2026-10-06: 30 of 30 the same; the
      first changed day is 2026-11-05, the date the four new lines count from.
   2. COVERAGE (hard). Every club of the live pool (hotSeatPool) is a line of
      the file, so a later league or bake that leaves a club out is caught
      here: run node scripts/genDailyClubPool.mjs and commit the file.
   3. SHAPE (hard). No club twice; every date is YYYY-MM-DD or null; every
      undated line comes before every dated one and the dates never go back,
      which is the shape appending produces.
   4. RESOLVED (report). Lines the engine no longer knows (skipped by the
      dailies, so the days after they went re-deal) and lines that fell out of
      the live pool (still dealt, the engine pads the squad) are named.

   NEGATIVE CONTROLS (each refuses to run if its text is not in the source):
     DAILY_POOL_CONTROL=live   dailyPool goes back to the live list: 1 red.
     DAILY_POOL_CONTROL=early  the four Serie B lines count from always: 1 red.

   Run: node scripts/simDailyClubPool.mjs   (offline, a few seconds)
*/
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.DAILY_POOL_CONTROL || '';
if (CONTROL && !['live', 'early'].includes(CONTROL)) { console.error(`DAILY_POOL_CONTROL=${CONTROL} is not live or early`); process.exit(1); }
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const POOL_FILE = path.join(ROOT, 'src', 'data', 'dailyClubPool.json');
const HS_FILE = path.join(ROOT, 'src', 'lib', 'managerHotSeat.ts');
function mutateOnce(src, from, to, label) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`control ${label}: expected its text once, found it ${n} times; refusing to run`); process.exit(1); }
  return src.replace(from, to);
}

const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'dailypool-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
const entry = path.join(TMP, 'entry.mjs');
const out = path.join(TMP, 'b.mjs');
fs.writeFileSync(entry, `export { dailyHotSeat, dailyPool, hotSeatPool } from '${ROOT_FWD}/src/lib/managerHotSeat.ts';\nexport { dailyDeadlineDay } from '${ROOT_FWD}/src/lib/deadlineDay.ts';\nexport { clubByName } from '${ROOT_FWD}/src/lib/clubManager.ts';\n`);
await build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
  alias: { '@': `${ROOT_FWD}/src` }, logLevel: 'error',
  plugins: [{ name: 'daily-pool', setup(b) {
    b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'sb', namespace: 'sb' }));
    b.onLoad({ filter: /.*/, namespace: 'sb' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("offline harness"); } }); export const SUPABASE_URL = "http://offline.invalid"; export const SUPABASE_PUBLISHABLE_KEY = "offline";', loader: 'js' }));
    b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]managerHotSeat\.ts$/ }, a => {
      let src = fs.readFileSync(a.path, 'utf8');
      if (CONTROL === 'live') src = mutateOnce(src, 'const live = new Map(hotSeatPool().map(c => [c.club, c]));', 'const live = new Map(hotSeatPool().map(c => [c.club, c])); if (live.size) return hotSeatPool();', 'live');
      return { contents: src, loader: 'ts', resolveDir: path.dirname(a.path) };
    });
    b.onLoad({ filter: /[\\/]src[\\/]data[\\/]dailyClubPool\.json$/ }, a => {
      let src = fs.readFileSync(a.path, 'utf8');
      if (CONTROL === 'early') {
        for (const c of ['Pisa', 'Verona', 'Cremonese', 'Vicenza']) src = mutateOnce(src, `["${c}","2026-11-05"]`, `["${c}",null]`, 'early');
      }
      return { contents: src, loader: 'json' };
    });
  } }],
});
const m = await import(pathToFileURL(out).href);
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL}; part 1 must go red`);

console.log('1) no day already dealt is dealt again');
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'dailyPoolFixture1040.json'), 'utf8'));
let same = 0;
for (const [d, hs, hsSeed, dd, ddSeed] of fixture.days) {
  const h = m.dailyHotSeat(d), x = m.dailyDeadlineDay(d);
  if (h.club !== hs || h.seed !== hsSeed) fail(`${d}: Manager Hot Seat deals ${h.club} (seed ${h.seed}), it dealt ${hs} (seed ${hsSeed})`);
  else if (x.club !== dd || x.seed !== ddSeed) fail(`${d}: Deadline Day deals ${x.club} (seed ${x.seed}), it dealt ${dd} (seed ${ddSeed})`);
  else same += 1;
}
console.log(`   ${same} of ${fixture.days.length} recorded days (${fixture.days[0][0]} to ${fixture.days[fixture.days.length - 1][0]}) deal the same club and seed in both dailies`);
if (fixture.days.length < 30) fail(`the fixture holds ${fixture.days.length} days, it was recorded with 30`);

console.log('2) every club of the live pool is a line of the file');
const file = JSON.parse(fs.readFileSync(POOL_FILE, 'utf8'));
const lines = file.entries;
const inFile = new Set(lines.map(e => e[0]));
const live = m.hotSeatPool().map(c => c.club);
const missing = live.filter(c => !inFile.has(c));
if (missing.length) fail(`${missing.length} clubs of the live pool are not in the file (${missing.slice(0, 6).join(', ')}): run node scripts/genDailyClubPool.mjs and commit src/data/dailyClubPool.json`);
console.log(`   ${live.length} live clubs, ${lines.length} lines, ${missing.length} missing`);

console.log('3) the file has the shape appending gives it');
if (inFile.size !== lines.length) fail(`${lines.length - inFile.size} clubs appear twice`);
let lastDate = null;
lines.forEach(([club, from], i) => {
  if (from !== null && !/^\d{4}-\d{2}-\d{2}$/.test(from)) fail(`line ${i + 1} (${club}): ${from} is not a date`);
  if (from === null && lastDate !== null) fail(`line ${i + 1} (${club}) counts from always after a dated line`);
  if (from !== null && lastDate !== null && from < lastDate) fail(`line ${i + 1} (${club}) is dated ${from}, before the line above it (${lastDate})`);
  if (from !== null) lastDate = from;
});
console.log(`   ${lines.filter(e => e[1] === null).length} lines count from always, ${lines.filter(e => e[1] !== null).length} are dated (last ${lastDate})`);

console.log('4) lines the engine no longer deals live (report)');
const unknown = lines.filter(([c]) => !m.clubByName(c)).map(([c]) => c);
const fellOut = lines.filter(([c]) => m.clubByName(c) && !live.includes(c)).map(([c]) => c);
console.log(`   unknown to the engine (skipped, the days after re-deal): ${unknown.join(', ') || 'none'}; out of the live pool but still dealt: ${fellOut.join(', ') || 'none'}`);
const far = m.dailyPool('2099-01-01').length;
if (far !== lines.length - unknown.length) fail(`dailyPool deals ${far} clubs far ahead, the file resolves ${lines.length - unknown.length}`);

console.log(failures ? `simDailyClubPool: ${failures} failure(s)${CONTROL ? ` under control ${CONTROL}` : ''}` : `simDailyClubPool: all checks passed${CONTROL ? ` (control ${CONTROL} did NOT fire)` : ''}`);
process.exit(failures ? 1 : 0);
