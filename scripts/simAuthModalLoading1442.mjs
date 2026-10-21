import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(fs.readFileSync('src/test/controls/authLoading1442/manifest.json', 'utf8'));
const out = path.resolve(process.env.LEGAL_PRIVACY_OUT || 'legal-privacy-artifacts', 'auth-loading-controls');
fs.mkdirSync(out, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const report = { cases: [], complete: false };
for (const row of manifest.files) {
  const original = fs.readFileSync(row.source, 'utf8'), copy = fs.readFileSync(row.copy, 'utf8');
  assert.equal(hash(original), row.sourceSha256, row.name + ' actual source hash');
  assert.equal(hash(copy), row.copySha256, row.name + ' copied source hash');
  assert.equal(original.split(row.old).length - 1, 1, row.name + ' exact unique fault target');
  assert.equal(original.replace(row.old, row.new), copy, row.name + ' complete copied change');
  assert.notEqual(original, copy);
  for (const control of [false, true]) {
    const name = row.name + (control ? '-fault' : '-actual');
    const jsonFile = path.join(out, name + '.json');
    const env = { ...process.env };
    delete env.NO_DOUBLE_SWAP;
    if (control) env.NO_DOUBLE_SWAP = JSON.stringify({ [row.alias]: path.resolve(row.copy) });
    const args = ['node_modules/vitest/vitest.mjs', 'run', row.test, '-t', row.testName, '--maxWorkers=1', '--minWorkers=1', '--reporter=json', '--outputFile=' + jsonFile];
    const child = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 150000, maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(path.join(out, name + '.stdout.log'), child.stdout || '');
    fs.writeFileSync(path.join(out, name + '.stderr.log'), child.stderr || '');
    assert(!child.error && !child.signal, name + ' completes normally');
    const result = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const selected = result.testResults.flatMap(suite => suite.assertionResults).filter(test => test.title === row.testName);
    assert.equal(selected.length, 1, name + ' selects exactly the intended case');
    assert.equal(child.status, control ? 1 : 0);
    assert.equal(selected[0].status, control ? 'failed' : 'passed');
    assert.equal(result.numFailedTests, control ? 1 : 0);
    if (control) assert(selected[0].failureMessages.some(message => /AssertionError|expected|^Error: expect\(element\)\.not\.toBeChecked\(\)/i.test(message.replace(/\u001b\[[0-9;]*m/g, ''))), name + ' fails on the actual expectation');
    report.cases.push({ name, controlledFault: control, exit: child.status, selectedStatus: selected[0].status });
    console.log(`Auth modal loading: ${name}, expected ${selected[0].status}.`);
  }
  assert.equal(hash(fs.readFileSync(row.source)), row.sourceSha256, 'Actual source stays unchanged');
}
report.complete = true;
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Auth modal loading: PASS, ${manifest.files.length} actual outcomes and ${manifest.files.length} effective copied faults.`);
