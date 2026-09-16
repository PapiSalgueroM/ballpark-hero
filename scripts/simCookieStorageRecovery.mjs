// Real consent and ad components. Controls mutate copies outside the source tree.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, realpath, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.COOKIE_STORAGE_CONTROL || '';
const controls = {
  read: ['cookie', "setStorageError('Your browser is blocking saved choices. Essential only still works for this page.');\n      setVisible(true);", "setStorageError('Your browser is blocking saved choices. Essential only still works for this page.');", 'blocked read', 'Blocked read must show the recovery banner'],
  accept: ['cookie', "if (!saveChoice('accepted')) return;", "saveChoice('accepted'); setConsentStorageBlocked(false);", 'failed Accept', 'Failed Accept must keep optional loads blocked'],
  essential: ['cookie', "if (choice === 'essential') setVisible(false);", '/* dismissal removed */', 'failed Essential', 'Failed Essential must dismiss for this page'],
  mount: ['ad', 'if (isConsentStorageBlocked()) return null;', '/* stale stored value restored */', 'failed Essential', 'A later ad mount must reject stale stored Accept'],
  event: ['ad', 'setConsent(isConsentStorageBlocked() ? null : e.newValue)', 'setConsent(e.newValue)', 'failed Essential', 'Consent events must not revive an ad after storage failure'],
  ads: ['scripts', 'if (isConsentStorageBlocked()) return false;', '/* ad block removed */', 'blocked page', 'Blocked page must reject the ad loader'],
  analytics: ['scripts', 'if (isConsentStorageBlocked()) return;', '/* analytics block removed */', 'blocked page', 'Blocked page must reject the analytics loader'],
  retry: ['cookie', 'setConsentStorageBlocked(false);', 'setConsentStorageBlocked(true);', 'successful explicit retry', 'A successful explicit save must clear the page block'],
  crossaccept: ['cookie', 'if (isConsentStorageBlocked()) return;', '/* cross-tab acceptance bypasses page block */', 'successful explicit retry', 'Cross-tab Accept cannot dismiss unresolved storage failure'],
};
assert.ok(!control || Object.hasOwn(controls, control), 'Unknown COOKIE_STORAGE_CONTROL');
const folder = await mkdtemp(path.join(tmpdir(), 'dukb-cookie-storage-'));
const evidence = await mkdtemp(path.join(tmpdir(), `dukb-cookie-evidence-${control || 'healthy'}-`));
const summary = { root, control: control || 'healthy', evidence, outcome: 'incomplete' };
const log = [];
const record = (...parts) => { const line = parts.join(' '); log.push(line); console.log(line); };
record('Evidence retained:', evidence);
try {
  const files = {
    cookie: 'src/components/CookieConsent.tsx',
    ad: 'src/components/ads/AdBanner.tsx',
    scripts: 'src/lib/consentedScripts.ts',
  };
  const aliases = {
    cookie: '@/components/CookieConsent',
    ad: '@/components/ads/AdBanner',
    scripts: '@/lib/consentedScripts',
  };
  const alias = {};
  if (control) {
    const [key, before, after] = controls[control];
    const original = (await readFile(path.join(root, files[key]), 'utf8')).replaceAll('\r\n', '\n');
    assert.equal(original.split(before).length - 1, 1, 'Control anchor must occur exactly once');
    const changed = original.replace(before, after);
    assert.notEqual(changed, original, 'Control must mutate source');
    const copy = path.join(folder, path.basename(files[key]));
    await writeFile(copy, changed);
    alias[aliases[key]] = copy;
    record('CONTROL MUTATED:', control);
  }
  alias['@'] = path.join(root, 'src');
  const config = {
    root,
    test: { environment: 'jsdom', globals: true, setupFiles: [path.join(root, 'src/test/setup.ts')], include: ['src/test/cookieStorageRecovery.test.tsx'] },
    esbuild: { jsx: 'automatic' },
    resolve: { alias, dedupe: ['react', 'react-dom', 'react-router-dom'] },
    server: { fs: { allow: [root, folder, await realpath(path.join(root, 'node_modules'))] } },
  };
  const configPath = path.join(folder, 'vitest.config.mjs');
  const reportPath = path.join(evidence, 'result.json');
  await writeFile(configPath, `export default ${JSON.stringify(config)};\n`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', configPath, '--maxWorkers=1', '--minWorkers=1', '--reporter=json', '--outputFile', reportPath];
  if (control) args.push('-t', controls[control][3]);
  const child = spawnSync(process.execPath, args, { cwd: root, env: process.env, encoding: 'utf8' });
  await writeFile(path.join(evidence, 'stdout.log'), child.stdout || '');
  await writeFile(path.join(evidence, 'stderr.log'), child.stderr || '');
  Object.assign(summary, { status: child.status, signal: child.signal, error: child.error?.message });
  process.stdout.write(child.stdout || '');
  process.stderr.write(child.stderr || '');
  if (child.error) throw child.error;
  assert.equal(child.signal, null, 'Vitest must exit normally');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(report.numRuntimeErrorTestSuites || 0, 0, 'No runtime-error suites');
  assert.equal(report.numUnhandledErrors || 0, 0, 'No unhandled errors');
  assert.equal((report.unhandledErrors || []).length, 0, 'No unhandled error entries');
  assert.doesNotMatch((child.stdout || '') + (child.stderr || ''), /Unhandled Errors|Unhandled Rejection|Uncaught Exception/, 'No unhandled error output');
  const assertions = report.testResults.flatMap(result => result.assertionResults);
  const failures = assertions.filter(result => result.status === 'failed');
  for (const failure of failures) record(failure.fullName, ...failure.failureMessages);
  if (control) {
    assert.equal(child.status, 1, 'Control must fail Vitest');
    assert.equal(failures.length, 1, 'Control must fail exactly its selected test');
    assert.ok(failures[0].fullName.includes(controls[control][3]), 'Control failed intended case');
    assert.ok(failures[0].failureMessages.join('\n').includes(controls[control][4]), 'Control must fail its intended assertion');
    record('CONTROL PROVED:', control);
    summary.outcome = 'control-proved';
    process.exitCode = 1;
  } else {
    assert.equal(child.status, 0, 'Healthy Vitest must exit zero');
    assert.equal(report.numPassedTests, 6, 'All six real-component cases must pass');
    assert.equal(report.numFailedTests, 0, 'No failed tests');
    record('PASS cookie storage recovery: 6/6 real-component cases');
    summary.outcome = 'pass';
  }
} catch (error) {
  summary.outcome = 'unexpected-failure';
  summary.error = String(error?.stack || error);
  record(summary.error);
  process.exitCode = 1;
} finally {
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  await writeFile(path.join(evidence, 'runner.log'), log.join('\n') + '\n');
  assert.equal(path.dirname(path.resolve(folder)), path.resolve(tmpdir()));
  assert.ok(path.basename(folder).startsWith('dukb-cookie-storage-'));
  await rm(folder, { recursive: true, force: true });
}
