/* Default execution observes actual behavior and enforces parity. The explicit
   characterization mode is diagnostic, never a claim that game parity passes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { identityRelation, answerSummary, PARITY_ASSERTION, SAMPLES } from './qa/managerAppealIsolation1081.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.MANAGER_APPEAL_ISOLATION_ARTIFACTS || path.join(ROOT, 'manager-appeal-isolation-artifacts'));
const WORKER = path.join(ROOT, 'scripts/qa/managerAppealIsolation1081.mjs');
const mode = process.argv[2] || '--default';
assert(['--default', '--characterize', '--verify-parity'].includes(mode), 'Known appeal isolation mode');
assert(process.env.CI, 'Appeal isolation runs only in remote CI');
fs.mkdirSync(OUT, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
const json = file => JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8'));
function sources() {
  const files = [];
  const walk = rel => {
    for (const entry of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
      const next = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(next);
      else if (entry.isFile()) files.push(next);
    }
  };
  walk('src'); walk('scripts');
  for (const entry of fs.readdirSync(ROOT)) if (/^(?:package(?:-lock)?\.json|tsconfig.*\.json|vite\.config\..*|index\.html)$/.test(entry)) files.push(entry);
  return Object.fromEntries(files.sort().map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
}
const CONTROL = {
  mislink: { assertion: 'Actual appeal player link', from: '    playerId: p.id, playerName: p.name, ban, odds,',
    to: '    playerId: state.squad.find(other => other.id !== p.id)!.id, playerName: p.name, ban, odds,' },
  effect: { assertion: 'Actual appeal option effects', from: '    const next = won ? 0 : p.suspendedMatches + APPEAL_LOSS_EXTRA;',
    to: '    const next = (won ? 0 : p.suspendedMatches + APPEAL_LOSS_EXTRA) + 1;' },
  story: { assertion: 'Actual appeal story', from: 'The club secretary rates an appeal at', to: 'The club secretary incorrectly rates an appeal at' },
  verdict: { assertion: 'Actual historical appeal verdict', from: '${item.id}|${saveKey(state)}|verdict', to: '${item.id}|${saveKey(state)}|altered-verdict-input' },
};

function comparePairs(alone, interleaved) {
  assert.equal(alone.rows.length, SAMPLES); assert.equal(interleaved.rows.length, SAMPLES);
  const pairs = [], parityFailures = [];
  for (let i = 0; i < SAMPLES; i++) {
    const a = alone.rows[i], b = interleaved.rows[i];
    assert.equal(a.id, b.id, 'Paired row IDs');
    const generated = identityRelation(a.generated, b.generated);
    const correspondence = identityRelation(a.source, b.source);
    assert.deepEqual(a.generationBefore, b.generationBefore, 'Equivalent generation begins at the same RNG state');
    assert.deepEqual(a.generationAfter, b.generationAfter, 'Generation draws and continuation agree');
    assert.deepEqual(a.preparationAfter, b.preparationAfter, 'Save/load preparation draws and continuation agree');
    const target = correspondence.find(pair => pair.alone === a.playerId);
    assert(target && target.interleaved === b.playerId, 'Explicit selected player correspondence');
    assert.equal(a.open.decisions.length, b.open.decisions.length, 'Complete desk count');
    for (let cardIndex = 0; cardIndex < a.open.decisions.length; cardIndex++) {
      const left = a.open.decisions[cardIndex], right = b.open.decisions[cardIndex];
      assert.deepEqual(Object.keys(left), Object.keys(right), 'Every actual desk field retained');
      for (const field of Object.keys(left)) {
        if (field === 'id' && left.kind === 'appeal') {
          assert.equal(left.id, `desk-${left.season}-${left.week}-appeal-${left.playerId}`);
          assert.equal(right.id, `desk-${right.season}-${right.week}-appeal-${right.playerId}`);
        } else if (field === 'playerId' && left[field] !== right[field]) {
          assert(correspondence.some(pair => pair.alone === left[field] && pair.interleaved === right[field]), 'Actual desk player links correspond');
        } else assert.deepEqual(left[field], right[field], `Complete desk field ${field}`);
      }
    }
    const differences = [];
    for (let option = 0; option < a.answers.length; option++) {
      assert.deepEqual(a.answers[option].rngBefore, b.answers[option].rngBefore, 'Paired answer RNG before');
      assert.deepEqual(a.answers[option].rngAfter, b.answers[option].rngAfter, 'Paired answer RNG after');
      const left = answerSummary(a.answers[option]), right = answerSummary(b.answers[option]);
      if (JSON.stringify(left) !== JSON.stringify(right)) differences.push({ option, alone: left, interleaved: right });
    }
    const pair = { id: a.id, seed: a.seed, generated, correspondence, alonePlayerId: a.playerId,
      interleavedPlayerId: b.playerId, aloneCardId: a.card.id, interleavedCardId: b.card.id,
      nonIdentityFieldsAgree: true, differences, productCorrectness: differences.length === 0 };
    pairs.push(pair);
    if (differences.length) parityFailures.push({ id: a.id, aloneCardId: a.card.id, interleavedCardId: b.card.id, differences });
  }
  return { pairs, parityFailures };
}

async function characterize() {
  const report = { schema: 1, integrityPassed: false, productCorrectness: false, parityFailures: [],
    scope: 'Planted suspensions on actual generated youth; every appeal option; all unselected desk cards preserved',
    samples: SAMPLES, fixedClock: '2026-10-01T00:00:00.000Z', initializationSeed: 0x1081,
    raw: {}, controls: [], sourceBefore: sources() };
  write('source-before.json', report.sourceBefore); write('report.json', report);
  try {
    const { build } = await import('esbuild');
    const desk = read(path.join(ROOT, 'src/lib/clubManagerDecisions.ts'));
    fs.mkdirSync(path.join(OUT, 'copies'), { recursive: true });
    fs.mkdirSync(path.join(OUT, 'bundles'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'copies/clubManagerDecisions.original.ts'), desk);
    const bundle = async (name, copiedDesk) => {
      const relative = `bundles/${name}.mjs`, destination = path.join(OUT, relative);
      const alias = { '@': path.join(ROOT, 'src'), ...(copiedDesk ? { '@/lib/clubManagerDecisions': copiedDesk } : {}) };
      await build({ absWorkingDir: ROOT, stdin: { contents: "export * as E from '@/lib/clubManager'; export * as D from '@/lib/clubManagerDecisions'; export * as S from '@/lib/clubManagerSlots';", resolveDir: ROOT },
        bundle: true, platform: 'node', format: 'esm', outfile: destination, alias, logLevel: 'silent' });
      return { file: destination, path: relative, sha256: hash(fs.readFileSync(destination)) };
    };
    const run = (name, emitted, workerMode, input) => {
      const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
      const receipt = path.join(dir, 'offline.log');
      const child = spawnSync(process.execPath, [WORKER, '--worker', emitted.file, dir, workerMode, ...(input ? [input] : [])],
        { cwd: ROOT, env: { ...process.env, TZ: 'UTC', SIM_OFFLINE_RECEIPT: receipt }, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 300000 });
      fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
      assert(!child.error && !child.signal && child.status === 0, `Worker ${name} must complete, not a runtime/setup failure: ${child.error || child.stderr}`);
      assert(!fs.existsSync(receipt) || fs.statSync(receipt).size === 0, 'No blocked external transport attempts');
      const rawPath = `${name}/observations.json`, observed = json(rawPath);
      assert(observed.complete && !observed.failure && observed.baseline?.passed, 'Complete actual worker and independent baseline');
      assert.deepEqual(observed.networkAttempts, []);
      report.raw[name] = { path: rawPath, sha256: hash(fs.readFileSync(path.join(OUT, rawPath))), bundlePath: emitted.path, bundleSha256: emitted.sha256, exit: child.status };
      return observed;
    };
    const aloneBundle = await bundle('alone'), interleavedBundle = await bundle('interleaved');
    assert.deepEqual(fs.readFileSync(aloneBundle.file), fs.readFileSync(interleavedBundle.file), 'Independent pristine instances execute byte-identical bundles');
    const alone = run('normal/alone', aloneBundle, 'alone');
    const interleaved = run('normal/interleaved', interleavedBundle, 'interleaved');
    assert(alone.checks.every(check => check.status === 'passed') && interleaved.checks.every(check => check.status === 'passed'));
    Object.assign(report, comparePairs(alone, interleaved));
    report.oldCardCompatibility = { passed: true, cases: [...alone.rows, ...interleaved.rows].filter(row => row.stability).length,
      scope: 'Same existing raw card, actual save/load and lean empty-slot round trip, every actual appeal option' };
    assert.equal(report.oldCardCompatibility.cases, 6);
    write('report.json', report);
    for (const [name, mutation] of Object.entries(CONTROL)) {
      assert.equal(desk.split(mutation.from).length - 1, 1, `Unique executable ${name} mutation`);
      const changed = desk.replace(mutation.from, mutation.to);
      assert.notEqual(changed, desk, 'Control changes source');
      const copiedDesk = path.join(OUT, `copies/${name}.ts`); fs.writeFileSync(copiedDesk, changed);
      const observed = run(`controls/${name}`, await bundle(name, copiedDesk), `control:${name}`, path.join(OUT, 'normal/alone/observations.json'));
      const failed = observed.checks.filter(check => check.status === 'assertion-failed');
      assert.equal(failed.length, 1, 'One intended copied-source failure');
      assert.equal(failed[0].name, mutation.assertion); assert.equal(failed[0].errorName, 'AssertionError');
      assert(observed.baseline.passed, 'Independent unchanged baseline passes with the copied fault');
      // The mapped assertion above compares the actual card or answer consequence.
      // Whole-row inequality would also reflect different worker RNG checkpoints.
      report.controls.push({ name, ...mutation, copiedSource: `copies/${name}.ts`, originalSha256: hash(desk), copiedSha256: hash(changed),
        mappedFailure: failed[0], independentBaselinePassed: true, effective: true });
      write('report.json', report);
    }
    report.sourceAfter = sources(); write('source-after.json', report.sourceAfter);
    assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Whole source and original fixtures stay unchanged');
    report.productCorrectness = report.parityFailures.length === 0; report.integrityPassed = true;
    write('report.json', report);
    console.log(`Appeal characterization integrity passed: ${SAMPLES} complete actual pairs.`);
    console.log('Existing-card compatibility: 6 save/load and empty-slot round trips, every appeal option.');
    console.log(`Effective copied controls: ${report.controls.map(control => control.name).join(', ')}; independent baseline passed in each.`);
    console.log(`Whole-source holds: ${Object.keys(report.sourceBefore).length} exact files; 6 executed bundles retained.`);
    console.log(`Product correctness: ${report.productCorrectness}; differing pairs: ${report.parityFailures.length}.`);
  } catch (error) {
    report.failure = { name: error.name, message: error.message, stack: error.stack };
    report.sourceAfter = sources(); write('source-after.json', report.sourceAfter); write('report.json', report); throw error;
  }
}

function verifyParity() {
  const parity = { status: 'runtime-failed', assertion: null };
  let validated = false;
  try {
    const reportBytes = fs.readFileSync(path.join(OUT, 'report.json'));
    const report = JSON.parse(reportBytes);
    parity.characterizationSha256 = hash(reportBytes);
    assert.equal(report.schema, 1); assert.equal(report.integrityPassed, true, 'A complete integrity report is required');
    assert.deepEqual(sources(), report.sourceBefore, 'Parity uses the same characterized source');
    assert.deepEqual(report.sourceBefore, report.sourceAfter, 'Characterization source hold');
    for (const raw of Object.values(report.raw)) {
      assert.equal(hash(fs.readFileSync(path.join(OUT, raw.path))), raw.sha256, 'Exact characterized raw observations');
      assert.equal(hash(fs.readFileSync(path.join(OUT, raw.bundlePath))), raw.bundleSha256, 'Exact executed bundle retained');
    }
    assert.equal(report.raw['normal/alone'].bundleSha256, report.raw['normal/interleaved'].bundleSha256, 'Pristine instances execute the same source');
    assert.equal(report.controls.length, 4); assert(report.controls.every(control => control.effective && control.independentBaselinePassed));
    const original = fs.readFileSync(path.join(OUT, 'copies/clubManagerDecisions.original.ts'));
    assert.equal(hash(original), report.sourceBefore['src/lib/clubManagerDecisions.ts'], 'Exact original desk source retained');
    for (const control of report.controls) {
      assert.equal(hash(original), control.originalSha256);
      assert.equal(hash(fs.readFileSync(path.join(OUT, control.copiedSource))), control.copiedSha256, 'Exact executed copied mutation retained');
    }
    const comparison = comparePairs(json(report.raw['normal/alone'].path), json(report.raw['normal/interleaved'].path));
    assert.deepEqual(comparison.parityFailures, report.parityFailures, 'Recompute actual disparity from the retained raw answers');
    assert.equal(report.productCorrectness, comparison.parityFailures.length === 0);
    parity.parityFailures = comparison.parityFailures; validated = true;
    assert.equal(report.productCorrectness, true, PARITY_ASSERTION);
    parity.status = 'passed'; write('parity-report.json', parity);
    console.log(`${PARITY_ASSERTION}: passed for ${SAMPLES} retained actual pairs.`);
  } catch (error) {
    const expected = validated && error instanceof assert.AssertionError && error.message.includes(PARITY_ASSERTION);
    parity.status = expected ? 'assertion-failed' : 'runtime-failed';
    parity.assertion = expected ? PARITY_ASSERTION : null;
    parity.error = { name: error.name, message: error.message, stack: error.stack };
    write('parity-report.json', parity); throw error;
  }
}

if (mode !== '--verify-parity') await characterize();
if (mode !== '--characterize') verifyParity();
