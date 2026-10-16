/* Reviewer (run lens), runner only, never committed. Correction 2's run in pin, on the PRODUCTION path:
   useClubManager hands startMidSeason the state startCareer just built (BOARD_FRESH since this round), and
   joinClubNow builds its own. Two arms bundled from this tree: 'pin' as committed, 'nopin' with playRunIn's pin
   taken out (anchor asserted once). Same seeds on both; counts how many takeovers differ in anything but the
   handover's own opening, and prints the first differences. Prints only; exit 0 when it ran. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, 'package.json'));
require(path.join(ROOT, 'scripts/lib/offlineTransport.cjs'));
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-pin-'));
const CAL = path.join(ROOT, 'src/lib/clubManagerCalendar.ts');
const calText = fs.readFileSync(CAL, 'utf8').replaceAll('\r\n', '\n');
const FROM = '? { ...career, manager: undefined, managerXp: undefined, boardConfidence: LEGACY_BOARD_START }\n    : { ...career, boardConfidence: LEGACY_BOARD_START };';
const TO = '? { ...career, manager: undefined, managerXp: undefined }\n    : career;';
if (calText.split(FROM).length !== 2) { console.log('pinProbe: the pin anchor is not in the file exactly once; could not run'); process.exit(2); }
async function arm(name, calOverride) {
  const alias = { '@': path.join(ROOT, 'src') };
  if (calOverride) { const f = path.join(work, 'clubManagerCalendar.ts'); fs.writeFileSync(f, calOverride); alias['@/lib/clubManagerCalendar'] = f; }
  const entry = path.join(work, `${name}.ts`);
  fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as cal from '@/lib/clubManagerCalendar';\n");
  const out = path.join(work, `${name}.cjs`);
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', alias, nodePaths: [path.join(ROOT, 'node_modules')] });
  return out;
}
const pinOut = await arm('pin', null);
const nopinOut = await arm('nopin', calText.replace(FROM, TO));
async function fresh(out) { delete require.cache[require.resolve(out)]; const m = require(out); await m.cm.ensureAllEraRosters(); return m; }
function withSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
const canon = v => JSON.parse(JSON.stringify(v).replace(/youth-([a-z0-9]+)-\d+-(\d+)/g, 'youth-$1-#-$2'));
function firstDiff(a, b, at = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return '';
  if (a && b && typeof a === 'object' && typeof b === 'object') for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = firstDiff(a[k], b[k], `${at}.${k}`); if (d) return d; }
  return `${at || '(root)'}: pin ${JSON.stringify(a)?.slice(0, 80)} nopin ${JSON.stringify(b)?.slice(0, 80)}`;
}
const m0 = await fresh(pinOut);
const worlds = [['era2005'], ['era2015'], [null]];
const cases = [];
for (const [era] of worlds) {
  const defs = (era ? (m0.cm.ERA_LEAGUES[era] ?? []).flatMap(l => l.clubs.map(c => m0.cm.eraClubDefFor(c, era))) : m0.cm.REAL_LEAGUES.flatMap(l => m0.cm.playableClubs(l.id))).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  const k = Number(process.env.RV_CLUBS ?? 16);
  const picked = defs.length <= k ? defs : Array.from({ length: k }, (_, i) => defs[Math.floor((i * defs.length) / k)]);
  for (const d of picked) for (const entry of ['autumn', 'newYear', 'runIn']) for (let seed = 0; seed < Number(process.env.RV_SEEDS ?? 4); seed++) cases.push({ club: d.name, era, entry, seed });
}
let n = 0, differ = 0;
const firsts = [];
/* Both arms reloaded every 16 cases (a reload per case ran out of memory on the runner); within a block both
   arms play the same cases in the same order, and canon() takes the youth counter out of the ids. */
let A = null, B = null;
for (const [i, c] of cases.entries()) {
  if (i % 16 === 0) { A = await fresh(pinOut); B = await fresh(nopinOut); }
  const run = m => { const s = withSeed(4000 + c.seed, () => (c.era ? m.cm.startCareer(c.club, c.era) : m.cm.startCareer(c.club))); return withSeed(c.seed * 7 + 1, () => m.cal.startMidSeason(s, c.entry)); };
  let a, b;
  try { a = run(A); b = run(B); } catch (e) { continue; }
  n += 1;
  const d = firstDiff(canon(a), canon(b));
  if (d) { differ += 1; if (firsts.length < 6) firsts.push(`${c.club} ${c.era ?? 'now'} ${c.entry} seed ${c.seed}: ${d}`); }
}
console.log(`[pin] ${n} production path takeovers (startCareer at BOARD_FRESH, then startMidSeason): ${differ} differ with the pin taken out`);
for (const f of firsts) console.log(`  ${f}`);
console.log('[pin] DONE');
