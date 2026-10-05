/**
 * Round 946: records scripts/data/calDateFixture946.json.
 *
 * Run ONCE, against origin/main's tree before any Round 946 code moved, so the
 * fixture is the real pre-lift output of Club Manager's date helpers and the
 * calendar built on them, not a reimplementation of it. The procedure lives in
 * scripts/lib/calDateProbe946.mjs; scripts/simGmCalendar.mjs section 1 replays
 * it against the current tree. Re-recording to turn that section green is
 * exactly the failure it exists to catch: only rerun this when a deliberate
 * Club Manager calendar change lands, and say so in that round's commit.
 *
 * Run: node scripts/recordCalDateFixture946.mjs
 * Honesty checks (never commit their output):
 *   CALDATE_FIXTURE_OUT=<path>  write somewhere else (record twice, compare bytes)
 *   CALDATE_CAL_PATH=<path>     bundle a scratch copy of clubManagerCalendar.ts
 *   CALDATE_BASE_SHA=<sha>      the main sha written into the header
 */
import { build } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { probeCalDate } from './lib/calDateProbe946.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caldaterec-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });
const calPath = (process.env.CALDATE_CAL_PATH || `${R}/src/lib/clubManagerCalendar.ts`).replaceAll('\\', '/');
const ENTRY = path.join(tmpDir, 'entry.mjs');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const cal = await import('${calPath}');
export const cm = await import('${R}/src/lib/clubManager.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT,
});
const B = await import(pathToFileURL(BUNDLE).href);
const data = probeCalDate({ cal: B.cal, cm: B.cm });
let sha = process.env.CALDATE_BASE_SHA || '';
if (!sha) { try { sha = execSync('git rev-parse --short=8 HEAD', { cwd: ROOT }).toString().trim(); } catch { sha = 'unknown'; } }
const fixture = { recordedFrom: sha, note: 'Round 946 pre-lift record of the Club Manager date helpers and calendar; see scripts/lib/calDateProbe946.mjs', ...data };
const out = process.env.CALDATE_FIXTURE_OUT || path.join(ROOT, 'scripts/data/calDateFixture946.json');
fs.writeFileSync(out, JSON.stringify(fixture, null, 1) + '\n');
console.log(`wrote ${out}: ${data.days.lines} days, ${data.careers.length} careers, date rule ${data.careers.map(c => c.dateRule.lines).join('/')}`);
