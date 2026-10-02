import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const readSource = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const hash = value => createHash('sha256').update(value).digest('hex');
const generator = path.join(root, 'scripts/genNbaOpeningRatings.mjs');
const model = path.join(root, 'scripts/lib/nbaFoRatingModel.mjs');
const input = path.join(root, 'scripts/data/nbaFoRatingInputs2026.json');
const seed = path.join(root, 'src/data/conquestDataNba.ts');
const browser = path.join(root, 'src/data/nbaOpeningRatings.ts');
const preserve = files => {
  const originals = files.map(file => ({ file, bytes: fs.readFileSync(file) }));
  return () => { for (const { file, bytes } of originals) {
    const currentBytes = fs.readFileSync(file);
    assert.deepEqual(currentBytes, bytes, 'original source/payload bytes held');
  } };
};
const assertOriginals = preserve([generator, model, input, seed, browser]);
const snapshot = JSON.parse(readSource(input));
const generatorSource = readSource(generator);
const modelSource = readSource(model);
const seedSource = readSource(seed);
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nba-opening895-'));
const owned = [];
const manifest = [];
let invocation = 0;
const sentinel = 'Existing output must remain byte-identical on refusal.\n';
const once = (text, old, next) => {
  assert.equal(text.split(old).length - 1, 1, 'unique actual executable control binding');
  return text.replace(old, next);
};
const copy = (name, source) => {
  const file = path.join(folder, name);
  fs.writeFileSync(file, source); owned.push(file); return file;
};
const absoluteGenerator = text => once(text,
  "const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');",
  `const root = ${JSON.stringify(root)};`);
