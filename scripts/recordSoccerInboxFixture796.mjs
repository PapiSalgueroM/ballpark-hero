/**
 * Round 796: records scripts/data/soccerInboxFixture796.json.
 *
 * Run ONCE, against the tree before any Round 796 code moved, so the fixture
 * is the real pre-lift output rather than a reimplementation of it. The
 * procedure lives in scripts/lib/soccerInboxProbe796.mjs and
 * scripts/simCareerInboxBeats.mjs section 1 replays it against the current
 * tree. Only rerun this when a deliberate Soccer Career content change lands
 * (a new phone text, a reworded dilemma), and say so in that round's commit:
 * re-recording to turn the harness green is exactly the failure it exists to
 * catch.
 *
 * Run: node scripts/recordSoccerInboxFixture796.mjs
 */
import { build } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { probeSoccer } from './lib/soccerInboxProbe796.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soccerinboxrec-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = path.join(tmpDir, 'entry.mjs');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const soccer = await import('${R}/src/lib/soccerCareerEngine.ts');
export const inboxMod = await import('${R}/src/lib/careerInbox.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT,
});
const B = await import(pathToFileURL(BUNDLE).href);
const data = probeSoccer(B);
const out = path.join(ROOT, 'scripts/data/soccerInboxFixture796.json');
fs.writeFileSync(out, JSON.stringify(data) + '\n');
console.log(`wrote ${path.relative(ROOT, out)}: ${data.inbox.length} inbox careers, ${data.rivalDilemmas.length} rival dilemma resolutions, ${data.dilemmaOrder.length} dilemmas in order`);
