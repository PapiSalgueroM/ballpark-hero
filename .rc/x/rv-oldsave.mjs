/* Reviewer probe, Round 1607 run lens (never committed). Saves made by the BASE engine (c0c66e087, no dugout
   table) are loaded by the branch engine, then carried through one rollover on both engines with one seed.
   Old saves must load unchanged and play on exactly as before (they hold made up names only).
   Run from the repo root: node .rc/x/rv-oldsave.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { seeded, bundleEngine, baseTree, firstDiff } from '../../scripts/lib/cmDugoutSentinel.mjs';

const ROOT = process.cwd();
const BASE = process.env.OLDSAVE_BASE || 'c0c66e087';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-oldsave-'));
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 };
const refuse = m => { console.log('REFUSED: ' + m); process.exit(2); };
const nodeModules = path.join(ROOT, 'node_modules');
const b = baseTree(ROOT, BASE, tmp);
const B = await bundleEngine({ srcDir: b.src, tmp, name: 'base', nodeModules, refuse });
const N = await bundleEngine({ srcDir: path.join(ROOT, 'src'), tmp, name: 'branch', nodeModules, refuse });
console.log(`base ${b.sha.slice(0, 9)} bundled, branch bundled`);
if (B.cm.SAVE_KEY !== N.cm.SAVE_KEY) refuse('the save key moved');
const KEY = N.cm.SAVE_KEY;

let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const CASES = [
  ['Everton', 'now', ''], ['Arsenal', 'now', ''], ['Real Madrid', 'now', ''], ['Bayern Munich', 'now', ''],
  ['PSG', 'now', ''], ['Napoli', 'now', ''], ['Coventry City', 'now', ''], ['Toulouse', 'now', ''],
  ['Everton', 'era2010', ''], ['Barcelona', 'era2015', ''], ['Juventus', 'era2020', ''], ['Lyon', 'era2005', ''],
  ['Arsenal', 'now', 'newYear'], ['Lyon', 'now', 'runIn'], ['Sevilla', 'now', 'autumn'],
  ['Everton', 'now', 'season2'], ['Getafe', 'now', 'season2'],
];
const make = (E, club, era, mode) => {
  let s = E.cm.startCareer(club, era);
  if (mode === 'newYear' || mode === 'runIn' || mode === 'autumn') s = E.cal.startMidSeason(s, mode);
  if (mode === 'season2') s = E.cm.startNextSeason(s);
  return s;
};
const loadWith = (E, raw, seed) => { store.clear(); store.set(KEY, raw); return seeded(seed, () => E.cm.loadCareer()).value; };
let same = 0, rolled = 0, realShownOld = 0, realSeatedStripped = 0, strippedCases = 0;
for (let i = 0; i < CASES.length; i++) {
  const [club, era, mode] = CASES[i];
  const tag = `${club} ${era}${mode ? ' ' + mode : ''}`;
  const seed = 7000 + i * 13;
  let st;
  try { st = seeded(seed, () => make(B, club, era, mode)).value; } catch (e) { fail(`${tag}: base could not start (${String(e?.message ?? e).slice(0, 100)})`); continue; }
  store.clear();
  seeded(seed + 1, () => B.cm.saveCareer(st));
  const raw = store.get(KEY);
  if (!raw) { fail(`${tag}: the base wrote no save`); continue; }
  const lb = loadWith(B, raw, seed + 2);
  const ln = loadWith(N, raw, seed + 2);
  if (!lb || !ln) { fail(`${tag}: a load returned nothing (base ${!!lb}, branch ${!!ln})`); continue; }
  const d = firstDiff(lb, ln);
  if (d) fail(`${tag}: the branch loads the old save differently: ${d}`); else same += 1;
  for (const c of ln.leagueClubs ?? []) { const v = N.cm.dugoutOf(ln, c); if (v?.real) realShownOld += 1; }
  /* one rollover on both engines, same seed, from their own load */
  try {
    const nb = seeded(seed + 3, () => B.cm.startNextSeason(JSON.parse(JSON.stringify(lb)))).value;
    const nn = seeded(seed + 3, () => N.cm.startNextSeason(JSON.parse(JSON.stringify(ln)))).value;
    const d2 = firstDiff(nb, nn);
    if (d2) fail(`${tag}: after one rollover the branch differs from the base: ${d2}`); else rolled += 1;
  } catch (e) { fail(`${tag}: rollover threw (${String(e?.message ?? e).slice(0, 100)})`); }
  /* a save from before the managers record (Round 308): the branch grows one on load; count the real men seated */
  const bare = JSON.parse(raw); delete bare.managers;
  const ls = loadWith(N, JSON.stringify(bare), seed + 4);
  if (ls?.managers) { strippedCases += 1; realSeatedStripped += Object.values(ls.managers).filter(v => v.real === 1).length; }
  console.log(`  ${tag}: load ${d ? 'DIFF' : 'same'}; league chairs shown real on the old save: ${(ln.leagueClubs ?? []).filter(c => N.cm.dugoutOf(ln, c)?.real).length}; pre-308 save repaired with ${ls?.managers ? Object.values(ls.managers).filter(v => v.real === 1).length : 'no'} real chair(s)`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`old saves: ${same} of ${CASES.length} load identical on the branch, ${rolled} of ${CASES.length} identical after one rollover; real chairs shown on old saves: ${realShownOld}; pre-308 saves repaired: ${strippedCases}, real chairs seated in them: ${realSeatedStripped}`);
console.log(failures ? `rv-oldsave: ${failures} failure(s)` : 'rv-oldsave: green');
process.exit(failures ? 1 : 0);
