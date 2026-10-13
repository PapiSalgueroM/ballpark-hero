/* Release AZ fix pass 4, a probe for the lead (never committed): simEras section 5 played alone, with the
 * seed base, the number of careers and the world seed chosen from the environment, so the champion points gap
 * of the head can be measured over more careers and with the world seed taken off (UNSEEDED=1 deletes
 * worldSeed right after startCareer: the save is then a save from before the release, which by ruling Y1 never
 * writes a ledger and plays the projected world, byte equal to b6eb78e7 by simCmUnseededWorld).
 * The loop is section 5's own, copied line for line from scripts/simEras.mjs (setSeed, playSeason, the pin).
 *   SEED_BASE=9000 RUNS=40 SEASONS=12 UNSEEDED=0 node .rc/x/eras5probe.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const TAG = `${process.pid}-${Date.now()}`;
const ENTRY = path.join(os.tmpdir(), `eras5probe-${TAG}.mjs`);
const BUNDLE = path.join(os.tmpdir(), `eras5probe-${TAG}.bundle.mjs`);
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const eras = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManagerEras.ts');
export { engine, eras };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const { engine: cm, eras: E } = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(ENTRY, { force: true });
fs.rmSync(BUNDLE, { force: true });
await E.ensureAllEraRosters();
const { startCareer, playNextEntry, finishSeason, startNextSeason, sortedTable, renewContract, expiringPlayers, yearsOn } = cm;
const { CM_BASE_YEAR } = E;

const SEED_BASE = Number(process.env.SEED_BASE ?? 9000);
const RUNS = Number(process.env.RUNS ?? 40);
const SEASONS = Number(process.env.SEASONS ?? 12);
const UNSEEDED = process.env.UNSEEDED === '1';
const CLUB = process.env.CLUB ?? 'Everton';

const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;
const setSeed = s => { Math.random = seeded(s); };
const clearSeed = () => { Math.random = REAL_RANDOM; };
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
let failures = 0;

function playSeason(state, { renew }) {
  let s = state;
  if (renew) {
    s = { ...s, budget: s.budget + 300 };
    for (const p of expiringPlayers(s)) { const n = renewContract(s, p.id); if (n) s = n; }
  }
  let guard = 0;
  while (guard++ < 500) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  if (guard >= 500) failures += 1;
  return finishSeason(s);
}

const arms = {};
const perRun = { frozen: [], ticking: [] };
for (const frozen of [true, false]) {
  const champPts = [], gpg = [], myPts = [];
  for (let run = 0; run < RUNS; run++) {
    setSeed(SEED_BASE + run);
    let s = startCareer(CLUB);
    if (UNSEEDED) { s = { ...s }; delete s.worldSeed; }
    const runChamp = [];
    for (let y = 0; y < SEASONS; y++) {
      const { state, summary } = playSeason(s, { renew: true });
      const table = sortedTable(state.table);
      const games = table.reduce((a, r) => a + r.w + r.d + r.l, 0) / 2;
      gpg.push(table.reduce((a, r) => a + r.gf, 0) / Math.max(1, games));
      champPts.push(table[0].pts);
      runChamp.push(table[0].pts);
      myPts.push(summary.points);
      s = startNextSeason(frozen ? { ...state, startYear: CM_BASE_YEAR - state.season } : state);
      if (frozen && yearsOn(s) !== 0) failures += 1;
      if (UNSEEDED && s.worldSeed !== undefined) failures += 1;
      if (UNSEEDED && s.worldRoster !== undefined) failures += 1;
    }
    perRun[frozen ? 'frozen' : 'ticking'].push(mean(runChamp));
  }
  arms[frozen ? 'frozen' : 'ticking'] = { gpg: mean(gpg), champPts: mean(champPts), myPts: mean(myPts), n: champPts.length };
}
clearSeed();
const f = arms.frozen, t = arms.ticking;
const diffs = perRun.ticking.map((v, i) => v - perRun.frozen[i]);
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1)); };
console.log(`PROBE club=${CLUB} seedBase=${SEED_BASE} runs=${RUNS} seasons=${SEASONS} unseeded=${UNSEEDED} failures=${failures}`);
console.log(`PROBE frozen champ ${f.champPts.toFixed(2)} gpg ${f.gpg.toFixed(3)} my ${f.myPts.toFixed(2)} | ticking champ ${t.champPts.toFixed(2)} gpg ${t.gpg.toFixed(3)} my ${t.myPts.toFixed(2)}`);
console.log(`PROBE gap champ ${(t.champPts - f.champPts).toFixed(2)} (abs ${Math.abs(t.champPts - f.champPts).toFixed(2)}), per career diff sd ${sd(diffs).toFixed(2)}, se ${(sd(diffs) / Math.sqrt(diffs.length)).toFixed(2)}`);
console.log(`PROBE perRunTicking ${JSON.stringify(perRun.ticking.map(v => Math.round(v * 100) / 100))}`);
console.log(`PROBE perRunFrozen ${JSON.stringify(perRun.frozen.map(v => Math.round(v * 100) / 100))}`);
process.exit(failures ? 1 : 0);
