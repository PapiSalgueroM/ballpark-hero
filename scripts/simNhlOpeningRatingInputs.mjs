/* Round896: frozen NHL generation and physical refusal before output writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const files = ['scripts/genNhlOpeningRatings.mjs', 'scripts/lib/nhlFoRatingModel.mjs', 'scripts/data/nhlFoRatingInputs2026.json', 'src/data/nhlOpeningRatings.ts', 'src/data/nhlFoPlayers.ts', 'src/lib/gauntletDraftNhl.ts'];
const held = files.map(file => [file, fs.readFileSync(path.join(root, file))]);
const normalized = bytes => bytes.toString('utf8').replaceAll('\r\n', '\n');
const hash = value => createHash('sha256').update(value).digest('hex');
const source = normalized(held[0][1]), snapshot = JSON.parse(held[2][1]);
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nhl896-inputs-'));
const owned = [], results = [];
const sentinel = 'Existing output must survive a refused generation.\n';
const once = (text, old, next) => { assert.equal(text.split(old).length, 2, 'Unique executable control'); const changed = text.replace(old, next); assert.notEqual(changed, text); return changed; };
const write = (name, value) => { const file = path.join(folder, name); fs.writeFileSync(file, value); owned.push(file); return file; };
const controls = {
  hash: ["assert.equal(hash(source), snapshot.seed.sourceSha256, 'NHL seed source drift, refuse before writing');", '', [3, 8]],
  earlyWrite: ['  const snapshot = JSON.parse(fs.readFileSync(inputFile, \'utf8\'));', "  fs.writeFileSync(outputFile, 'premature write');\n  const snapshot = JSON.parse(fs.readFileSync(inputFile, 'utf8'));", [3, 4, 5, 6, 7, 8]],
  partial: ['openingOvr: ovr, basis, partial }', 'openingOvr: ovr, basis, partial: false }', [0, 1, 2]],
};
const control = process.env.NHL_INPUT_CONTROL || '';
assert.ok(!control || Object.hasOwn(controls, control), 'Known input control');
for (const [anchor] of Object.values(controls)) assert.equal(source.split(anchor).length, 2, 'Executable binding exists exactly once');
let generator = once(source, "const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');", 'const root = ' + JSON.stringify(root) + ';');
if (control) generator = once(generator, controls[control][0], controls[control][1]);
const gen = write('generator.mjs', generator);
let invocation = 0;
function run(options = {}) {
  const out = path.join(folder, 'output-' + invocation++ + '.ts'); owned.push(out);
  if (!options.absent) fs.writeFileSync(out, sentinel);
  const args = [gen, '--inputs', options.inputs ?? path.join(root, files[2]), '--seed', options.seed ?? path.join(root, files[4]), '--model', options.model ?? path.join(root, files[1]), '--output', out];
  const r = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), ...args], { cwd: root, encoding: 'utf8', timeout: 20000, maxBuffer: 2 * 1024 * 1024 });
  assert.ok(!r.error && !r.signal, 'Generator ran without launch fault');
  assert.doesNotMatch(r.stderr, /SIM_OFFLINE_BLOCK|Cannot find module|SyntaxError|Transform failed/);
  return { ...r, out };
}
function refusal(options, message) {
  const r = run(options); assert.equal(r.status, 1, 'Refusal actually failed'); assert.match(r.stderr, message, 'Exact intended refusal');
  if (options.absent) assert.ok(!fs.existsSync(r.out), 'Refusal creates no output');
  else assert.equal(fs.readFileSync(r.out, 'utf8'), sentinel, 'Refusal preserves existing output');
}
const test = (title, fn) => { try { fn(); results.push({ title, status: 'passed' }); } catch (e) { results.push({ title, status: 'failed', message: String(e) }); } };
try {
  test('reproduces exact416 tuples and compact browser evidence', () => {
    const r = run(); assert.equal(r.status, 0, r.stderr);
    assert.equal(normalized(fs.readFileSync(r.out)), normalized(held[3][1]));
    const transformed = require('esbuild').transformSync(fs.readFileSync(r.out, 'utf8'), { loader: 'ts', format: 'cjs' });
    const compiled = write('payload.cjs', transformed.code), runtime = require(compiled);
    for (const [team, name, position, ovr, salary, basis, partial] of snapshot.checkpoint.tuples) {
      const row = runtime.NHL_OPENING_RATINGS[team][`${name}|${position}`];
      assert.deepEqual(row, { ovr, salary, evidence: { modelVersion: snapshot.runtimeVersion, originKey: `${team}|${name}|${position}`, openingOvr: ovr, basis, partial } });
      assert.deepEqual(Object.keys(row.evidence).sort(), ['modelVersion', 'originKey', 'openingOvr', 'basis', 'partial'].sort());
    }
    assert.equal(runtime.NHL_OPENING_QUOTE_FACTOR, snapshot.checkpoint.quoteFactor);
    assert.ok(!/playerId|summaries|observations|birthDate/.test(fs.readFileSync(r.out, 'utf8')), 'Raw observations excluded from browser');
  });
  test('LF seed produces exact runtime payload', () => { const seed = write('seed-lf.ts', normalized(held[4][1])); const r = run({ seed }); assert.equal(r.status, 0, r.stderr); assert.equal(normalized(fs.readFileSync(r.out)), normalized(held[3][1])); });
  test('CRLF seed produces exact runtime payload', () => { const seed = write('seed-crlf.ts', normalized(held[4][1]).replaceAll('\n', '\r\n')); const r = run({ seed }); assert.equal(r.status, 0, r.stderr); assert.equal(normalized(fs.readFileSync(r.out)), normalized(held[3][1])); });
  test('seed drift refuses without overwriting', () => { const seed = write('seed-drift.ts', normalized(held[4][1]) + '\n// drift\n'); refusal({ seed }, /NHL seed source drift/); });
  test('dated observation drift refuses without overwriting', () => { const x = structuredClone(snapshot); x.observations.summaries.rows[0][0] = 'changed'; const inputs = write('observation.json', JSON.stringify(x)); refusal({ inputs }, /NHL dated input drift/); });
  test('tuple corruption refuses without overwriting', () => { const x = structuredClone(snapshot); x.checkpoint.tuples[0][3]++; const inputs = write('tuple.json', JSON.stringify(x)); refusal({ inputs }, /Reviewed tuple integrity/); });
  test('model drift refuses without overwriting', () => { const model = write('model.mjs', normalized(held[1][1]) + '\n// drift\n'); refusal({ model }, /NHL reviewed model source drift/); });
  test('window drift refuses without overwriting', () => { const x = structuredClone(snapshot); x.window = '2030-31'; const inputs = write('window.json', JSON.stringify(x)); refusal({ inputs }, /Retained regular-season window/); });
  test('refusal creates no output when no prior artifact exists', () => { const seed = write('missing-output-seed.ts', normalized(held[4][1]) + '\n// drift\n'); refusal({ seed, absent: true }, /NHL seed source drift/); });
  test('frozen provenance and full source lineage stay explicit', () => {
    assert.equal(snapshot.provenance.length, 8); assert.ok(snapshot.provenance.every(p => /^https:\/\/api\.nhle\.com\//.test(p.url) && /^[0-9a-f]{64}$/.test(p.rawSha256) && p.retrievedAt.startsWith('2026-10-02T')));
    assert.equal(hash(JSON.stringify(snapshot.checkpoint.tuples)), snapshot.checkpoint.tupleSha256);
    assert.equal(snapshot.checkpoint.tuples.filter(t => t[6]).length, 196);
    assert.equal(snapshot.seed.rows.length, 416); assert.equal(Object.keys(snapshot.checkpoint.clubs).length, 32);
    assert.ok(snapshot.validation.limitations.includes('one official publisher lineage'));
  });
  const failed = results.flatMap((r, i) => r.status === 'failed' ? [i] : []);
  console.log(JSON.stringify({ control, results }, null, 2));
  assert.equal(results.length, 10); assert.deepEqual(failed, control ? controls[control][2] : [], 'Exact intended failed outcomes with baselines held');
} finally {
  for (const file of owned) fs.rmSync(file, { force: true });
  assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(folder).startsWith('dukb-nhl896-inputs-')); fs.rmdirSync(folder);
  for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, 'Source/Gauntlet raw bytes held');
}
console.log('NHL896 generation: all10 outcomes ran, raw source/Gauntlet held and owned copies removed. No engine/native/publish acceptance.');