function generate(gen, options = {}) {
  const run = invocation++;
  const output = path.join(folder, `output-${run}.ts`);
  owned.push(output);
  if (!options.absent) fs.writeFileSync(output, sentinel);
  const args = [gen, '--inputs', options.inputs ?? input, '--seed', options.seed ?? seed,
    '--model', options.model ?? model, '--output', output];
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 20000, env: process.env });
  assert.ok(!result.error && result.signal == null, 'generator actually ran without timeout or launch fault');
  assert.ok(!/OFFLINE_TRANSPORT_BLOCK|UnhandledPromiseRejection|Cannot find module|SyntaxError/.test(result.stderr), 'no unrelated transport/loader/runtime fault');
  fs.writeFileSync(path.join(folder, `run-${run}.log`), result.stdout + result.stderr);
  return { ...result, output };
}
async function readBrowser(output) {
  const transformed = await require('esbuild').transform(readSource(output), { loader: 'ts', format: 'esm' });
  return import('data:text/javascript;base64,' + Buffer.from(transformed.code).toString('base64'));
}
const cases = [
  ['all300 exact reviewed grade and salary tuples', async gen => {
    const r = generate(gen); assert.equal(r.status, 0); const exports = await readBrowser(r.output);
    const groups = exports.NBA_OPENING_RATINGS; assert.equal(Object.keys(groups).length, 30);
    assert.equal(Object.values(groups).reduce((n, g) => n + Object.keys(g).length, 0), 300);
    for (const [team, name, pos, ovr, salary] of snapshot.checkpoint.tuples) {
      const row = groups[team][`${name}|${pos}`]; assert.equal(row.ovr, ovr); assert.equal(row.salary, salary);
    }
    for (const group of Object.values(groups)) assert.ok(Object.values(group).every(row => row.salary >= 2));
  }],
  ['distinct partial provenance and no browser raw observations', async gen => {
    const r = generate(gen); assert.equal(r.status, 0); const exports = await readBrowser(r.output);
    assert.equal(exports.NBA_OPENING_RATING_VERSION, snapshot.version); assert.equal(exports.NBA_OPENING_RATING_WINDOW, snapshot.window);
    const totals = { 'box-score-proxy': 0, 'prior-only': 0, 'unmeasured-prior': 0 };
    for (const [team, name, pos, ovr, salary, offense, defense, role, basis] of snapshot.checkpoint.tuples) {
      const row = exports.NBA_OPENING_RATINGS[team][`${name}|${pos}`];
      assert.deepEqual(Object.keys(row), ['ovr', 'salary', 'evidence']);
      assert.deepEqual(row.evidence, { modelVersion: snapshot.version, originKey: `${team}|${name}|${pos}`, openingOvr: ovr, basis, partial: true });
      totals[row.evidence.basis]++;
    }
    assert.deepEqual(totals, { 'box-score-proxy': 291, 'prior-only': 5, 'unmeasured-prior': 4 });
    assert.ok(!/PLAYER_ID|AST_PCT|DEF_RATING|observations|limitedDefense|offense|ageInSeason/.test(readSource(r.output)));
  }],
  ['repeat generation deterministic and budget identity', async gen => {
    const a = generate(gen), b = generate(gen); assert.equal(a.status, 0); assert.equal(b.status, 0);
    assert.deepEqual(fs.readFileSync(a.output), fs.readFileSync(b.output));
    const crlf = copy('seed-crlf.ts', seedSource.replace(/\n/g, '\r\n'));
    const c = generate(gen, { seed: crlf }); assert.equal(c.status, 0);
    assert.deepEqual(fs.readFileSync(c.output), fs.readFileSync(a.output), 'CRLF seed has the same exact reviewed values');
    const exports = await readBrowser(a.output);
    for (const team of Object.keys(exports.NBA_OPENING_RATINGS)) {
      const original = snapshot.checkpoint.tuples.filter(t => t[0] === team).reduce((s, t) => s + t[4], 0);
      const generated = Object.values(exports.NBA_OPENING_RATINGS[team]).reduce((s, t) => s + t.salary, 0);
      assert.equal(Math.round(generated * 10), Math.round(original * 10));
    }
  }],
  ['source drift refusal holds existing bytes', async gen => {
    const altered = copy('seed-comment.ts', seedSource + '\n// Private source-drift fixture.\n');
    const r = generate(gen, { seed: altered }); assert.notEqual(r.status, 0);
    assert.match(r.stderr, /NBA opening seed source hash drift/); assert.equal(readSource(r.output), sentinel);
  }],
  ['source drift refusal creates no absent output', async gen => {
    const altered = copy('seed-absent.ts', seedSource + '\n// Private absent-output fixture.\n');
    const r = generate(gen, { seed: altered, absent: true }); assert.notEqual(r.status, 0);
    assert.match(r.stderr, /NBA opening seed source hash drift/); assert.equal(fs.existsSync(r.output), false);
  }],
  ['canonical drift refuses despite matching source receipt', async gen => {
    const alteredText = once(seedSource, "name: 'Nikola Jokic', position: 'C', overall: 99", "name: 'Nikola Jokic', position: 'C', overall: 98");
    const altered = copy('seed-canonical.ts', alteredText);
    const inputs = structuredClone(snapshot); inputs.seed.sourceSha256 = hash(alteredText);
    const r = generate(gen, { seed: altered, inputs: copy('input-canonical.json', JSON.stringify(inputs)) });
    assert.notEqual(r.status, 0); assert.match(r.stderr, /NBA canonical seed hash drift/); assert.equal(readSource(r.output), sentinel);
  }],
  ['invalid measured percentage refuses before write', async gen => {
    const inputs = structuredClone(snapshot), set = inputs.observations.currentAdvanced;
    const id = set.headers.indexOf('PLAYER_ID'), ast = set.headers.indexOf('AST_PCT');
    set.rows.find(r => r[id] === 203999)[ast] = '0.5';
    const r = generate(gen, { inputs: copy('input-invalid.json', JSON.stringify(inputs)) });
    assert.notEqual(r.status, 0); assert.match(r.stderr, /valid optional measured percentage AST_PCT/); assert.equal(readSource(r.output), sentinel);
  }],
  ['fitted calibration drift refuses before write', async gen => {
    const inputs = structuredClone(snapshot); inputs.checkpoint.calibration.current.offense.center += 0.01;
    const r = generate(gen, { inputs: copy('input-fit.json', JSON.stringify(inputs)) });
    assert.notEqual(r.status, 0); assert.match(r.stderr, /reviewed fitted calibration held/); assert.equal(readSource(r.output), sentinel);
  }],
  ['checkpoint corruption refuses before write', async gen => {
    const inputs = structuredClone(snapshot); inputs.checkpoint.tuples[0][3] -= 1;
    const r = generate(gen, { inputs: copy('input-checkpoint.json', JSON.stringify(inputs)) });
    assert.notEqual(r.status, 0); assert.match(r.stderr, /reviewed tuple checkpoint integrity/); assert.equal(readSource(r.output), sentinel);
  }],
  ['cheap old price model refuses before write', async gen => {
    const altered = copy('model-cheap.mjs', once(modelSource, 'salary:tenths[i]/10', 'salary:salaryFor(p.originalOverall)'));
    const r = generate(gen, { model: altered }); assert.notEqual(r.status, 0);
    assert.match(r.stderr, /all reviewed grades\/prices\/basis held/); assert.equal(readSource(r.output), sentinel);
  }],
];
const mode = process.env.NBA_OPENING_INPUT_CONTROL ?? 'normal';
const controls = {
  hash: { old: "  assert.equal(hash(source), snapshot.seed.sourceSha256, 'NBA opening seed source hash drift, refuse before writing');", next: '  // Copied control removes source receipt refusal.', failures: [cases[3][0], cases[4][0]] },
  earlyWrite: { old: '  const snapshot = JSON.parse(fs.readFileSync(inputFile, \'utf8\'));', next: '  fs.writeFileSync(outputFile, \'Incorrect pre-validation write.\\n\');\n  const snapshot = JSON.parse(fs.readFileSync(inputFile, \'utf8\'));', failures: cases.slice(3).map(c => c[0]) },
  basis: { old: 'openingOvr: ovr, basis, partial: true', next: "openingOvr: ovr, basis: 'box-score-proxy', partial: true", failures: [cases[1][0]] },
};
try {
  assert.ok(mode === 'normal' || Object.hasOwn(controls, mode), 'known exact control');
  let target = generator;
  if (mode !== 'normal') {
    const control = controls[mode];
    target = copy(`generator-${mode}.mjs`, absoluteGenerator(once(generatorSource, control.old, control.next)));
  }
  for (const [name, run] of cases) {
    try { await run(target); manifest.push({ name, status: 'passed' }); }
    catch (error) { if (error?.code !== 'ERR_ASSERTION') throw error; manifest.push({ name, status: 'failed', error: error.message }); }
    assertOriginals();
  }
  const failed = manifest.filter(row => row.status === 'failed').map(row => row.name);
  assert.deepEqual(failed, mode === 'normal' ? [] : controls[mode].failures, 'exact intended failures, all independent outcomes held');
  assert.equal(manifest.length, 10, 'full outcome count, no skipped cases');
  const report = { accepted: true, mode, outcomes: manifest, failed: failed.length, held: manifest.length - failed.length,
    tupleSha256: snapshot.checkpoint.tupleSha256, modelSha256: hash(modelSource), seedSha256: hash(seedSource), inputSha256: hash(readSource(input)) };
  fs.writeFileSync(path.join(folder, 'verified-summary.json'), JSON.stringify(report, null, 2));
  console.log(`NBA opening inputs ${mode}: ${failed.length} intended failed / ${manifest.length - failed.length} held, full10. Receipt ${folder}`);
} finally {
  for (const file of new Set(owned)) {
    assert.equal(path.dirname(path.resolve(file)), path.resolve(folder), 'cleanup only own direct temporary files');
    if (/generator-.*\.mjs$|model-cheap\.mjs$/.test(file)) fs.rmSync(file, { force: true });
  }
  assertOriginals();
}
