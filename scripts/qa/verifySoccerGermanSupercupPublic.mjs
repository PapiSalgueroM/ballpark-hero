import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';


const EXPECTED = [
  {
    "file": "src/test/soccerGermanSupercupPublicBoundaries.probe.test.ts",
    "fullName": "Soccer Career German public boundaries SC_GERMAN_PUBLIC_SEVERE: keeps a selected opening before a controlled later severe injury"
  },
  {
    "file": "src/test/soccerGermanSupercupPublicBoundaries.probe.test.ts",
    "fullName": "Soccer Career German public boundaries SC_GERMAN_PUBLIC_BANNED: keeps a whole-year interruption free of opening metadata and credit"
  },
  {
    "file": "src/test/soccerGermanSupercupPublicBoundaries.probe.test.ts",
    "fullName": "Soccer Career German public boundaries SC_GERMAN_PUBLIC_STALE: refuses the unchanged old receipt at the next public advance"
  }
];
const FAULTS = [
  {
    "id": "omit-severe-contribution",
    "target": "engine",
    "range": null,
    "before": "      if (germanMatch) {\n        if (germanMatch.player.apps === 1) germanMatch.annualRating = injuryRow.apps > 0 ? injuryRow.rating : 0;\n        Object.assign(injuryRow, germanSupercupSeasonStats(injuryRow, germanMatch));\n      }",
    "after": "      if (germanMatch) void germanMatch;",
    "file": "src/test/soccerGermanSupercupPublicBoundaries.probe.test.ts",
    "case": "SC_GERMAN_PUBLIC_SEVERE",
    "marker": "SC_GERMAN_PUBLIC_SEVERE_CONTRIBUTION"
  },
  {
    "id": "attach-interrupted-field",
    "target": "engine",
    "range": null,
    "before": "club: \"BANNED\", clubCountry: \"\", clubTier: 99,",
    "after": "club: \"BANNED\", clubCountry: \"\", clubTier: 99, germanSupercup: null,",
    "file": "src/test/soccerGermanSupercupPublicBoundaries.probe.test.ts",
    "case": "SC_GERMAN_PUBLIC_BANNED",
    "marker": "SC_GERMAN_PUBLIC_BANNED_RESULT"
  },
  {
    "id": "ignore-stale-edition",
    "target": "helper",
    "range": "playGermanSupercup",
    "before": "  const q = germanQualification(input.qualification, input.eventYear), strengths = input.teamStrengths;",
    "after": "  const q = germanQualification(input.qualification), strengths = input.teamStrengths;",
    "file": "src/test/soccerGermanSupercupPublicBoundaries.probe.test.ts",
    "case": "SC_GERMAN_PUBLIC_STALE",
    "marker": "SC_GERMAN_PUBLIC_STALE_RESULT"
  }
];

