/* Remote CRLF evidence for the Shot Lab harness. Product bytes are restored in finally. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'shot-lab-windows-artifacts');
const harness = 'scripts/simBuzzerShotLab.mjs';
const scanner = 'scripts/simHarnessAnchors.mjs';
const originalBlob = '876a5680ff05c6903e773586ee519104275e6f4a';
const inputs = [
  'src/components/buzzer-beater/BuzzerBeaterBoard.tsx',
  'src/components/buzzer-beater/ShotLabComparison.tsx',
  'src/lib/buzzerBeater.ts', 'src/lib/arcade.ts', 'src/lib/arcadeRecord.ts',
  'src/hooks/useArcadeFlight.ts', 'src/hooks/useGameCompletion.ts', 'src/test/buzzerShotLab.test.tsx',
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(out, { recursive: true });
const originals = new Map(await Promise.all([...inputs, harness, scanner].map(async file => [file, await readFile(path.join(root, file))])));
const report = { originalBlob, inputs: [], checks: [], restored: false };
const problems = [];
const env = { ...process.env, FORCE_COLOR: '0' };
delete env.ANCHOR_CONTROL; delete env.BUZZER_SHOT_LAB_CONTROL; delete env.NO_DOUBLE_SWAP;
const run = async (name, script, extra = {}, timeout = 180000) => {
  const result = spawnSync(process.execPath, [script], { cwd: root, env: { ...env, ...extra }, encoding: 'utf8', timeout, maxBuffer: 48 * 1024 * 1024 });
  const output = (result.stdout || '') + '\n' + (result.stderr || '');
  await writeFile(path.join(out, `${name}.log`), output);
  assert.ok(!result.error && !result.signal, `${name}: subprocess completed normally`);
  return { status: result.status, output };
};
const check = async (name, work) => {
  try { await work(); report.checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, passed: false, error: String(error.stack || error) }); problems.push(name); console.error(`FAIL ${name}: ${error}`); }
};
const scannerFailure = result => {
  assert.equal(result.status, 1);
  const failures = result.output.split(/\r?\n/).filter(line => /^\s+FAIL /.test(line));
  assert.equal(failures.length, 1, 'Only the intended Shot Lab source read fails');
  assert.match(failures[0], /simBuzzerShotLab\.mjs reads src\/components\/buzzer-beater\/BuzzerBeaterBoard\.tsx raw at line \d+ and searches it with a multi line anchor/);
  assert.match(result.output, /simHarnessAnchors: 1 failure\(s\)/);
  return failures[0];
};
try {
  for (const file of inputs) {
    const source = originals.get(file).toString('utf8');
    const bytes = Buffer.from(source.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'));
    assert(bytes.includes(Buffer.from('\r\n')), `${file}: explicit CRLF fixture`);
    assert.doesNotMatch(bytes.toString('utf8'), /(?<!\r)\n/, `${file}: no bare LF remains`);
    assert.equal(bytes.toString('utf8').replace(/\r\n/g, '\n'), source.replace(/\r\n/g, '\n'), `${file}: only line endings changed`);
    await writeFile(path.join(root, file), bytes);
    report.inputs.push({ file, original: hash(originals.get(file)), crlf: hash(bytes) });
  }
  const crlfBytes = new Map(await Promise.all(inputs.map(async file => [file, await readFile(path.join(root, file))])));
  await check('physical original scanner rejection', async () => {
    const original = spawnSync('git', ['show', originalBlob], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
    assert.equal(original.status, 0, 'Pinned original harness blob is available');
    assert.ok(!original.error && !original.signal);
    assert.notDeepEqual(original.stdout, originals.get(harness), 'The verifier representation changed');
    await writeFile(path.join(out, 'original-simBuzzerShotLab.mjs.txt'), original.stdout);
    try {
      await writeFile(path.join(root, harness), original.stdout);
      const failure = scannerFailure(await run('original-scanner', scanner));
      assert.match(failure, /\(2 raw reads in all\)/, 'Reproduce both original Buffer-read findings');
    } finally { await writeFile(path.join(root, harness), originals.get(harness)); }
  });
  await check('fixed scanner acceptance', async () => {
    const result = await run('fixed-scanner', scanner);
    assert.equal(result.status, 0);
    assert.match(result.output, /simHarnessAnchors: green\. Every harness parses and none carries an unmatchable anchor\./);
    assert.doesNotMatch(result.output, /^\s+FAIL /m);
  });
  await check('removed normalizer scanner rejection', async () => {
    const source = originals.get(harness).toString('utf8');
    const anchor = "(await readFile(path.join(root, spec.file), 'utf8')).replace(/\\r\\n/g, '\\n')";
    assert.equal(source.split(anchor).length - 1, 1, 'Normalizer control binds exactly once');
    const changed = source.replace(anchor, "(await readFile(path.join(root, spec.file), 'utf8'))");
    assert.notEqual(changed, source);
    await writeFile(path.join(out, 'unnormalized-simBuzzerShotLab.mjs.txt'), changed);
    try {
      await writeFile(path.join(root, harness), changed);
      scannerFailure(await run('unnormalized-scanner', scanner));
    } finally { await writeFile(path.join(root, harness), originals.get(harness)); }
  });
  await check('CRLF outcomes and all effective controls', async () => {
    const result = await run('crlf-outcomes', harness, { BUZZER_SHOT_LAB_CONTROL: 'all', BUZZER_SHOT_LAB_ARTIFACTS: path.join(out, 'mounted') }, 20 * 60 * 1000);
    assert.equal(result.status, 0);
    assert.match(result.output, /15 real Board cases and 16 effective controls passed serially/);
    const summary = JSON.parse(await readFile(path.join(out, 'mounted/summary.json'), 'utf8'));
    assert.equal(summary.length, 17); assert(summary.every(item => item.passed && item.exit === 0 && item.error === ''));
  });
  await check('all CRLF input bytes and scanner held', async () => {
    for (const [file, bytes] of crlfBytes) assert.deepEqual(await readFile(path.join(root, file)), bytes, `${file}: raw CRLF bytes held`);
    assert.deepEqual(await readFile(path.join(root, scanner)), originals.get(scanner), 'Scanner itself never changed');
    assert.deepEqual(await readFile(path.join(root, harness)), originals.get(harness), 'Fixed harness restored after each scanner control');
  });
} finally {
  for (const [file, bytes] of originals) await writeFile(path.join(root, file), bytes);
  for (const [file, bytes] of originals) assert.deepEqual(await readFile(path.join(root, file)), bytes, `${file}: original checkout bytes restored`);
  report.restored = true;
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
}
assert.deepEqual(problems, [], 'Every original, fixed, control and CRLF outcome proof must pass');
console.log('Shot Lab Windows guard: original scanner finding reproduced, fixed scanner green, normalizer removal rejected, 15 outcomes and 16 controls accepted with raw CRLF bytes held.');
