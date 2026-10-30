// Round 1600 fix3 probe: simRoles section 10 alone (a do nothing Everton season, unseeded), REPS runs of 60
// seasons on the engine of the tree it is run from (cwd). Prints each run's mean and 2se, then the runs' mean
// and spread. Same bundling as scripts/simRoles.mjs.
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const REPS = Number(process.env.REPS ?? 1);
const RUNS = 60;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'roles10-'));
const ENTRY = path.join(TMP, 'e.mjs');
const BUNDLE = path.join(TMP, 'b.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const cm = mod;
`);
await build({ entryPoints: [ENTRY], outfile: BUNDLE, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
  absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') } });
const { cm } = await import(pathToFileURL(BUNDLE).href);
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) * (x - m)))); };
function runSeason(s) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard++;
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}
const means = [];
for (let k = 0; k < REPS; k++) {
  const pts = [];
  for (let i = 0; i < RUNS; i++) {
    const s = runSeason(cm.startCareer('Everton'));
    const row = s.table.find(t => t.club === s.clubName);
    pts.push(row ? row.pts : 0);
  }
  means.push(mean(pts));
  console.log(`run ${k + 1}: ${RUNS} do nothing Everton seasons ${mean(pts).toFixed(2)} pts (2se ${(2 * sd(pts) / Math.sqrt(RUNS)).toFixed(2)}, season sd ${sd(pts).toFixed(2)})`);
}
console.log(`RUNMEANS ${means.map(x => x.toFixed(2)).join(' ')}`);
fs.rmSync(TMP, { recursive: true, force: true });
