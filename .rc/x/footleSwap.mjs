// Round 1210, one off control for src/test/footlePractice.test.tsx (sent to a runner as an extra file, never committed).
// Three copies of src/pages/Footle.tsx, each with ONE FlagImg put back to bare text, swapped in through NO_DOUBLE_SWAP.
// Each must turn the flag case red on its own site's message and leave every other test green.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const VITEST = path.join(path.dirname(createRequire(path.join(ROOT, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs');
const TEST = 'src/test/footlePractice.test.tsx';
const FLAG_CASE = 'prints the answer nationality with its flag in the feedback line, the Nation row and the example';
const src = fs.readFileSync(path.join(ROOT, 'src/pages/Footle.tsx'), 'utf8');
const SITES = [
  { name: 'example', old: '<FlagImg name={examplePlayer.nationality} size={12} showLabel />', bare: '{examplePlayer.nationality}', says: 'the example: one flag' },
  { name: 'feedback', old: '<FlagImg name={targetPlayer.nationality} size={12} showLabel />', bare: '{targetPlayer.nationality}', says: 'feedback line: one flag' },
  { name: 'row', old: '<FlagImg name={player.nationality} size={12} showLabel />', bare: 'player.nationality', says: 'Nation row: one flag' },
];
const work = fs.mkdtempSync(path.join(ROOT, '.sim-control-r1210-'));

function run(swaps) {
  const out = path.join(work, `report-${Math.random().toString(36).slice(2)}.json`);
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', CI: '1' };
  delete env.NO_DOUBLE_SWAP;
  if (swaps) env.NO_DOUBLE_SWAP = JSON.stringify(swaps);
  const r = spawnSync(process.execPath, [VITEST, 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--testTimeout=120000'], { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (!fs.existsSync(out)) { console.log((r.stdout || '').slice(-1500)); console.log((r.stderr || '').slice(-1500)); throw new Error('vitest wrote no report'); }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const rows = report.testResults.flatMap(f => f.assertionResults.map(a => ({ title: a.title, status: a.status, messages: (a.failureMessages || []).join('\n') })));
  return { status: r.status, rows };
}

let bad = 0;
const base = run(null);
const baseFailed = base.rows.filter(r => r.status !== 'passed');
console.log(`base: ${base.rows.length} tests, ${baseFailed.length} not passed, exit ${base.status}`);
if (base.status !== 0 || baseFailed.length || !base.rows.some(r => r.title === FLAG_CASE)) { bad += 1; console.log('  FAIL: the test is not green as committed, or the flag case is missing, so no control can count'); }

let fired = 0;
for (const site of SITES) {
  const count = src.split(site.old).length - 1;
  if (count !== 1) { bad += 1; console.log(`  FAIL: ${site.name}: the anchor occurs ${count} times in Footle.tsx, expected once, the control changed nothing`); continue; }
  const copy = path.join(work, `Footle-${site.name}.tsx`);
  const edited = src.replace(site.old, site.bare);
  if (edited === src) { bad += 1; console.log(`  FAIL: ${site.name}: the copy is identical to the page`); continue; }
  fs.writeFileSync(copy, edited);
  const r = run({ '@/pages/Footle': copy });
  const failed = r.rows.filter(x => x.status !== 'passed');
  const onlyFlagCase = failed.length === 1 && failed[0].title === FLAG_CASE;
  const namesSite = onlyFlagCase && failed[0].messages.includes(site.says);
  if (r.status !== 0 && onlyFlagCase && namesSite) { fired += 1; console.log(`control ${site.name}: FIRED. Exactly the flag case went red, on "${site.says}", ${r.rows.length - 1} other tests green`); }
  else { bad += 1; console.log(`  FAIL: control ${site.name} did not fire as it must: exit ${r.status}, failed [${failed.map(x => x.title).join(' | ')}], names its site: ${namesSite}`); if (failed[0]) console.log(failed[0].messages.slice(0, 600)); }
}
fs.rmSync(work, { recursive: true, force: true });
console.log(`footleSwap: ${fired} of ${SITES.length} controls FIRED, ${bad} problem${bad === 1 ? '' : 's'}`);
process.exit(bad ? 1 : 0);
