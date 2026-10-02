/* Round 865: a delayed chain validator can settle only the run that owns it.
   CHAIN_REQUEST_CONTROL=unowned or unmount exercises actual copied guards. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.CHAIN_REQUEST_CONTROL || '';
assert.ok(['', 'unowned', 'unmount'].includes(control), 'Known chain request control');
const hooks = ['useTennisChain', 'useNascarChain'];
const holdSource = bytes => ({ bytes, text: bytes.toString('utf8').replace(/\r\n/g, '\n') });
const held = await Promise.all(hooks.map(async hook => [hook, holdSource(await readFile(path.join(root, `src/hooks/${hook}.ts`)))]));
const unmountAnchor = 'useEffect(() => () => { requestIdRef.current += 1; }, []);';
const staleAnchor = '      if (requestId !== requestIdRef.current) return;';
const finallyAnchor = '      if (requestId === requestIdRef.current) {\n        validatingRef.current = false;\n        setValidating(false);\n      }';
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/chain-request-'));
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const swaps = {};
    for (const [hook, heldSource] of held) {
      const crlfBytes = Buffer.from(heldSource.text.replace(/\n/g, '\r\n'));
      const crlfRead = holdSource(crlfBytes);
      assert.ok(crlfBytes.includes(Buffer.from('\r\n')), 'Control input contains real CRLF endings');
      assert.deepEqual(crlfRead.bytes, crlfBytes, 'CRLF raw bytes stay exact');
      assert.equal(crlfRead.text, heldSource.text, 'Actual read helper normalizes the full CRLF hook');
      let source = crlfRead.text;
      const before = source;
      if (control === 'unowned') {
        assert.equal(source.split(staleAnchor).length - 1, 2, 'Both actual stale response and catch guards exist');
        assert.equal(source.split(finallyAnchor).length - 1, 1, 'Actual finally ownership guard exists once');
        assert.ok(!crlfBytes.toString('utf8').includes(finallyAnchor), 'The multiline LF anchor cannot match raw CRLF');
        source = source.split(staleAnchor).join('');
        source = source.replace(finallyAnchor, '      validatingRef.current = false;\n      setValidating(false);');
      } else {
        assert.equal(source.split(unmountAnchor).length - 1, 1, 'Actual unmount invalidation exists once');
        source = source.replace(unmountAnchor, 'useEffect(() => () => {}, []);');
      }
      assert.notEqual(source, before, 'Control changes the actual hook copy');
      const copy = path.join(folder, `${hook}.ts`);
      await writeFile(copy, source);
      owned.push(copy);
      swaps[`@/hooks/${hook}`] = copy;
    }
    env.NO_DOUBLE_SWAP = JSON.stringify(swaps);
  }
  const reportFile = path.join(folder, 'report.json');
  owned.push(reportFile);
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/chainRequestOwnership.test.tsx', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner faults do not count as product evidence');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 50, 'Every focused case runs');
  if (control) {
    const titles = [
      ...['unverified', 'transport error'].map(outcome => `ignores stale ${outcome} after unmount without a toast or completion`),
    ];
    if (control === 'unowned') {
      for (const exit of ['give up', 'new run']) for (const outcome of ['accepted', 'rejected', 'unverified', 'transport error']) titles.push(`ignores stale ${outcome} after ${exit}`);
      for (const outcome of ['unverified', 'transport error']) titles.push(`ignores stale ${outcome} after reset`);
      for (const outcome of ['accepted', 'rejected']) titles.push(`ignores stale ${outcome} after directly starting another mode`);
      for (const outcome of ['accepted', 'transport error']) titles.push(`stale ${outcome} cannot settle or unlock the next run current request`);
    }
    const intended = new Set(['Tennis', 'NASCAR'].flatMap(game => titles.map(title => `${game} chain request ownership ${title}`)));
    assert.equal(run.status, 1);
    assert.equal(report.numFailedTests, intended.size);
    assert.equal(report.numPassedTests, 50 - intended.size);
    assert.equal(rows.filter(row => intended.has(row.fullName)).length, intended.size, 'Every named control target exists');
    for (const row of rows) {
      assert.equal(row.status, intended.has(row.fullName) ? 'failed' : 'passed', row.fullName);
      if (intended.has(row.fullName)) assert.match(row.failureMessages.join('\n'), /AssertionError/);
    }
    console.log(`simChainRequestOwnership ${control}: real guards changed in two copied hooks, using the actual normalizer on full CRLF input.`);
    console.log(`simChainRequestOwnership ${control}: exactly ${intended.size} intended ownership assertions fail, ${50 - intended.size} independent cases pass.`);
    console.log(`simChainRequestOwnership ${control}: actual acceptance, rejection, bonuses, retries, duplicate rejection and single pending submission stay green.`);
    console.log(`simChainRequestOwnership ${control}: all 50 cases ran, with zero pending cases or unhandled errors.`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0);
    assert.equal(report.numPassedTests, 50);
    assert.equal(report.numFailedTests, 0);
    console.log('simChainRequestOwnership: 50 real-hook outcomes pass across Tennis and NASCAR, with zero pending cases or unhandled errors.');
    console.log('simChainRequestOwnership: delayed acceptance, rejection, unverified replies and transport errors cannot change an exited or replaced run.');
    console.log('simChainRequestOwnership: unmounted replies stay quiet and an old finally cannot unlock the current run request.');
    console.log('simChainRequestOwnership: original scoring, bonuses, retry behavior, duplicate rejection and actual completion booking remain intact.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [hook, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, `src/hooks/${hook}.ts`));
    assert.deepEqual(currentBytes, bytes, 'Original production hook bytes held');
  }
}
console.log('simChainRequestOwnership: original raw source bytes held, owned copies cleaned, no browser or backend requests.');
