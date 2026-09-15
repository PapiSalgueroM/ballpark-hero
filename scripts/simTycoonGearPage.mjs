/** Real title/equipment writes and cold stadium gear consumption. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoon-gear-page-'));
const CONTROL = process.env.GEAR_PAGE_CONTROL || '';
const hooks = 'src/hooks/useStadiumTycoon.ts';
const controls = {
  division: [hooks, '1 saves the played division', 'const playedDivision = stateRef.current.league?.division;', 'const playedDivision = (stateRef.current.league?.division ?? 0) + 1;'],
  order: [hooks, '1 saves the played division', 'try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, Date.now())); } catch { allowGear = false; }', 'try { void next; } catch { allowGear = false; }'],
  stadium: [hooks, '2 a refused stadium save', 'catch { allowGear = false; }', 'catch { allowGear = true; }'],
  notice: [hooks, '3 a refused title ledger', '() => setGearSaveBlocked(true)', '() => setGearSaveBlocked(false)'],
  equip: ['src/hooks/useWonderkidFactory.ts', '4 reassignment saves once', 'if (!equipBoot(next, seniorId, bootId, loadLedger().gearLevel ?? {})) return;', 'if (!equipBoot(next, seniorId, bootId, loadLedger().gearLevel ?? {})) return; Object.assign(stateRef.current!, next);'],
  upgrade: ['src/lib/tycoonRewards.ts', '5 a failed upgrade', 'saveLedger(next, true);\n  return true;', 'void next;\n  return true;'],
  edge: ['src/pages/StadiumTycoon.tsx', '6 the cold real page', 'squadEdge(academyRef.current, loadLedger().gearLevel)', 'squadEdge(academyRef.current)'],
};
assert(!CONTROL || CONTROL in controls, `Unknown GEAR_PAGE_CONTROL=${CONTROL}`);
const alias = {};
if (CONTROL) {
  const [file, , before, after] = controls[CONTROL];
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(source.split(before).length - 1, 1, 'control must find one executable anchor');
  const changed = source.replace(before, after);
  assert.notEqual(source, changed, 'control must change executable code');
  const copy = path.join(TEMP, path.basename(file)); fs.writeFileSync(copy, changed);
  alias['@/' + file.slice(4).replace(/\.tsx?$/, '')] = copy;
  console.log(`CONTROL ${CONTROL}: one unique executable mutation applied outside src`);
}
alias['@'] = path.join(ROOT, 'src');
const reportFile = path.join(TEMP, 'report.json'), configFile = path.join(TEMP, 'vitest.config.mjs');
fs.writeFileSync(configFile, `export default ${JSON.stringify({
  root: ROOT,
  test: { environment: 'jsdom', globals: true, setupFiles: [path.join(ROOT, 'src/test/setup.ts')], include: ['src/test/tycoonGear.test.tsx'], testTimeout: 30000, hookTimeout: 30000, maxWorkers: 1 },
  esbuild: { jsx: 'automatic' }, resolve: { alias, dedupe: ['react', 'react-dom', 'lucide-react'] },
  server: { fs: { allow: [ROOT, TEMP, fs.realpathSync(path.join(ROOT, 'node_modules'))] } },
})};\n`);
const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', '--config', configFile, '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
if (CONTROL) args.push('-t', controls[CONTROL][1]);
const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 24 * 1024 * 1024 });
if (run.error) throw run.error;
console.log(run.stdout || ''); if (run.stderr) console.error(run.stderr);
assert(fs.existsSync(reportFile), `no runtime report; artifacts ${TEMP}`);
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const rows = report.testResults.flatMap(file => file.assertionResults);
if (CONTROL) {
  const target = rows.find(row => row.title.startsWith(controls[CONTROL][1]));
  assert(target, 'intended control test not collected');
  assert.equal(target.status, 'failed', 'intended outcome did not fail');
  assert.equal(run.status, 1, 'control exited outside intended assertion');
  console.log(`CONTROL PROVED ${CONTROL}: ${target.title}`); process.exitCode = 1;
} else {
  assert.equal(rows.length, 6, 'the six actual hook/page cases must not be thinned');
  assert(rows.every(row => row.status === 'passed'), 'an actual hook/page outcome failed');
  assert.equal(run.status, 0);
  console.log('Tycoon gear page: 6/6 actual hook/page cases passed');
}
console.log(`Artifacts: ${TEMP}`);