const ENGINE = 'src/lib/soccerCareerEngine.ts', HELPER = 'src/lib/soccerCareerExtraCups.ts';
const FILES = [...new Set(EXPECTED.map(row => row.file))].sort();
const sha = body => createHash('sha256').update(body).digest('hex');
const pin = body => ({ bytes: body.length, sha256: sha(body) });
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const clean = text => text.replace(/\x1b\[[0-9;]*m/g, '');
const noComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
const CLEAN = ['NO_DOUBLE_SWAP', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'SC_EXTRA_CUPS_ENGINE',
  'SC_GERMAN_SUPERCUP_EVIDENCE', 'SC_GERMAN_PUBLIC_EVIDENCE', 'COMPLETION_HOOK', 'OWNED_TIMEOUTS_HOOK', 'TYCOON_AWAY_CONTROL',
  'CONQUEST_NBA_HOOK', 'CONQUEST_NBA_BOARD', 'POLL_FIXTURES', 'DAILY_RECORD_CONTROL', 'TYCOON_ROOMS_PAGE',
  'TYCOON_LOADS_STADIUM_HOOK', 'TYCOON_LOADS_ACADEMY_HOOK', 'TYCOON_LOADS_STADIUM_LIB',
  'TYCOON_LOADS_ACADEMY_LIB', 'TYCOON_PITCH_COMPONENT', 'TYCOON_PACKS_REWARDS', 'TYCOON_PACKS_PANEL',
  'GP_BOSS_PAGE_FILE', 'GP_BOSS_HOOK_FILE', 'GP_BOSS_ENGINE_FILE', 'FORCE_COLOR'];
const ENDPOINTS = {
  playGermanSupercup: 'readGermanSupercup',
};
function unique(text, needle, name) {
  const offset = text.indexOf(needle);
  assert(offset >= 0 && text.indexOf(needle, offset + needle.length) < 0, 'Unique actual source: ' + name);
  assert(noComments(text).includes(needle), 'Executable source anchor: ' + name);
  return offset;
}
function normalize(file, original, actual) {
  const raw = original.toString('utf8');
  assert.deepEqual(Buffer.from(raw), original, 'Actual UTF8 round trip: ' + file);
  const ending = raw.includes('\r\n') ? '\r\n' : '\n', withoutPairs = raw.replace(/\r\n/g, '');
  assert.equal(withoutPairs.includes('\r'), false, 'Lone CR refused: ' + file);
  if (ending === '\r\n') assert.equal(withoutPairs.includes('\n'), false, 'Mixed source endings refused: ' + file);
  assert.equal(actual, raw.replace(/\r\n/g, '\n'), 'Actual normalized matching is byte-bound: ' + file);
  return { text: actual, ending, encode: value => Buffer.from(ending === '\r\n' ? value.replace(/\n/g, '\r\n') : value) };
}
function mutate(source, fault) {
  let start = 0, end = source.text.length;
  if (fault.range) {
    const following = ENDPOINTS[fault.range];
    assert.equal(typeof following, 'string', 'Explicit function endpoint is required');
    start = unique(source.text, 'export function ' + fault.range + '(', fault.range);
    end = unique(source.text, 'export function ' + following + '(', following);
    assert(end > start && start >= source.englishChars, 'German-only function range');
  }
  const region = source.text.slice(start, end), localOffset = unique(region, fault.before, fault.id);
  const offset = start + localOffset;
  const changed = source.text.slice(0, offset) + fault.after + source.text.slice(offset + fault.before.length);
  assert.equal(changed.slice(0, offset), source.text.slice(0, offset));
  assert.equal(changed.slice(offset + fault.after.length), source.text.slice(offset + fault.before.length));
  const inverse = changed.slice(0, offset) + fault.before + changed.slice(offset + fault.after.length);
  assert.equal(inverse, source.text, 'Whole normalized source inverse: ' + fault.id);
  const changedBytes = source.encode(changed), inverseBytes = source.encode(inverse);
  assert.notEqual(sha(changedBytes), sha(source.original), 'Control changes actual bytes: ' + fault.id);
  assert.deepEqual(inverseBytes, source.original, 'Whole raw source inverse: ' + fault.id);
  if (fault.target === 'helper') assert.deepEqual(changedBytes.subarray(0, source.englishBytes), source.englishPrefix, 'Complete English prefix stays held');
  return { changedBytes, inverseBytes, receipt: { id: fault.id, target: fault.target, function: fault.range ?? null,
    range: { start, end }, offset, offsetUnits: 'UTF16 normalized source', before: fault.before, after: fault.after,
    lineEnding: source.ending === '\r\n' ? 'CRLF' : 'LF', original: pin(source.original),
    changed: pin(changedBytes), inverse: pin(inverseBytes) } };
}
function filesUnder(dir, base = dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const full = path.join(dir, entry.name);
    if (dir === base && entry.name === '.vite') continue;
    if (entry.isDirectory()) result.push(...filesUnder(full, base));
    else if (entry.isFile()) result.push(full);
    else assert(entry.isSymbolicLink(), 'Only regular dependency files and package links are expected');
  }
  return result;
}
function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' }, maxBuffer: 64 * 1024 * 1024 });
  assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(result.status, 0, 'Read-only Git metadata: ' + args.join(' '));
  return result.stdout;
}
async function retain(root, files) {
  const held = new Map();
  for (const file of files) {
    const rawBytes = await fs.promises.readFile(path.join(root, file));
    held.set(file, Buffer.from(rawBytes));
  }
  return held;
}
function holds(root, held) {
  const rows = [];
  for (const [file, expected] of held) {
    let actual;
    { const rawBytes = fs.readFileSync(path.join(root, file)); actual = Buffer.from(rawBytes); }
    assert.deepEqual(actual, expected, 'Held actual input: ' + file);
    rows.push({ file, ...pin(expected) });
  }
  return rows;
}
function readOwned(file, expected, label) {
  let actual;
  { const rawBytes = fs.readFileSync(file); actual = Buffer.from(rawBytes); }
  assert.deepEqual(actual, expected, label);
}
function runtime(report, raw) {
  const counters = Object.fromEntries(['numUnhandledErrors', 'numRuntimeErrorTestSuites', 'numRuntimeErrorTests'].map(key => [key, report[key] ?? null]));
  const errors = Object.fromEntries(['errors', 'unhandledErrors'].map(key => [key, report[key] ?? null]));
  for (const value of Object.values(counters)) if (value !== null) { assert.equal(typeof value, 'number'); assert.equal(value, 0); }
  for (const value of Object.values(errors)) if (value !== null) { assert(Array.isArray(value)); assert.deepEqual(value, []); }
  const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled|ERR_MODULE_NOT_FOUND|Failed to load url|Cannot find module|SyntaxError:|ReferenceError:|TypeError:)/i.test(raw);
  assert.equal(detectedRuntimeError, false, 'Setup/runtime errors are never owned controls');
  return { counters, errors, detectedRuntimeError, counterCompleteness: Object.values(counters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED' };
}
function primary(row, fault) {
  assert.equal(row.failureMessages.length, 1);
  const message = clean(row.failureMessages[0]), lines = message.split(/\r?\n/), first = lines.find(line => line.trim())?.trim();
  assert(first?.startsWith('AssertionError: '), 'A native primary AssertionError is required');
  assert.equal(typeof fault.marker, 'string');
  assert(first.startsWith('AssertionError: ' + fault.marker + ':'), 'Exact primary marker: ' + fault.id);
  return { first, assertionSite: null };
}

async function main() {
  const root = process.cwd(), tmp = path.join(root, 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const out = process.env.SC_GERMAN_PUBLIC_OUT ? path.resolve(process.env.SC_GERMAN_PUBLIC_OUT) : fs.mkdtempSync(path.join(tmp, 'sc-german-public-'));
  assert(out.startsWith(tmp + path.sep), 'Evidence must stay inside the ignored workspace tmp directory');
  assert(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Evidence output must be fresh');
  fs.mkdirSync(out, { recursive: true });
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const copies = { engine: path.join(root, 'src/lib/__control_german_public_engine_' + process.pid + '.ts'),
    helper: path.join(root, 'src/lib/__control_german_public_extra_' + process.pid + '.ts') };
  const written = new Map(), results = [], controls = [], secondary = [];
  let primaryError = null, sourceHeld = null, dependencyHeld = null, sourceMembers = null, dependencyMembers = null, inputs = null;
  const memberNames = () => git(root, ['ls-files', '-z']).split('\0').filter(Boolean).sort();
  const dependencyNames = () => filesUnder(path.join(root, 'node_modules')).map(relative).sort();
  function copyHolds() {
    for (const [target, expected] of written) readOwned(copies[target], expected, 'Owned copy stays held: ' + target);
  }
  function put(target, bytes) {
    fs.writeFileSync(copies[target], bytes, { flag: written.has(target) ? 'w' : 'wx' });
    written.set(target, Buffer.from(bytes));
    readOwned(copies[target], written.get(target), 'Physical copy write: ' + target);
  }
  try {
    assert.equal(git(root, ['ls-files', '--others', '--exclude-standard']), '', 'No pre-existing untracked source');
    git(root, ['check-ignore', '--quiet', relative(out)]);
    for (const file of Object.values(copies)) assert.equal(fs.existsSync(file), false, 'Owned physical source must be absent');
    assert.equal(EXPECTED.length, 3); assert.equal(FILES.length, 1); assert.equal(FAULTS.length, 3);
    assert.equal(new Set(EXPECTED.map(row => row.file + '\0' + row.fullName)).size, 3);
    sourceMembers = memberNames(); sourceHeld = await retain(root, sourceMembers);
    json(path.join(out, 'source-before.json'), holds(root, sourceHeld));
    dependencyMembers = dependencyNames(); dependencyHeld = await retain(root, dependencyMembers);
    assert(sourceHeld.has(ENGINE) && sourceHeld.has(HELPER), 'Actual product sources must be tracked');
    const currentFile = relative(fileURLToPath(import.meta.url));
    inputs = new Map([ENGINE, HELPER, ...FILES, 'vitest.config.ts', 'src/test/setup.ts', 'tsconfig.app.json',
      'package.json', 'package-lock.json', 'scripts/lib/offlineTransport.cjs', 'scripts/qa/fixtures/soccerGermanSupercup.public-boundaries.json', currentFile].map(file => {
      assert(sourceHeld.has(file), 'Actual tracked harness input: ' + file);
      return [file, sourceHeld.get(file)];
    }));
    json(path.join(out, 'dependency-before.json'), holds(root, dependencyHeld));
    json(path.join(out, 'members-before.json'), { source: sourceMembers, dependencies: dependencyMembers });
    assert.equal(sha(Buffer.from(inputs.get("src/test/soccerGermanSupercupPublicBoundaries.probe.test.ts").toString('utf8').replace(/\r\n/g, '\n'))),
      "9246edd54776a93f5ffe6b9ab02e589f468e99928ea51364faf62bdaa03a686e", 'Exact temporary public-boundary test body');
    for (const fault of FAULTS) assert.equal(EXPECTED.filter(row => row.file === fault.file && row.fullName.includes(' ' + fault.case + ':')).length, 1);
    const engineText = fs.readFileSync(path.join(root, ENGINE), 'utf8').replace(/\r\n/g, '\n');
    const helperText = fs.readFileSync(path.join(root, HELPER), 'utf8').replace(/\r\n/g, '\n');
    const source = {
      engine: { ...normalize(ENGINE, sourceHeld.get(ENGINE), engineText), original: sourceHeld.get(ENGINE) },
      helper: { ...normalize(HELPER, sourceHeld.get(HELPER), helperText), original: sourceHeld.get(HELPER) },
    };
    const englishText = source.helper.text.slice(0, 16110), englishCanonical = Buffer.from(englishText);
    assert.equal(englishCanonical.length, 16110);
    assert.equal(sha(englishCanonical), 'bc3c8b79f2e910a2ff730f216e1aaa7fb532139d663b45e956d43c9a92539934', 'Exact held English helper prefix');
    source.helper.englishChars = englishText.length;
    source.helper.englishPrefix = source.helper.encode(englishText);
    source.helper.englishBytes = source.helper.englishPrefix.length;
    for (const [target, value] of Object.entries(source)) fs.writeFileSync(path.join(out, target + '.original.ts'), value.original, { flag: 'wx' });
    const aliases = Object.fromEntries([
      ...['@/lib/soccerCareerExtraCups', './soccerCareerExtraCups', '../soccerCareerExtraCups'].map(id => [id, copies.helper]),
      ...['@/lib/soccerCareerEngine', './soccerCareerEngine'].map(id => [id, copies.engine]),
    ]);
    json(path.join(out, 'alias-map.json'), aliases);
    function run(name, fault = null, useCopies = false) {
      holds(root, inputs); if (useCopies) copyHolds();
      const env = { ...process.env, NODE_OPTIONS: '', SIM_NETWORK: 'offline' };
      for (const key of CLEAN) delete env[key];
      if (useCopies) env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
      env.SC_GERMAN_PUBLIC_EVIDENCE = path.join(out, name + '.evidence');
      env.SIM_OFFLINE_RECEIPT = path.join(out, name + '.transport');
      fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
      const reportFile = path.join(out, name + '.vitest.json');
      assert.equal(fs.existsSync(reportFile), false);
      const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'),
        'run', ...FILES, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json',
        '--outputFile=' + reportFile];
      if (fault) args.push('--testNamePattern=' + fault.case + ':');
      json(path.join(out, name + '.argv.json'), [process.execPath, ...args]);
      const beforeCopies = useCopies ? Object.fromEntries([...written].map(([target, body]) => [target, pin(body)])) : null;
      const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
      fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '', { flag: 'wx' });
      fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '', { flag: 'wx' });
      fs.writeFileSync(path.join(out, name + '.exit'), String(child.status) + '\n', { flag: 'wx' });
      json(path.join(out, name + '.process.json'), { status: child.status, signal: child.signal,
        error: child.error ? { name: child.error.name, message: child.error.message } : null });
      assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, fault ? 1 : 0);
      assert.equal(fs.statSync(env.SIM_OFFLINE_RECEIPT).size, 0);
      holds(root, inputs); if (useCopies) copyHolds();
      let reportBytes;
      { const rawEvidenceBytes = fs.readFileSync(reportFile); reportBytes = Buffer.from(rawEvidenceBytes); }
      const report = JSON.parse(reportBytes);
      const runtimeFields = runtime(report, (child.stdout || '') + '\n' + (child.stderr || ''));
      assert.equal(report.success, !fault);
      for (const [key, value] of Object.entries({ numTotalTests: 3, numPassedTests: fault ? 0 : 3,
        numFailedTests: fault ? 1 : 0, numPendingTests: fault ? 2 : 0, numTodoTests: 0 })) assert.equal(report[key], value, key);
      assert.equal(report.testResults.length, 1, 'One actual temporary file record, not descriptive reporter suite counts');
      const rows = report.testResults.flatMap(suite => {
        const file = relative(suite.name); assert.equal(suite.message, '');
        assert(FILES.includes(file)); assert.equal(suite.status, fault && file === fault.file ? 'failed' : 'passed');
        return suite.assertionResults.map(row => ({ file, ...row }));
      });
      const identities = rows.map(row => row.file + '\0' + row.fullName).sort();
      assert.deepEqual(identities, EXPECTED.map(row => row.file + '\0' + row.fullName).sort());
      let ownedPrimary = null;
      for (const row of rows) {
        const selected = fault && row.file === fault.file && row.fullName.includes(' ' + fault.case + ':');
        if (selected) { assert.equal(row.status, 'failed'); ownedPrimary = primary(row, fault); }
        else if (fault) { assert(['pending', 'skipped'].includes(row.status)); assert.deepEqual(row.failureMessages, []); }
        else { assert.equal(row.status, 'passed'); assert.deepEqual(row.failureMessages, []); }
      }
      if (fault) assert(ownedPrimary, 'Exactly the selected actual assertion must fail');
      readOwned(reportFile, reportBytes, 'Raw report must stay held during classification');
      const result = { name, selected: fault?.case ?? null, passed: fault ? 0 : 3, ownedFailures: fault ? 1 : 0,
        declaredUnselectedSkips: fault ? 2 : 0, executed: fault ? 1 : 3, rawExit: child.status,
        rawReport: pin(reportBytes), sourceCopies: beforeCopies, primary: ownedPrimary, ...runtimeFields,
        identities: rows.map(row => ({ file: row.file, fullName: row.fullName, status: row.status })) };
      json(path.join(out, name + '.summary.json'), result); results.push(result);
    }
    run('current');
    put('engine', source.engine.original); put('helper', source.helper.original);
    for (const fault of FAULTS) {
      const mutation = mutate(source[fault.target], fault);
      fs.writeFileSync(path.join(out, fault.id + '.source.ts'), mutation.changedBytes, { flag: 'wx' });
      json(path.join(out, fault.id + '.construction.json'), mutation.receipt);
      put(fault.target, mutation.changedBytes);
      run(fault.id, fault, true);
      put(fault.target, source[fault.target].original);
      const receipt = { ...mutation.receipt, primary: results.at(-1).primary,
        physicalRestore: pin(written.get(fault.target)), fullInverse: true };
      assert.deepEqual(written.get(fault.target), mutation.inverseBytes);
      json(path.join(out, fault.id + '.edit.json'), receipt); controls.push(receipt);
    }
    run('restored-copy', null, true);
    assert.equal(results.length, 5); assert.equal(controls.length, 3);
    const totals = results.reduce((a, row) => ({ passed: a.passed + row.passed, ownedFailures: a.ownedFailures + row.ownedFailures,
      declaredUnselectedSkips: a.declaredUnselectedSkips + row.declaredUnselectedSkips, executed: a.executed + row.executed }),
      { passed: 0, ownedFailures: 0, declaredUnselectedSkips: 0, executed: 0 });
    assert.deepEqual(totals, { passed: 6, ownedFailures: 3, declaredUnselectedSkips: 6, executed: 9 });
    json(path.join(out, 'summary.json'), { scope: 'Three temporary public-boundary diagnostics with three physical source controls. No natural injury/ban/transfer, full-suite, build or App credit.',
      children: 5, actualFiles: 1, physicalControls: 3, totals, results });
  } catch (error) { primaryError = error; }
  finally {
    for (const [target, expected] of written) {
      try { readOwned(copies[target], expected, 'Remove only exact owned last-written bytes'); fs.unlinkSync(copies[target]); }
      catch (error) { secondary.push({ stage: 'copy-cleanup-' + target, name: error.name, message: error.message }); }
    }
    try { if (sourceHeld) json(path.join(out, 'source-after.json'), holds(root, sourceHeld)); }
    catch (error) { secondary.push({ stage: 'source-holds', name: error.name, message: error.message }); }
    try { if (dependencyHeld) json(path.join(out, 'dependency-after.json'), holds(root, dependencyHeld)); }
    catch (error) { secondary.push({ stage: 'dependency-holds', name: error.name, message: error.message }); }
    try {
      const afterSource = memberNames(), afterDependencies = dependencyNames();
      json(path.join(out, 'members-after.json'), { source: afterSource, dependencies: afterDependencies });
      if (sourceMembers) assert.deepEqual(afterSource, sourceMembers, 'Source membership held');
      if (dependencyMembers) assert.deepEqual(afterDependencies, dependencyMembers, 'Dependency membership held');
      assert.equal(git(root, ['ls-files', '--others', '--exclude-standard']), '', 'No untracked source after cleanup');
      assert.equal(git(root, ['diff', '--exit-code', 'HEAD']), '', 'No tracked source diff');
    } catch (error) { secondary.push({ stage: 'membership-diff', name: error.name, message: error.message }); }
    try { json(path.join(out, 'receipt.json'), { complete: !primaryError && secondary.length === 0, completedChildren: results.length,
      completedControls: controls.length, removedCopies: Object.fromEntries(Object.entries(copies).map(([target, file]) => [target, !fs.existsSync(file)])),
      primary: primaryError ? { name: primaryError.name, message: primaryError.message, stack: primaryError.stack } : null, secondary }); }
    catch (error) { secondary.push({ stage: 'receipt', name: error.name, message: error.message }); }
  }
  if (primaryError) throw primaryError;
  assert.deepEqual(secondary, [], 'Public-boundary cleanup or immutable-input holds failed');
  console.log('SC_GERMAN_PUBLIC: 5 children, 6 healthy, 3 owned, 6 unselected, 9 executed. Evidence: ' + out);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
