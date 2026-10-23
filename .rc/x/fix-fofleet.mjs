// Round 1552 fixer probe (sent to a runner as .rc/x/fix-fofleet.mjs, never committed).
// Face Off now asks clearlyAhead instead of its own inline ratio check. Claim: it deals exactly the
// same pairs, because pickPair's pool is already finite and above zero. Proof: bundle faceOff.ts
// from BASE (the head before the change) and from the working tree, deal the daily (13 rounds, the
// ten plus every sudden death round) for 3,000 dates and 2,000 seeded matches at each difficulty,
// and compare byte for byte. FOFLEET_CONTROL=1 loosens the head copy's rule to hi > lo, which must
// make some deals differ (so the comparator is not blind).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.FOFLEET_BASE || '1f0e91e43';
const CONTROL = process.env.FOFLEET_CONTROL === '1';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fofleet-'));
const baseSrc = execSync(`git show ${BASE}:src/lib/faceOff.ts`, { cwd: ROOT, encoding: 'utf8' });
let headSrc = fs.readFileSync(path.join(ROOT, 'src/lib/faceOff.ts'), 'utf8');
if (CONTROL) {
  const from = '!clearlyAhead(hi, lo)';
  if (!headSrc.includes(from)) { console.error('control cannot run: the head does not contain ' + from); process.exit(3); }
  headSrc = headSrc.replace(from, '!(hi > lo)');
  console.log('CONTROL ON: the head copy asks hi > lo');
}
if (!/hi \/ lo < MIN_RATIO/.test(baseSrc)) { console.error('the base is not the inline rule: wrong BASE?'); process.exit(3); }
async function load(name, src) {
  const file = path.join(tmp, name + '.ts');
  fs.writeFileSync(file, src);
  const out = path.join(tmp, name + '.mjs');
  await build({ entryPoints: [file], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') } });
  return import(pathToFileURL(out).href);
}
const B = await load('base', baseSrc), H = await load('head', headSrc);
const deal = (F, seed, diff) => JSON.stringify(F.dealRounds(F.buildCategories(), F.makeRng(seed), diff, F.ROUNDS + F.MAX_EXTRA));
let compared = 0, differ = 0, example = '';
const addDays = (d, k) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 86400000).toISOString().slice(0, 10);
for (let k = 0; k < 3000; k++) {
  const d = addDays('2025-01-01', k);
  compared += 1;
  if (deal(B, B.seedForDate(d), B.DAILY_DIFFICULTY) !== deal(H, H.seedForDate(d), H.DAILY_DIFFICULTY)) { differ += 1; example ||= d; }
}
console.log(`daily: ${compared} dates from 2025-01-01, ${differ} differ${example ? ` (first ${example})` : ''}`);
const diffs = ['rookie', 'pro', 'legend'];
let c2 = 0, d2 = 0;
for (const diff of diffs) for (let s = 1; s <= 2000; s++) { c2 += 1; if (deal(B, s * 7919, diff) !== deal(H, s * 7919, diff)) d2 += 1; }
console.log(`seeded: ${c2} matches over difficulties [${diffs.join(', ')}], ${d2} differ`);
const total = differ + d2;
if (CONTROL) { console.log(total > 0 ? `fofleet: CONTROL FIRED, ${total} deals differ` : 'fofleet: CONTROL DID NOT FIRE'); process.exit(total > 0 ? 1 : 0); }
console.log(total === 0 ? 'fofleet: every deal byte identical' : `fofleet: ${total} deals differ`);
process.exit(total === 0 ? 0 : 1);
