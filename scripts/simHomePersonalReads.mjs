/* Round 873: actual homepage ownership with inert account transport.
   HOME_PERSONAL_READ_CONTROL corrupts one executable behavior in a copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = 'src/pages/Index.tsx', test = 'src/test/homePersonalReads.test.tsx';
const baselines = ['preserves useful public popularity for signed out visitors', 'preserves visible signed in rank distinct games local floor and tile bests'];
const controls = {
  eligibility: ['!canReadPersonal', 'false', 'guests make zero personal reads through focus visibility and idle time'],
  visibility: ["document.visibilityState !== 'visible'", 'false', 'hidden eligible accounts defer reads until one foreground batch'],
  flight: ['|| fetching || loaded', '|| false || loaded', 'coalesces in flight events and does not poll completed reads'],
  ownership: ['if (!active) return;', 'if (false) return;', 'late prior account responses cannot overwrite the new visible identity'],
  cancel: ['controller?.abort();', 'void controller;', 'unmount aborts owned requests and removes foreground listeners'],
  history: [".eq('completed_on', todayUtc).abortSignal(controller.signal),", '.abortSignal(controller.signal),', 'does not query unused traffic counts or unbounded lifetime history'],
  count: [".eq('user_id', accountId).abortSignal(controller.signal),", ".eq('user_id', accountId).abortSignal(controller.signal),\n          supabase.from('daily_completions').select('user_id', { count: 'exact', head: true }),", 'does not query unused traffic counts or unbounded lifetime history'],
};
const control = process.env.HOME_PERSONAL_READ_CONTROL || '';
assert.ok(!control || control in controls, 'Known homepage read control');
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all([component, test, 'src/hooks/useMostPlayed.ts', 'src/contexts/AuthContext.tsx', 'src/integrations/supabase/client.ts'].map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const source = held[0][1].source;
for (const [anchor] of Object.values(controls)) {
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n')), beforeBytes = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1);
  assert.deepEqual(crlfBytes, beforeBytes);
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/home-personal873-'));
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1000', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' }; delete env.NO_DOUBLE_SWAP;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const [anchor, replacement, target] = controls[control];
    assert.equal(source.split(anchor).length - 1, 1, 'The executable control binds exactly once');
    const changed = source.replace(anchor, replacement); assert.notEqual(changed, source);
    const copy = path.join(folder, 'Index.tsx'); await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/Index': copy });
    args.push('--testNamePattern', [target, ...baselines].join('|'));
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults); assert.equal(rows.length, 13);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 2); assert.equal(report.numPendingTests, 10);
    const target = rows.find(row => row.title === controls[control][2]); assert.equal(target?.status, 'failed');
    for (const title of baselines) assert.equal(rows.find(row => row.title === title)?.status, 'passed');
    assert.match(target.failureMessages.join('\n'), /AssertionError:|expect\(element\)|TestingLibraryElementError: Unable to find an element with the text:/);
    console.log(`Homepage personal ${control}: one executable binding changed in an isolated page.`);
    console.log(`Homepage personal ${control}: one intended outcome failed, both real public/signed-in baselines passed, ten explicit skips.`);
    console.log(`HOME_PERSONAL_CONTROL: ${JSON.stringify({ control, title: target.title, failure: target.failureMessages[0].split('\n')[0] })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 13); assert.equal(report.numPendingTests, 0);
    console.log('Homepage personal reads: 13/13 real homepage cases passed, none skipped; inert Supabase boundary, zero fetch calls.');
    console.log('Homepage personal reads: guests make zero personal reads; public trending queries and rendered links stay useful.');
    console.log('Homepage personal reads: one visible account batch preserves two hero reads and the existing tile-best read, without background polling.');
    console.log('Homepage personal reads: matching profiles, in-flight coalescing, stable identities, account/handle ownership and abort cleanup hold.');
    console.log('Homepage personal reads: failed reads keep local facts until a foreground retry; invisible traffic counts and lifetime-history reads are gone.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Homepage, focused test, useful popularity, Auth and client bytes held');
  }
}
console.log('Homepage personal reads: CRLF bindings proved, original bytes held, owned copies cleaned; no live DB/browser/AdSense acceptance claimed.');
