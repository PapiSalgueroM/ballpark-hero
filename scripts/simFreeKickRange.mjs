/* Remote-only range proof. Actual pinned rules remain the explicit-shot oracle.
   Cap exploration describes its finite sample, never the production cap. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

assert(process.env.CI, 'Run this verification only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = fileURLToPath(import.meta.url);
const OUT = path.resolve(process.env.FREE_KICK_RANGE_ARTIFACTS || path.join(ROOT, 'free-kick-range-artifacts/outcomes'));
const BASE = '8fe82a4dc1346f7d5b8072f387f3acb34bbaa3c8';
const ENGINE = 'src/lib/freeKick.ts';
const RANGE = 'const distance = i === 0 ? 11 : Math.max(17, Math.round((11 + t * 14) * 10) / 10);';
const OLD_RANGE = 'const distance = Math.round((11 + t * 14) * 10) / 10;';
const GROUP = {
  baseline: 'unchanged fixed-distance shot baseline',
  ladder: 'legal generated ladder and unchanged seeded fields',
  shots: 'complete explicit-shot and random-stream parity',
  offers: 'actual watched Tycoon offers stay legal and read-only',
  reach: 'new distance changes reach without rerolling the keeper',
  caps: 'complete historical cap sample and conservative analytic bound',
};
const controls = {
  inside: { group: 'ladder', from: RANGE, to: OLD_RANGE },
  boundary: { group: 'ladder', from: RANGE, to: RANGE.replace('Math.max(17,', 'Math.max(16.5,') },
  penalty: { group: 'ladder', from: RANGE, to: RANGE.replace('i === 0 ? 11 : ', '') },
  draw: { group: 'ladder', from: 'const keeperSkill = clamp(0.28 + t * 0.42 + (rng() - 0.5) * 0.12, 0.2, 0.82);', to: 'rng(); const keeperSkill = clamp(0.28 + t * 0.42 + (rng() - 0.5) * 0.12, 0.2, 0.82);' },
  later: { group: 'ladder', from: RANGE, to: RANGE.replace('i === 0 ? 11 :', 'i === 0 ? 11 : i === 4 ? 18 :') },
  label: { group: 'ladder', from: "label: i === 0 ? 'Penalty spot, no wall' : `${distance} m, ${wallSize} in the wall`,", to: "label: i === 0 ? 'Penalty spot, no wall' : `${Math.round((11 + t * 14) * 10) / 10} m, ${wallSize} in the wall`," },
  physics: { group: 'shots', from: 'const dip = (aim.power - 0.55) * 0.22;', to: 'const dip = (aim.power - 0.55) * (setup.distance === 17 ? 0.4 : 0.22);' },
  shotDraw: { group: 'shots', from: 'const spray = sprayFor(aim, setup, rng);', to: 'if (setup.distance === 17) rng(); const spray = sprayFor(aim, setup, rng);' },
  weak: { group: 'reach', from: 'const tooWeak = aim.power < 0.34 + (setup.distance - 11) * 0.012;', to: 'const tooWeak = setup.distance !== 17 && aim.power < 0.34 + (setup.distance - 11) * 0.012;' },
  points: { group: 'shots', from: '      (setup.distance - 11) * 6 +', to: '      (setup.distance - 11) * 6 + (setup.distance === 17 ? 25 : 0) +' },
  cap: { group: 'caps', from: '(n, k) => n + Math.round(100 + (k.distance - 11) * 6 + k.wallSize * 15 + 120 + k.keeperSkill * 60),', to: '(n, k) => n + Math.round(100 + (k.distance - 11) * 6 + k.wallSize * 15 + 120 + k.keeperSkill * 60) + (k.distance === 17 ? 25 : 0),' },
  offered: { group: 'offers', from: RANGE, to: RANGE.replace('i === 0 ? 11 :', 'i === 0 ? 11 : i === 2 ? 14.1 :') },
};
const sha = value => createHash('sha256').update(value).digest('hex');
const source = file => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
function fileHash(file) { { const bytes = fs.readFileSync(file); return sha(bytes); } }
function save(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
const clone = value => JSON.parse(JSON.stringify(value));
function once(text, from, to) {
  assert.equal(text.split(from).length - 1, 1, 'One exact executable forward anchor');
  const changed = text.replace(from, to);
  assert.notEqual(changed, text);
  assert.equal(changed.split(to).length - 1, 1, 'One exact reverse anchor');
  assert.equal(changed.replace(to, from), text, 'Exact source reversal');
  return changed;
}

async function worker() {
  const name = process.argv[3], directory = path.join(OUT, name);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'input.json'), 'utf8'));
  const RealDate = Date, NOW = Date.UTC(2026, 0, 1);
  globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  let ambientDraws = 0;
  Math.random = () => { ambientDraws++; throw new Error('Pure range proof must not use ambient randomness'); };
  const O = await import(pathToFileURL(manifest.oldBundle).href);
  const F = await import(pathToFileURL(manifest.currentBundle).href);
  const { T, L } = await import(pathToFileURL(manifest.tycoonBundle).href);
  const records = [], results = [];
  let active = '';
  function equal(id, actual, expected, context = {}) {
    records.push({ group: active, id, actual: clone(actual), expected: clone(expected), context: clone(context), ambientDraws, now: Date.now() });
    assert.deepEqual(actual, expected, GROUP[active]);
  }
  function shot(engine, aim, setup, seed) {
    const before = { aim: clone(aim), setup: clone(setup) }, draws = [], rng = engine.lehmer(seed);
    const result = engine.takeShot(aim, setup, () => { const value = rng(); draws.push(value); return value; });
    const continuation = [rng(), rng(), rng()];
    return { before, after: { aim, setup }, result, draws, continuation };
  }
  const literal = { distance: 25, wallSize: 3, keeperSkill: 0.55, keeperLean: -0.27, label: 'Explicit held baseline' };
  const aims = [];
  for (const x of [-0.8, 0, 0.8]) for (const y of [0.15, 0.65, 0.9]) for (const power of [0.25, 0.4, 0.7, 1]) for (const curve of [-0.5, 0, 0.5]) aims.push({ x, y, power, curve });
  const work = {
    baseline() {
      const actual = [], expected = [];
      for (let i = 0; i < aims.length; i++) {
        actual.push(shot(F, clone(aims[i]), clone(literal), 123456 + i * 7919));
        expected.push(shot(O, clone(aims[i]), clone(literal), 123456 + i * 7919));
      }
      equal('full baseline shots and seeded continuations', actual, expected);
      equal('baseline includes real goals and misses', [actual.some(row => row.result.scored), actual.some(row => !row.result.scored)], [true, true]);
      equal('baseline leaves inputs unchanged', actual.map(row => row.after), actual.map(row => row.before));
    },
    ladder() {
      const seeds = [0, 1, -1, 2147483647, ...Array.from({ length: 128 }, (_, i) => (i + 1) * 104729)];
      for (const seed of seeds) {
        const old = O.buildRun(seed), actual = F.buildRun(seed);
        const expected = old.map((kick, i) => i > 0 && kick.distance < 17 ? { ...kick, distance: 17, label: `17 m, ${kick.wallSize} in the wall` } : kick);
        equal(`seed ${seed} whole ladder`, actual, expected, { old });
        equal(`seed ${seed} actual legal kick types`, actual.map((kick, i) => i === 0 ? kick.distance === 11 && kick.wallSize === 0 : kick.distance > 16.5 && kick.wallSize > 0), Array(10).fill(true));
        equal(`seed ${seed} exact repeat`, F.buildRun(seed), actual);
      }
    },
    shots() {
      const setups = [{ ...literal, distance: 17 }, ...O.buildRun(20260904), ...F.buildRun(20260904)];
      for (let index = 0; index < setups.length; index++) for (let i = 0; i < aims.length; i++) {
        const setup = setups[index], seed = 123456 + i * 7919 + index;
        const actual = shot(F, clone(aims[i]), clone(setup), seed), expected = shot(O, clone(aims[i]), clone(setup), seed);
        equal(`setup ${index} aim ${i} full result`, actual, expected);
        equal(`setup ${index} aim ${i} immutable inputs`, actual.after, actual.before);
        equal(`setup ${index} aim ${i} actual shot draws`, actual.draws.length, 4);
      }
    },
    offers() {
      const fresh = T.newTycoon(NOW), reached = new Set();
      for (let match = 0; match < 1000; match++) {
        const state = { ...clone(fresh), totalMatches: match, minute: 20 + L.hash32(match) % 61, matchSec: 0 };
        const before = clone(state), offer = T.setPieceOffer(state, true), repeat = T.setPieceOffer(state, true), away = T.setPieceOffer(state, false);
        assert(offer, 'Actual engine fixture must contain its scheduled offer');
        const old = O.buildRun(offer.seed)[offer.kickIndex], current = F.buildRun(offer.seed)[offer.kickIndex];
        reached.add(offer.kickIndex);
        equal(`match ${match} actual legal offer`, offer.kind === 'penalty' ? current.distance === 11 && current.wallSize === 0 : current.distance > 16.5 && current.wallSize > 0, true, { before, after: state, offer, repeat, away, old, current });
        equal(`match ${match} complete read-only state`, state, before);
        equal(`match ${match} offer repeat`, repeat, offer);
        equal(`match ${match} away exclusion`, away, null);
      }
      equal('actual offer coverage', [...reached].sort((a, b) => a - b), [0, 2, 3, 4, 5, 6]);
    },
    reach() {
      for (let i = 1; i <= 256; i++) {
        const seed = i * 104729, old = O.buildRun(seed), current = F.buildRun(seed);
        for (const [index, power] of [[1, 0.38], [2, 0.39], [3, 0.4]]) {
          const aim = { x: 0.8, y: 0.7, power, curve: 0 };
          const before = shot(O, clone(aim), clone(old[index]), seed), after = shot(F, clone(aim), clone(current[index]), seed);
          equal(`seed ${seed} kick ${index} real reach changed`, { oldOnTarget: before.result.onTarget, newOnTarget: after.result.onTarget, newVerdict: after.result.verdict, newPoints: after.result.points }, { oldOnTarget: true, newOnTarget: false, newVerdict: 'Never had the legs.', newPoints: 0 }, { before, after });
          equal(`seed ${seed} kick ${index} keeper and draws held`, { x: after.result.keeperX, y: after.result.keeperY, draws: after.draws, continuation: after.continuation }, { x: before.result.keeperX, y: before.result.keeperY, draws: before.draws, continuation: before.continuation });
          equal(`seed ${seed} kick ${index} inputs held`, [before.after, after.after], [before.before, after.before]);
        }
      }
    },
    caps() {
      // A safe bound from the held rule coefficients. This is not an attained score.
      const distances = [11, 17, 17, 17, 17.2, 18.8, 20.3, 21.9, 23.4, 25];
      const analytic = distances.map((distance, i) => {
        const t = i / 9, wallUpper = i === 0 ? 0 : Math.min(5, 1 + Math.floor(t * 5 + 0.9));
        const keeperUpper = Math.min(0.82, Math.max(0.2, 0.28 + t * 0.42 + 0.06));
        return { index: i, distance, wallUpper, keeperUpper, pointsUpper: Math.ceil(100 + (distance - 11) * 6 + wallUpper * 15 + 120 + keeperUpper * 60) };
      });
      const bound = analytic.reduce((sum, row) => sum + row.pointsUpper, 0), sample = [];
      for (let day = 0; day < 800; day++) {
        const date = new RealDate(NOW + day * 86400000).toISOString().slice(0, 10), seed = O.daySeed(date);
        const old = O.buildRun(seed), current = F.buildRun(seed), oldCap = O.maxRunScore(old), currentCap = F.maxRunScore(current), expectedCap = O.maxRunScore(current);
        const row = { date, seed, old, current, oldCap, currentCap, expectedCap, delta: currentCap - oldCap };
        sample.push(row);
        equal(`${date} cap follows unchanged scoring`, currentCap, expectedCap, row);
        equal(`${date} cap fits analytic bound`, currentCap <= bound, true, { bound, currentCap });
        equal(`${date} actual generated fields fit bound`, current.map((kick, i) => kick.distance === analytic[i].distance && kick.wallSize <= analytic[i].wallUpper && kick.keeperSkill <= analytic[i].keeperUpper), Array(10).fill(true));
      }
      save(path.join(directory, 'cap-distribution.json'), { authority: 'Diagnostic only. Production cap was not queried or changed.', sampleDays: 800, analytic, bound, sample,
        observed: { oldMin: Math.min(...sample.map(row => row.oldCap)), oldMax: Math.max(...sample.map(row => row.oldCap)), currentMin: Math.min(...sample.map(row => row.currentCap)), currentMax: Math.max(...sample.map(row => row.currentCap)), deltas: [...new Set(sample.map(row => row.delta))].sort((a, b) => a - b) } });
    },
  };
  for (const group of manifest.groups) {
    active = group;
    try { work[group](); equal(`${group} ambient randomness held`, ambientDraws, 0); results.push({ group, name: GROUP[group], status: 'passed' }); }
    catch (error) { results.push({ group, name: GROUP[group], status: error instanceof assert.AssertionError ? 'assertion-failed' : 'runtime-failed', error: { name: error.name, message: error.message, stack: error.stack } }); console.error(error.stack); }
  }
  save(path.join(directory, 'records.json'), records);
  save(path.join(directory, 'report.json'), { name, results, recordCount: records.length, ambientDraws, clock: Date.now() });
  console.log(`Executed ${results.length} actual groups, ${records.length} retained comparisons; failures ${results.filter(row => row.status !== 'passed').length}.`);
  process.exitCode = results.some(row => row.status !== 'passed') ? 1 : 0;
}

function holds() {
  const files = execFileSync('git', ['ls-files', '-z', '--', 'src', 'scripts', 'package.json', 'package-lock.json', 'tsconfig*.json', 'vite.config.*', 'vitest.config.*', 'index.html'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  files.push(path.relative(ROOT, SELF).replaceAll('\\', '/'));
  return Object.fromEntries([...new Set(files)].sort().map(file => [file, fileHash(path.join(ROOT, file))]));
}
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const before = holds(), summary = { status: 'running', baselineCommit: BASE, groups: GROUP, controls: [], sourceBefore: before };
  save(path.join(OUT, 'summary.json'), summary);
  try {
    const oldBytes = execFileSync('git', ['show', `${BASE}:${ENGINE}`], { cwd: ROOT });
    const old = oldBytes.toString('utf8').replace(/\r\n?/g, '\n'), current = source(path.join(ROOT, ENGINE));
    const oldComment = " * things and the owner's instruction is one engine, many sports. Every number\n * below is the number Round 433 shipped, in the same order, so a seed plays\n * the same ten kicks it always did.";
    const newComment = " * things and the owner's instruction is one engine, many sports. Round 1091\n * moves the three short walled setups outside the penalty area. The penalty,\n * later distances, random draw order and shot rules stay unchanged.";
    assert.equal(current, once(once(old, OLD_RANGE, RANGE), oldComment, newComment), 'Whole engine has only declared distance and comment edits');
    const sourceDir = path.join(OUT, 'sources'); fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'freeKick-old.raw.ts'), oldBytes);
    fs.writeFileSync(path.join(sourceDir, 'freeKick-old.ts'), old);
    fs.writeFileSync(path.join(sourceDir, 'freeKick-current.ts'), current);
    const arcadeBytes = execFileSync('git', ['show', `${BASE}:src/lib/arcade.ts`], { cwd: ROOT });
    const arcade = arcadeBytes.toString('utf8').replace(/\r\n?/g, '\n');
    assert.equal(source(path.join(ROOT, 'src/lib/arcade.ts')), arcade, 'Shared random generator and ladder remain pinned');
    fs.writeFileSync(path.join(sourceDir, 'arcade.ts'), arcade);
    const copies = { old: path.join(sourceDir, 'freeKick-old.ts'), normal: path.join(sourceDir, 'freeKick-current.ts') };
    const mutations = [];
    for (const [name, control] of Object.entries(controls)) {
      const changed = once(current, control.from, control.to), file = path.join(sourceDir, `freeKick-${name}.ts`);
      fs.writeFileSync(file, changed); copies[name] = file;
      mutations.push({ name, ...control, originalRawSha256: fileHash(path.join(ROOT, ENGINE)), originalNormalizedSha256: sha(current), copiedSha256: sha(changed), copy: file, uniqueForward: 1, uniqueReverse: 1, exactReverse: true });
    }
    save(path.join(OUT, 'mutations.json'), mutations);
    const bundles = {};
    for (const [name, file] of Object.entries(copies)) {
      const output = path.join(OUT, 'bundles', `${name}.mjs`);
      const compiled = await build({ entryPoints: [file], outfile: output, bundle: true, format: 'esm', platform: 'node', metafile: true, logLevel: 'silent' });
      const inputs = Object.keys(compiled.metafile.inputs).map(input => path.resolve(ROOT, input));
      assert(inputs.includes(file), 'Actual copied engine is a bundle input');
      assert(!inputs.includes(path.join(ROOT, ENGINE)), 'No original engine can bypass its copy');
      assert.equal(inputs.filter(input => path.basename(input).startsWith('freeKick-')).length, 1, 'One engine implementation per bundle');
      save(path.join(OUT, 'bundles', `${name}.metafile.json`), compiled.metafile);
      bundles[name] = { path: output, sha256: fileHash(output), input: file, inputSha256: fileHash(file) };
    }
    const tycoonBundle = path.join(OUT, 'bundles', 'tycoon.mjs');
    const compiled = await build({ stdin: { contents: "export * as T from './src/lib/stadiumTycoon'; export * as L from './src/lib/leagueCore';", resolveDir: ROOT, loader: 'ts' }, outfile: tycoonBundle, bundle: true, format: 'esm', platform: 'node', metafile: true, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
    save(path.join(OUT, 'bundles', 'tycoon.metafile.json'), compiled.metafile);
    bundles.tycoon = { path: tycoonBundle, sha256: fileHash(tycoonBundle) };
    save(path.join(OUT, 'bundles.json'), bundles);
    let baseline;
    for (const name of ['normal', ...Object.keys(controls)]) {
      const directory = path.join(OUT, name), groups = name === 'normal' ? Object.keys(GROUP) : ['baseline', controls[name].group];
      save(path.join(directory, 'input.json'), { name, groups, oldBundle: bundles.old.path, currentBundle: bundles[name].path, tycoonBundle, bundleHashes: { old: bundles.old.sha256, current: bundles[name].sha256, tycoon: bundles.tycoon.sha256 } });
      const run = spawnSync(process.execPath, [SELF, '--worker', name], { cwd: ROOT, env: { ...process.env, FREE_KICK_RANGE_ARTIFACTS: OUT }, encoding: 'utf8', timeout: 240000, maxBuffer: 16 * 1024 * 1024 });
      fs.writeFileSync(path.join(directory, 'stdout.log'), run.stdout || ''); fs.writeFileSync(path.join(directory, 'stderr.log'), run.stderr || '');
      save(path.join(directory, 'process.json'), { status: run.status, signal: run.signal, error: run.error ? { name: run.error.name, message: run.error.message } : null });
      assert(!run.error && !run.signal, 'Actual fresh worker completed');
      const report = JSON.parse(fs.readFileSync(path.join(directory, 'report.json'), 'utf8'));
      const records = JSON.parse(fs.readFileSync(path.join(directory, 'records.json'), 'utf8'));
      assert.equal(report.results.length, groups.length); assert.equal(report.recordCount, records.length);
      assert(!report.results.some(row => row.status === 'runtime-failed'), 'Runtime failure cannot earn control credit');
      const currentBaseline = records.filter(row => row.group === 'baseline');
      assert.equal(report.results.find(row => row.group === 'baseline').status, 'passed', 'Independent explicit-shot baseline is healthy');
      assert(currentBaseline.length > 0);
      if (name === 'normal') {
        assert.equal(run.status, 0); assert(report.results.every(row => row.status === 'passed'));
        assert.equal(run.stderr, ''); baseline = currentBaseline;
        summary.normal = { passed: report.results.length, failed: 0, comparisons: records.length, reportSha256: fileHash(path.join(directory, 'report.json')), recordsSha256: fileHash(path.join(directory, 'records.json')) };
      } else {
        assert.equal(run.status, 1); assert.deepEqual(currentBaseline, baseline, 'Complete independent baseline equals pristine output');
        const failed = report.results.filter(row => row.status !== 'passed'); assert.equal(failed.length, 1);
        assert.equal(failed[0].group, controls[name].group); assert.equal(failed[0].status, 'assertion-failed'); assert.equal(failed[0].error.name, 'AssertionError');
        assert(failed[0].error.message.startsWith(GROUP[controls[name].group]), 'Exact mapped assertion');
        assert.match(run.stderr, /AssertionError/); assert.doesNotMatch(run.stderr, /(?:SyntaxError|TypeError|ReferenceError|ERR_MODULE_NOT_FOUND|UnhandledPromiseRejection|SIM_OFFLINE_BLOCK)/);
        assert(records.some(row => row.group === controls[name].group && JSON.stringify(row.actual) !== JSON.stringify(row.expected)), 'Actual mismatching outcome retained before assertion');
        summary.controls.push({ name, status: 'assertion-failed', passed: 1, failed: 1, group: failed[0].group, assertion: GROUP[failed[0].group], reportSha256: fileHash(path.join(directory, 'report.json')), recordsSha256: fileHash(path.join(directory, 'records.json')) });
      }
      save(path.join(OUT, 'summary.json'), summary);
    }
    assert.equal(summary.controls.length, 12);
    summary.capDiagnostics = { path: 'normal/cap-distribution.json', sha256: fileHash(path.join(OUT, 'normal/cap-distribution.json')), productionCapChecked: false };
    summary.status = 'passed';
  } catch (error) { summary.status = 'failed'; summary.error = { name: error.name, message: error.message, stack: error.stack }; throw error; }
  finally {
    summary.sourceAfter = holds();
    try { assert.deepEqual(summary.sourceAfter, before, 'All held original files remain byte identical'); }
    catch (error) { summary.status = 'failed'; summary.sourceHoldError = { name: error.name, message: error.message }; save(path.join(OUT, 'summary.json'), summary); throw error; }
    save(path.join(OUT, 'summary.json'), summary);
  }
  console.log('simFreeKickRange: six actual outcome groups passed against the pinned engine.');
  console.log('simFreeKickRange: twelve unique copied faults produced mapped AssertionErrors with complete healthy baselines.');
  console.log('simFreeKickRange: actual Tycoon offers, explicit shot results and seeded continuations retained.');
  console.log('simFreeKickRange: all800 dated cap rows and an analytic bound retained; production cap remains unchecked.');
  console.log(`simFreeKickRange: ${Object.keys(summary.sourceBefore).length} original source hashes held; copies, bundles and raw reports retained.`);
}

if (process.argv[2] === '--worker') await worker();
else { assert.equal(process.argv.length, 2, 'No unsupported mode can skip a control'); await main(); }
