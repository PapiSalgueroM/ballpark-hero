import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { bundleCareerSources, deriveCareerClubPool, poolInputs, renderPoolFile, sinceInput } from '../lib/careerClubPool.mjs';

const arg = (name, fallback) => { const index = process.argv.indexOf(name); return index < 0 ? fallback : process.argv[index + 1]; };
assert(process.env.CI, 'Remote isolated CI only');
const root = process.cwd(), out = path.resolve(arg('--out', process.env.QA_OUT));
const mode = arg('--mode', 'original'), exit = Number(arg('--exit-code', 'NaN'));
assert(['original', 'fixed'].includes(mode)); assert(Number.isInteger(exit), 'Native Vitest exit required');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blob = bytes => crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
const spec = read(arg('--cases', 'scripts/qa/soccerSegundaBridgeCases.json'));
assert.equal(spec.base, '3268307038c4586dbc35f4697da1849512b473d9');
assert.equal(spec.cases.length, 7); assert.equal(spec.files.length, 2);
assert(!JSON.stringify(spec).includes('MUST_BIND'), 'Every reviewed case must be concrete');
assert.equal(spec.cases.filter(test => test.owned).length, 5);
const receipt = process.env.SIM_OFFLINE_RECEIPT;
const offline = () => { assert(receipt && fs.existsSync(receipt), 'Existing offline receipt required'); assert.equal(fs.readFileSync(receipt).length, 0, 'Offline receipt must remain empty'); };
const tracked = git('ls-files', '-z').split('\0').filter(Boolean).sort();
const inventory = () => Object.fromEntries(tracked.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const before = inventory(), status = git('status', '--porcelain=v1', '--untracked-files=all');
assert.equal(status, '', 'Clean source before evidence reader'); offline();
write('evidence-source-before.json', before);
const tests = spec.files.map(file => {
  const bytes = fs.readFileSync(file.path);
  assert.equal(sha(bytes), file.sha256, file.path + ' reviewed test bytes');
  return { path: file.path, sha256: sha(bytes), gitBlob: blob(bytes), bytes: bytes.length };
});
if (mode === 'original') for (const [file, pin] of Object.entries(spec.originalPins)) assert.equal(blob(fs.readFileSync(file)), pin, file + ' original body');
assert.deepEqual(read(path.join(out, 'types-passed.json')), { command: 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json', exit: 0 });
const report = { status: 'incomplete', mode, base: spec.base, head: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'),
  nativeVitestExit: exit, tests, scope: 'Original business absence or fixed six-engine/one-creation cases only. No build, browser, release, whole-suite or natural career credit.' };
let failure = null;
try {
  const result = read(path.join(out, 'vitest.json'));
  const strip = value => value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  function validate(value) {
    const assertions = value.testResults.flatMap(file => file.assertionResults);
    assert.equal(value.testResults.length, 2, 'SC_SEGUNDA_TEST_CENSUS');
    assert.equal(value.numTotalTests, 7, 'SC_SEGUNDA_TEST_CENSUS');
    assert.equal(assertions.length, 7, 'SC_SEGUNDA_TEST_CENSUS');
    assert.equal(value.numPendingTests, 0); assert.equal(value.numTodoTests ?? 0, 0);
    for (const key of ['numRuntimeErrors', 'numRuntimeErrorTestSuites']) if (Object.hasOwn(value, key)) assert.equal(value[key], 0);
    if (Object.hasOwn(value, 'unhandledErrors')) { assert(Array.isArray(value.unhandledErrors)); assert.equal(value.unhandledErrors.length, 0); }
    const owned = mode === 'original' ? 5 : 0;
    assert.equal(value.numFailedTests, owned); assert.equal(value.numPassedTests, 7 - owned);
    assert.equal(value.success, mode === 'fixed');
    const names = assertions.map(test => test.fullName).sort();
    assert.deepEqual(names, spec.cases.map(test => test.fullName).sort(), 'SC_SEGUNDA_TEST_CENSUS');
    for (const expected of spec.cases) {
      const actual = assertions.find(test => test.fullName === expected.fullName);
      const red = mode === 'original' && expected.owned;
      assert.equal(actual.status, red ? 'failed' : 'passed', expected.fullName);
      const messages = (actual.failureMessages ?? []).map(strip);
      if (red) {
        assert.equal(messages.length, 1); assert.match(messages[0].trim(), /^AssertionError:/);
        assert(messages[0].includes(expected.marker), expected.marker + ' owned business assertion');
        assert(!/\b(?:TypeError|SyntaxError|ReferenceError|Unhandled|unhandledRejection|uncaughtException)\b/.test(messages[0]));
      } else assert.equal(messages.length, 0);
    }
    return assertions;
  }
  assert.equal(exit, mode === 'original' ? 1 : 0, 'Actual native Vitest exit');
  const assertions = validate(result);
  const logs = ['vitest.stdout.log', 'vitest.stderr.log'].map(file => fs.readFileSync(path.join(out, file), 'utf8')).join('\n');
  assert(!/\b(?:Unhandled\s+(?:Errors?|Rejection|Exception)|Vitest caught|uncaughtException|unhandledRejection)\b/i.test(logs), 'No hidden runtime failure');
  const copied = structuredClone(result), originalCopy = JSON.stringify(copied);
  const populated = copied.testResults.find(file => file.assertionResults.length > 0);
  populated.assertionResults.splice(0, 1);
  let omission = null;
  try { validate(copied); } catch (error) { omission = error; }
  assert(omission instanceof assert.AssertionError && omission.message.includes('SC_SEGUNDA_TEST_CENSUS'), 'Copied actual case omission must be rejected by census guard');
  write('copied-actual-omission.json', { omitted: true, beforeTests: 7, afterTests: 6, error: String(omission) });
  assert.notEqual(JSON.stringify(copied), originalCopy);
  assert.equal(JSON.stringify(result), originalCopy, 'Copied control leaves actual result exact');

  const raw = Object.fromEntries(spec.cases.map(test => [test.raw, read(path.join(out, 'evidence', test.raw + '.json'))]));
  const engineNames = ['canonical', 'academy', 'world', 'history', 'cup', 'savedOffers'];
  for (const name of engineNames) assert(Array.isArray(raw[name].importDraws), name + ' complete import tape');
  for (const name of engineNames) assert.deepEqual(raw[name].importDraws, raw.canonical.importDraws, 'Same actual engine module tape across all six records');
  const value = Object.fromEntries(engineNames.map(name => [name, raw[name].value]));
  const reference = {
    canonical: value.canonical.legacy, history: value.history.held, savedOffers: value.savedOffers,
    world: value.world.held, cup: value.cup.held,
    creation: { saved: raw['creation-ui'].value.old2025.saved, draws: raw['creation-ui'].value.old2025.draws,
      storage: raw['creation-ui'].value.old2025.storage,
      initArgs: raw['creation-ui'].value.old2025.initArgs.map((value, index) => index === 7 ? { intentionallyExpandedClubPool: true } : value) },
  };
  write('held-reference.json', reference);
  write('original-neutral-offer-profile.json', value.savedOffers.oldClub);
  if (mode === 'original') {
    assert.deepEqual(value.world.lower.find(club => club.name === 'FC Andorra'), value.savedOffers.oldClub, 'Saved neutral fixture is the actual original projection');
    assert.equal(value.canonical.added.length, 0); assert.equal(value.canonical.generated.length, 307);
    assert.equal(value.canonical.hand.length, 190);
  }

  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
  const temporary = path.join(out, 'generator-readonly'); fs.mkdirSync(temporary, { recursive: true });
  let seed = 4191; const importDraws = [], originalRandom = Math.random;
  let mod;
  try {
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const value = seed / 4294967296; importDraws.push(value); return value; };
    mod = await bundleCareerSources({ root, tmpDir: temporary, stubPool: true });
  } finally { Math.random = originalRandom; }
  const input = poolInputs(mod), since = sinceInput(root);
  const derived = deriveCareerClubPool({ ...input, since });
  write('generator-inputs.json', { importDraws, realLeagues: input.realLeagues, handClubs: input.handClubs, partial: input.partial,
    rosterMeta: mod.CM_ROSTER_META, factsClubSince: read('scripts/data/soccerCareerFacts.json').clubSince,
    clubs: input.realLeagues.flatMap(league => league.clubs.map(name => ({ league: league.id, name, xi: input.xiOf(name),
      color: input.colorOf(name), rankable: input.rankable(name), country: input.cmCountryOf(league.id, name) ?? null }))) });
  write('generator-derived.json', derived);
  assert.deepEqual(derived.rows, value.canonical.generated, 'Real generator rows equal shipped canonical rows');
  assert.deepEqual(derived.ladder, value.canonical.ladder); assert.deepEqual(derived.poolSince, value.canonical.since);
  const rendered = Buffer.from(renderPoolFile(derived.rows, mod.CM_ROSTER_META, derived.ladder, derived.poolSince));
  assert.deepEqual(rendered, fs.readFileSync('src/data/soccerCareerClubPool.ts'), 'Actual generator renders shipped bytes without writing source');
  fs.writeFileSync(path.join(out, 'generator-rendered.ts'), rendered);
  assert.equal(derived.rows.length, mode === 'original' ? 307 : 326);

  const baseline = arg('--baseline', null);
  if (mode === 'fixed') assert(baseline, 'Fixed proof requires admitted original full references');
  if (baseline) {
    const prior = read(path.join(baseline, 'admission.json'));
    assert.equal(prior.status, 'original-admitted'); assert.deepEqual(prior.tests, tests);
    assert.deepEqual(reference, read(path.join(baseline, 'held-reference.json')), 'Full original historical, loaded-save, cup and world references held');
    for (const test of spec.cases) assert.deepEqual(raw[test.raw].importDraws, read(path.join(baseline, 'evidence', test.raw + '.json')).importDraws);
    const old = read(path.join(baseline, 'generator-derived.json'));
    assert.deepEqual(derived.rows.slice(0, 307), old.rows, 'Whole old generated prefix/order held');
    if (mode === 'original') {
      assert.deepEqual(derived, old, 'Repeated original generator exact');
      for (const test of spec.cases) assert.deepEqual(raw[test.raw], read(path.join(baseline, 'evidence', test.raw + '.json')), 'Repeated original complete RAW exact');
    }
  }
  report.assertions = assertions.map(test => ({ fullName: test.fullName, status: test.status }));
  report.evidence = Object.fromEntries(spec.cases.map(test => { const bytes = fs.readFileSync(path.join(out, 'evidence', test.raw + '.json')); return [test.raw, { bytes: bytes.length, sha256: sha(bytes) }]; }));
  report.generator = { rows: derived.rows.length, hand: value.canonical.hand.length, renderedSha256: sha(rendered), sourceWritten: false };
  report.copiedActualOmission = 'owned census rejection; actual result unchanged';
  report.status = mode + '-admitted';
} catch (error) { failure = error; report.error = String(error?.stack ?? error); }
finally {
  const after = inventory(), afterStatus = git('status', '--porcelain=v1', '--untracked-files=all');
  write('evidence-source-after.json', after);
  try { assert.deepEqual(after, before, 'Full tracked source/lock bytes held'); assert.equal(afterStatus, status); offline(); report.sourceAndOfflineHeld = true; }
  catch (error) { failure ??= error; report.status = 'incomplete'; report.holdError = String(error?.stack ?? error); }
  write('admission.json', report);
}
if (failure) throw failure;
console.log('SC_SEGUNDA_EVIDENCE_ADMITTED ' + mode + ' 7 cases; full references and actual read-only generator retained');
