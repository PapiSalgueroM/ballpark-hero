/** Round 1082: actual offer review outcomes and effective copied-source faults.
 * Remote execution only. Originals, engine behavior and historic fixtures stay held.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { CHECK, SOCCER_OFFER_REVIEW_CONTROLS } from './qa/soccerOfferReview1082.mjs';

assert.ok(process.env.CI, 'Soccer offer review verification runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.SOCCER_OFFER_REVIEW_ARTIFACTS || path.join(ROOT, 'soccer-offer-review-artifacts'));
const HELPER = 'src/lib/soccerOfferReview.ts';
const WORKER = path.join(ROOT, 'scripts/qa/soccerOfferReview1082.mjs');
const hash = value => createHash('sha256').update(value).digest('hex');
const fileHash = file => hash(fs.readFileSync(file));
const slash = value => value.replaceAll('\\', '/');
const relative = file => slash(path.relative(OUT, file));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); };
const json = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
function sourceMap() {
  const result = {};
  const walk = folder => {
    for (const item of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(folder, item.name);
      if (item.isDirectory()) walk(file);
      else if (item.isFile()) result[slash(path.relative(ROOT, file))] = fileHash(file);
    }
  };
  for (const name of ['src', 'scripts']) walk(path.join(ROOT, name));
  for (const name of fs.readdirSync(ROOT).sort()) {
    if (/^(?:package(?:-lock)?\.json|tsconfig.*\.json|vite\.config\..+|vitest\.config\..+|tailwind\.config\..+|postcss\.config\..+|index\.html)$/.test(name)) result[name] = fileHash(path.join(ROOT, name));
  }
  return result;
}

const report = { schema: 1, complete: false, passed: false, normal: null, controls: [], raw: {}, sourceBefore: sourceMap() };
json(path.join(OUT, 'source-before.json'), report.sourceBefore);
const original = fs.readFileSync(path.join(ROOT, HELPER), 'utf8');
write(path.join(OUT, 'copies/original.ts'), original);

async function sample(name, sourceFile, only = '') {
  const entry = path.join(OUT, 'entries', `${name}.mjs`), bundle = path.join(OUT, 'bundles', `${name}.mjs`);
  write(entry, [
    `import * as E from ${JSON.stringify(slash(path.join(ROOT, 'src/lib/soccerCareerEngine.ts')))};`,
    `import * as R from ${JSON.stringify(slash(sourceFile))};`,
    `import * as D from ${JSON.stringify(slash(path.join(ROOT, 'src/lib/soccerClubSquad.ts')))};`,
    'export { E, R, D };',
  ].join('\n'));
  fs.mkdirSync(path.dirname(bundle), { recursive: true });
  const built = await build({ absWorkingDir: ROOT, entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent', metafile: true });
  json(path.join(OUT, 'bundles', `${name}.meta.json`), built.metafile);
  const inputs = Object.keys(built.metafile.inputs).map(p => slash(path.resolve(ROOT, p)));
  assert.ok(inputs.includes(slash(sourceFile)), `${name} must bundle its exact retained helper copy`);
  assert.ok(!inputs.includes(slash(path.join(ROOT, HELPER))), `${name} must not also include the original review helper`);
  const emitted = fs.readFileSync(bundle, 'utf8');
  assert.equal((emitted.match(/function buildSoccerOfferReview\(/g) || []).length, 1, `${name} needs one executable review helper`);
  assert.ok(/\bas R[,\s]/.test(emitted), `${name} must export its review namespace as R`);
  const rawPath = path.join(OUT, 'raw', name, 'observations.json');
  fs.mkdirSync(path.dirname(rawPath), { recursive: true });
  const env = { ...process.env, SIM_NETWORK: 'offline', SIM_OFFLINE_RECEIPT: path.join(OUT, 'raw', name, 'offline.log') };
  const guard = `--require=${slash(path.join(ROOT, 'scripts/lib/offlineTransport.cjs'))}`;
  if (!(env.NODE_OPTIONS || '').includes('offlineTransport.cjs')) env.NODE_OPTIONS = [env.NODE_OPTIONS, guard].filter(Boolean).join(' ');
  const child = spawnSync(process.execPath, [WORKER, '--worker', bundle, rawPath, only], { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 180000 });
  write(path.join(OUT, 'raw', name, 'stdout.log'), child.stdout || '');
  write(path.join(OUT, 'raw', name, 'stderr.log'), child.stderr || '');
  json(path.join(OUT, 'raw', name, 'process.json'), { status: child.status, signal: child.signal, error: child.error ? { name: child.error.name, message: child.error.message } : null });
  assert.equal(child.error, undefined, `${name} must not have process setup failure`);
  assert.equal(child.signal, null, `${name} must finish without termination`);
  assert.equal(child.status, 0, `${name} must complete normally; inspect retained raw process logs`);
  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  report.raw[name] = { path: relative(rawPath), sha256: fileHash(rawPath), bundlePath: relative(bundle), bundleSha256: fileHash(bundle), metafilePath: `bundles/${name}.meta.json`, metafileSha256: fileHash(path.join(OUT, 'bundles', `${name}.meta.json`)), copyPath: relative(sourceFile), copySha256: fileHash(sourceFile), exit: child.status };
  assert.equal(raw.complete, true, `${name} raw worker must be complete`);
  assert.equal(raw.runtimeFailure, undefined, `${name} must not contain a runtime failure`);
  assert.deepEqual(raw.networkAttempts, [], `${name} must not attempt network transport`);
  assert.equal(fs.existsSync(path.join(OUT, 'raw', name, 'offline.log')), false, `${name} transport guard must remain unused`);
  assert.equal(raw.baseline?.passed, true, `${name} unchanged engine baseline must pass`);
  return raw;
}

try {
  const normal = await sample('normal', path.join(OUT, 'copies/original.ts'));
  assert.deepEqual(normal.checks.map(c => c.name), Object.values(CHECK), 'Every authored normal outcome group must execute');
  assert.ok(normal.checks.every(c => c.status === 'passed' && c.records > 0), 'Every normal group must pass actual retained comparisons');
  assert.ok(normal.fixtureSet.fixtures.some(f => f.id === 'known-depth') && normal.fixtureSet.fixtures.some(f => f.id === 'missing-depth'), 'Both real-data and unavailable-data fixtures must execute');
  report.normal = { checks: normal.checks, records: normal.records.length, fixtures: normal.fixtureSet.fixtures.map(f => ({ id: f.id, currentKind: f.currentKind, planted: f.planted })), baseline: normal.baseline };
  for (const fault of SOCCER_OFFER_REVIEW_CONTROLS) {
    assert.equal(original.split(fault.from).length - 1, 1, `${fault.name} needs exactly one executable source anchor`);
    const changed = original.replace(fault.from, fault.to);
    assert.notEqual(changed, original, `${fault.name} must change actual copied source`);
    const copy = path.join(OUT, 'copies', `${fault.name}.ts`);
    write(copy, changed);
    const raw = await sample(fault.name, copy, fault.assertion);
    assert.equal(raw.checks.length, 1, `${fault.name} must run its exact mapped outcome group`);
    const failed = raw.checks[0];
    assert.equal(failed.name, fault.assertion, `${fault.name} must fail its intended assertion`);
    assert.equal(failed.status, 'assertion-failed', `${fault.name} must be an actual assertion failure`);
    assert.equal(failed.errorName, 'AssertionError', `${fault.name} cannot count runtime failure`);
    assert.ok(failed.stack.startsWith('AssertionError'), `${fault.name} must retain the actual assertion stack`);
    assert.ok(failed.error.includes(fault.assertion), `${fault.name} must retain its actual mapped assertion message`);
    assert.ok(raw.records.length > 0, `${fault.name} needs actual outcome records`);
    assert.notDeepEqual(raw.records.at(-1).actual, raw.records.at(-1).expected, `${fault.name} must change the actual value tested by the mapped assertion`);
    assert.deepEqual(raw.fixtureSet, normal.fixtureSet, `${fault.name} cannot alter fixture generation or engine initialization`);
    assert.deepEqual(raw.baseline, normal.baseline, `${fault.name} independent engine baseline must remain completely exact`);
    report.controls.push({ ...fault, copiedSource: relative(copy), originalSha256: hash(original), copiedSha256: hash(changed), effective: true, mappedFailure: failed, records: raw.records.length, independentBaselinePassed: true });
  }
  report.complete = true;
  report.passed = true;
} catch (error) {
  report.failure = { name: error.name, message: error.message, stack: error.stack };
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  report.sourceAfter = sourceMap();
  json(path.join(OUT, 'source-after.json'), report.sourceAfter);
  try { assert.deepEqual(report.sourceAfter, report.sourceBefore, 'All original source, scripts and configuration must stay unchanged'); }
  catch (error) { report.complete = false; report.passed = false; report.sourceFailure = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
  json(path.join(OUT, 'report.json'), report);
}
console.log(`Actual review outcomes: ${report.normal?.checks.filter(c => c.status === 'passed').length ?? 0}/${Object.values(CHECK).length} normal groups passed.`);
console.log(`Retained observations: ${report.normal?.records ?? 0} comparisons across ${report.normal?.fixtures.length ?? 0} generated and explicitly staged offer fixtures.`);
console.log(`Copied helper controls: ${report.controls.length}/${SOCCER_OFFER_REVIEW_CONTROLS.length} effective mapped assertion failures, each with a completely unchanged engine baseline.`);
console.log(`Evidence binding: ${Object.keys(report.raw).length} actual raw workers and executable bundles; ${Object.keys(report.sourceBefore).length} original source holds.`);
console.log(`Soccer offer review: ${report.passed ? 'passed' : 'FAILED'}.`);
