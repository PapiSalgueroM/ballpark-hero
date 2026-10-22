/* Release BP part two (BPH), runner only, never committed: measure routes that have no sweepWeight row yet.
   Writes scripts/zzWeightProbe.mjs, a copy of scripts/sweepWeight.mjs with a row ['<route>', 9999] for every route
   named in WEIGHT_PROBE_ROUTES (comma separated), runs it against BASE, prints the measured lines, removes the copy.
   Usage (from the repo root, a served build on BASE): WEIGHT_PROBE_ROUTES=/nba-front-office node .rc/x/weightProbe.mjs */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const routes = (process.env.WEIGHT_PROBE_ROUTES || '/nba-front-office').split(',').filter(Boolean);
const src = fs.readFileSync('scripts/sweepWeight.mjs', 'utf8');
const anchor = 'const BUDGETS = [\n';
if (src.split(anchor).length !== 2) { console.error('ABORT: the BUDGETS anchor is not in sweepWeight.mjs exactly once'); process.exit(2); }
const rows = routes.filter(r => !src.includes(`['${r}',`)).map(r => `  ['${r}', 9999],\n`).join('');
fs.writeFileSync('scripts/zzWeightProbe.mjs', src.replace(anchor, anchor + rows));
const run = spawnSync(process.execPath, ['scripts/zzWeightProbe.mjs'], { encoding: 'utf8', env: { ...process.env, SWEEP_OFFLINE: '1' }, maxBuffer: 64 << 20 });
fs.rmSync('scripts/zzWeightProbe.mjs');
const out = `${run.stdout}\n${run.stderr}`;
const want = ['/soccer-career', '/stadium-tycoon', '/club-manager', ...routes];
for (const line of out.split('\n')) if (want.some(r => line.includes(`${r} `)) && /gz over/.test(line)) console.log(line);
console.log(`weightProbe: measured ${routes.join(' ')} (rows added: ${rows ? rows.trim().split('\n').length : 0}), sweep exit ${run.status}`);
