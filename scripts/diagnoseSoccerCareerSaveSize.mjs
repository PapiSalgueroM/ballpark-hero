import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';

assert.equal(process.env.CI, '1', 'This diagnostic runs on the remote CI runner only.');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport must be active.');
const ROOT = process.cwd();
const OUT = path.resolve(process.env.CREATION_SIZE_OUT || 'creation-size-artifacts');
const CLOCK = '2026-10-13T03:22:39.150Z'; // Observed start of the retained 7dec related-harness step.
const REFS = { baseline: '48cb9d4bbe8d8f4922113326d9db5d120dcb0b09', candidate: '7dec25c5f7037bbc201de95001d86ff185043de4' };
const HASH = text => createHash('sha256').update(text).digest('hex');
const sha = file => HASH(fs.readFileSync(file));
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
const report = { status: 'running', refs: REFS, clock: CLOCK, limits: ['Copied observer diagnostics only; no ordinary-clock or gate-waiver credit.', 'The full original harness, filename seed, 60000 total and 900 added-field guards remain held.'], runs: [] };
fs.mkdirSync(OUT, { recursive: true });
assert.equal(process.env.SIM_SEED, undefined, 'Require the unchanged default filename seed.');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'career-save-size-'));
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isSymbolicLink() ? [] : entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
function sources(dir) {
  return [...files(path.join(dir, 'src')), ...files(path.join(dir, 'scripts')), ...['package.json', 'package-lock.json', 'bun.lock'].map(file => path.join(dir, file))]
    .sort().map(file => ({ file: path.relative(dir, file), sha256: sha(file) }));
}
const installed = Object.entries(JSON.parse(fs.readFileSync('package-lock.json')).packages)
  .filter(([file]) => file.startsWith('node_modules/') && fs.existsSync(path.join(file, 'package.json')))
  .map(([file, locked]) => {
    const manifest = path.join(ROOT, file, 'package.json'), version = JSON.parse(fs.readFileSync(manifest)).version;
    assert.equal(version, locked.version, file);
    return { file: path.relative(ROOT, manifest), version, sha256: sha(manifest) };
  });
