/* Release BC join, a probe (never committed): Round 1311's "whichever lands second" timing of leagueBoardsOf on a
 * seeded career (Release AZ gives every new career a world seed), against the same career with worldSeed deleted
 * at the start (a save from before the release). Plays CLUB from seed SEED, SEASONS seasons, then 12 match weeks of
 * the next one, and times REPS calls of leagueBoardsOf at that point (first call apart: it fills the roster caches).
 *   SEED=1311 CLUB=Arsenal SEASONS=2 REPS=40 node .rc/x/boardsTiming.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const ROOT = process.cwd();
const TAG = `${process.pid}-${Date.now()}`;
const ENTRY = path.join(os.tmpdir(), `boards-${TAG}.mjs`);
const BUNDLE = path.join(os.tmpdir(), `boards-${TAG}.bundle.mjs`);
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const eras = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManagerEras.ts');
export { engine, eras };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const { engine: cm, eras: E } = await import(pathToFileURL(BUNDLE).href);
await E.ensureAllEraRosters();
const { startCareer, playNextEntry, finishSeason, startNextSeason, leagueBoardsOf } = cm;
const SEED = Number(process.env.SEED ?? 1311);
const CLUB = process.env.CLUB ?? 'Arsenal';
const SEASONS = Number(process.env.SEASONS ?? 2);
const REPS = Number(process.env.REPS ?? 40);
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const median = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };

function play(unseeded) {
  Math.random = seeded(SEED);
  let s = startCareer(CLUB);
  if (unseeded) { s = { ...s }; delete s.worldSeed; }
  for (let y = 0; y < SEASONS; y++) {
    let g = 0;
    while (g++ < 500) { const r = playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; }
    s = startNextSeason(finishSeason(s).state);
  }
  for (let w = 0; w < 12; w++) { const r = playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; }
  return s;
}
let bad = 0;
for (const unseeded of [false, true]) {
  const s = play(unseeded);
  const t0 = performance.now();
  const first = leagueBoardsOf(s);
  const firstMs = performance.now() - t0;
  const times = [];
  for (let i = 0; i < REPS; i++) { const a = performance.now(); leagueBoardsOf(s); times.push(performance.now() - a); }
  const arm = unseeded ? 'unseeded' : 'seeded';
  if (!unseeded && s.worldSeed === undefined) bad += 1;
  console.log(`TIMING ${arm}: season ${s.season}, worldSeed ${s.worldSeed === undefined ? 'none' : 'set'}, boards ${first ? 'built' : 'null'}, first call ${firstMs.toFixed(1)} ms, median of ${REPS} ${median(times).toFixed(2)} ms, max ${Math.max(...times).toFixed(2)} ms`);
}
fs.rmSync(ENTRY, { force: true });
fs.rmSync(BUNDLE, { force: true });
process.exit(bad ? 1 : 0);
