/* Offline hook outcomes. Controls use isolated source copies in OS temp. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'navbar-stats-'));
const CONTROL = process.env.NAVBAR_STATS_CONTROL || '';
const controls = {
  guest: ['1 guests', '!canReadRemote || ', '', 'guests must never read remote stats'],
  hidden: ['2 hidden', "document.visibilityState !== 'visible' || ", '', 'hidden tabs must never start a remote read'],
  foreground: ['2 hidden', "if (document.visibilityState === 'visible') fetchStats();", "if (document.visibilityState === 'visible') void 0;", 'foreground must request exactly one fresh read'],
  poll: ['2 hidden', 'setInterval(fetchStats, 60_000)', 'setInterval(fetchStats, 600_000)', 'visible fallback must still poll'],
  profile: ['3 login', 'profile?.user_id === accountId', '!!profile', 'new account must not use the old profile'],
  completion: ['4 completion', 'setTimeout(fetchStats, 800)', 'setTimeout(fetchStats, 8_000)', 'completion must refresh at the existing 800ms delay'],
  local: ['4 completion', 'const handleGameComplete = () => {\n      setStats(', 'const handleGameComplete = () => {\n      if (false) setStats(', 'completion must update local facts before network'],
  identity: ['5 old-account', '[accountId, canReadRemote, playerName]', '[canReadRemote, playerName]', 'same handle on another account still starts a new generation'],
  stale: ['5 old-account', 'if (!active) return;\n        const rankRow', 'if (false) return;\n        const rankRow', 'obsolete success must not replace the current account'],
  error: ['6 obsolete', 'if (!active) return;\n        console.debug', 'if (false) return;\n        console.debug', 'obsolete error must not finish the active account read'],
  timer: ['7 unmount', 'active = false;\n      clearTimeout(completionTimer);', 'active = false;', 'cleanup must cancel the completion delay and poll'],
  listener: ['7 unmount', "window.removeEventListener('game-completion-saved', handleGameComplete);", 'void handleGameComplete;', 'cleanup must remove completion and foreground listeners'],
};
assert(!CONTROL || Object.hasOwn(controls, CONTROL), `Unknown NAVBAR_STATS_CONTROL=${CONTROL}`);
const alias = {};
if (CONTROL) {
  const [, before, after] = controls[CONTROL];
  const source = fs.readFileSync(path.join(ROOT, 'src/hooks/useGameNavbarStats.ts'), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(source.split(before).length - 1, 1, 'control must match one executable anchor');
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, 'control must change executable source');
  const copy = path.join(TEMP, 'useGameNavbarStats.ts');
  fs.writeFileSync(copy, changed);
  alias['@/hooks/useGameNavbarStats'] = copy;
  console.log(`CONTROL MUTATION APPLIED: ${CONTROL}`);
}
alias['@'] = path.join(ROOT, 'src');
const reportFile = path.join(TEMP, 'report.json');
const configFile = path.join(TEMP, 'vitest.config.mjs');
fs.writeFileSync(configFile, `export default ${JSON.stringify({
  root: ROOT,
  test: { environment: 'jsdom', globals: true, setupFiles: [path.join(ROOT, 'src/test/setup.ts')], include: ['src/hooks/useGameNavbarStats.test.tsx'], maxWorkers: 1 },
  esbuild: { jsx: 'automatic' }, resolve: { alias, dedupe: ['react', 'react-dom'] },
  server: { fs: { allow: [ROOT, TEMP, fs.realpathSync(path.join(ROOT, 'node_modules'))] } },
})};\n`);
const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', '--config', configFile, '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
if (CONTROL) args.push('-t', controls[CONTROL][0]);
const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
assert(!run.error, run.error?.message);
console.log(run.stdout || '');
if (run.stderr) console.error(run.stderr);
assert(fs.existsSync(reportFile), `No test report; inspect ${TEMP}`);
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const rows = report.testResults.flatMap(file => file.assertionResults);
if (CONTROL) {
  const [prefix, , , expected] = controls[CONTROL];
  const target = rows.find(row => row.title.startsWith(prefix));
  assert(target, 'intended control test must be collected');
  assert.equal(target.status, 'failed', 'intended outcome must fail');
  assert(target.failureMessages.some(message => message.includes(expected)), 'failure must identify the intended outcome');
  assert.equal(run.status, 1, 'control must exit on its assertion');
  console.log(`CONTROL PROVED ${CONTROL}: ${expected}`);
  process.exitCode = 1;
} else {
  assert.equal(rows.length, 7, 'all seven offline cases must be collected');
  assert(rows.every(row => row.status === 'passed'), 'all seven offline outcomes must pass');
  assert.equal(run.status, 0);
  console.log('Navbar stats: 7/7 offline outcome cases passed');
}
console.log(`Artifacts: ${TEMP}`);