assert.equal(installed.length, 521); write('installed.json', installed);
report.tools = { node: process.version, v8: process.versions.v8, esbuild: sha(path.join(ROOT, 'node_modules/esbuild/package.json')) };
function child(dir, observer, prefix) {
  return new Promise((resolve, reject) => {
    const stdout = fs.createWriteStream(path.join(OUT, `${prefix}.stdout.log`));
    const stderr = fs.createWriteStream(path.join(OUT, `${prefix}.stderr.log`));
    const combined = fs.createWriteStream(path.join(OUT, `${prefix}.log`));
    let log = '';
    const processChild = spawn(process.execPath, ['scripts/simCreation.mjs'], { cwd: dir, env: { ...process.env,
      NODE_OPTIONS: `--require=${observer} --require=${path.join(dir, 'scripts/lib/offlineTransport.cjs')}` }, timeout: 900000 });
    processChild.stdout.on('data', chunk => { stdout.write(chunk); combined.write(chunk); log += chunk; });
    processChild.stderr.on('data', chunk => { stderr.write(chunk); combined.write(chunk); log += chunk; });
    processChild.on('error', reject);
    processChild.on('close', (code, signal) => {
      Promise.all([stdout, stderr, combined].map(stream => new Promise(done => stream.end(done)))).then(() => resolve({ code, signal, log }));
    });
  });
}
try {
  report.sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const rootBefore = sources(ROOT); write('root-source-before.json', rootBefore);
  for (const [name, ref] of Object.entries(REFS)) {
    const dir = path.join(scratch, name), archive = path.join(scratch, `${name}.tar`);
    fs.mkdirSync(dir); execFileSync('git', ['archive', '--format=tar', `--output=${archive}`, ref], { cwd: ROOT });
    execFileSync('tar', ['-xf', archive, '-C', dir]);
    for (const file of ['package.json', 'package-lock.json', 'bun.lock']) assert.equal(sha(path.join(dir, file)), sha(path.join(ROOT, file)), file);
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
    const input = sources(dir), file = path.join(dir, 'scripts/simCreation.mjs');
    const original = fs.readFileSync(file, 'utf8'), anchor = '  const bytes = JSON.stringify(full).length;';
    assert.equal(original.split(/\r?\n/).filter(line => line === anchor).length, 1);
    assert(original.includes('if (bytes > 60000)') && original.includes('if (bytes - bare > 900)'));
    const insertion = '\n  globalThis.__CREATION_SIZE_OBSERVER__(full);';
    assert(!original.includes('__CREATION_SIZE_OBSERVER__'));
    const observed = original.replace(anchor, anchor + insertion);
    assert.notEqual(HASH(observed), HASH(original)); assert.equal(observed.replace(insertion, ''), original);
    fs.writeFileSync(path.join(OUT, `${name}.simCreation.before.mjs`), original);
    fs.writeFileSync(path.join(OUT, `${name}.simCreation.observed.mjs`), observed);
    fs.writeFileSync(file, observed); write(`${name}.source-before.json`, input);
    const observer = path.join(scratch, `${name}.observer.cjs`);
    fs.writeFileSync(observer, `const fs = require('node:fs'), crypto = require('node:crypto');
const OriginalDate = Date, now = OriginalDate.parse(${JSON.stringify(CLOCK)});
globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
let calls = 0;
globalThis.__CREATION_SIZE_OBSERVER__ = state => {
  calls++;
  const text = JSON.stringify(state), fields = Object.fromEntries(Object.entries(state).map(([key, value]) => [key, JSON.stringify(value)?.length ?? 0]));
  const record = { calls, clock: ${JSON.stringify(CLOCK)}, codeUnits: text.length, utf8Bytes: Buffer.byteLength(text), sha256: crypto.createHash('sha256').update(text).digest('hex'), fields };
  fs.writeFileSync(${JSON.stringify(path.join(OUT, `${name}.terminal.json`))}, text);
  fs.writeFileSync(${JSON.stringify(path.join(OUT, `${name}.observer.json`))}, JSON.stringify(record, null, 2));
};
`);
    fs.copyFileSync(observer, path.join(OUT, `${name}.observer.cjs`));
    const outcome = await child(dir, observer, name);
    const after = sources(dir); write(`${name}.source-after.json`, after);
    const held = input.every(before => after.find(item => item.file === before.file)?.sha256 === (before.file === 'scripts/simCreation.mjs' ? HASH(observed) : before.sha256)) && input.length === after.length;
    const row = { name, ref, originalSha256: HASH(original), observedSha256: HASH(observed), observerSha256: sha(observer), uniqueInsertion: true, sourcesHeld: held, exit: outcome.code, signal: outcome.signal };
    report.runs.push(row); write('report.json', report);
    assert(held); assert.equal(outcome.code, 1); assert.equal(outcome.signal, null);
    assert(!/Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError|\[SIM_OFFLINE_BLOCK\]/i.test(outcome.log));
    const state = JSON.parse(fs.readFileSync(path.join(OUT, `${name}.terminal.json`)));
    const measured = JSON.parse(fs.readFileSync(path.join(OUT, `${name}.observer.json`)));
    assert.equal(measured.calls, 1); assert.equal(measured.clock, CLOCK); assert.equal(measured.sha256, sha(path.join(OUT, `${name}.terminal.json`)));
    assert.equal(measured.codeUnits, JSON.stringify(state).length); assert(measured.codeUnits > 60000);
    assert.deepEqual(outcome.log.split(/\r?\n/).filter(line => /^\s*FAIL:/.test(line)), [`  FAIL: a full career save is ${(measured.codeUnits / 1024).toFixed(1)} KB, over the budget`]);
    assert.deepEqual([...outcome.log.matchAll(/^(\d+)\) /gm)].map(match => Number(match[1])), Array.from({ length: 13 }, (_, index) => index + 1));
    assert.equal(outcome.log.trim().split(/\r?\n/).at(-1), '1 FAILURES');
    Object.assign(row, measured); write('report.json', report);
    console.log(`${name}: exact sole 60000-cap failure; ${measured.codeUnits} code units, ${measured.utf8Bytes} UTF-8 bytes; all 13 sections completed.`);
  }
  const [baseline, candidate] = report.runs;
  assert.equal(baseline.originalSha256, candidate.originalSha256, 'Original harness must be identical.');
  assert.equal(baseline.codeUnits, candidate.codeUnits); assert.deepEqual(baseline.fields, candidate.fields);
  assert.equal(baseline.sha256, candidate.sha256); assert.equal(fs.readFileSync(path.join(OUT, 'baseline.terminal.json'), 'utf8'), fs.readFileSync(path.join(OUT, 'candidate.terminal.json'), 'utf8'));
  assert.deepEqual(sources(ROOT), rootBefore); assert(installed.every(item => sha(path.join(ROOT, item.file)) === item.sha256));
  report.status = 'preexisting-cap-reproduced'; report.rootSourcesHeld = true; report.installedHeld = true; write('report.json', report);
  console.log('Paired observer diagnostic: terminal JSON and every field length are identical; original source and 521 dependencies held.');
} catch (error) {
  report.status = 'failed'; report.error = String(error?.stack ?? error); write('report.json', report); throw error;
}
