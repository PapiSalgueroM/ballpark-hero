// Remote-only actual rival choice/Continue units, original Source and whole undo.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'This proof runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.SOCCER_RIVAL_WAGES_PROOF_OUT || 'career-rival-wage-artifacts/proof');
assert(!fs.existsSync(OUT), 'A fresh output directory preserves prior evidence');
fs.mkdirSync(OUT, { recursive: true });
const BASE = '4a5f759aeab6d0e7b8d29e55d3cd624c8ad20c54';
const ENGINE = 'src/lib/soccerCareerEngine.ts', TEST = 'src/test/soccerCareerContracts.test.ts';
const CURRENT_SHA = 'e37b73f25a17e4c63718430365de87cd1d5a001960ba8257ac674834e691dd90';
const ORIGINAL_SHA = '1a1c05feb120de043944ef45ec0880ed53e38f6b324e28889de2064fddd623ef';
const TEST_SHA = '7746509861c887dfa0f0cf56d62a37fa6386f0a0ea9702ee8d23ba92469e78d4';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (name, body) => {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  const full = path.join(OUT, name); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, bytes);
  return { path: name, bytes: bytes.length, sha256: hash(bytes) };
};
const errorText = error => String(error?.stack || error);
const oldTitles = [
  'quotes and signs shorter, lower veteran terms, including an expired stay renewal',
  'keeps an elite veteran raise and a strong veteran flat deal without using youth form',
  ...[0, 0.5, 0.99].map(value => `preserves younger terms and their single existing random draw at ${value}`),
  ...[21, 26].map(age => `completes the existing listed destination, reloads and acknowledges it once at age ${age}`),
  'applies the club move during the actual window transition without an accept action',
  'keeps the parent contract on a forced loan and returns there after the played loan season',
  'keeps releases, empty listings, voluntary offers and old loaded verdicts unchanged',
];
const cases = [
  ['young29', 100000, 100000, 2, '€100k/wk', '€100k/wk'],
  ['weak32', 90000, 100000, 2, '€90k/wk', '€100k/wk'],
  ['weak35', 80000, 100000, 2, '€80k/wk', '€100k/wk'],
  ['holding35', 100000, 100000, 2, '€100k/wk', '€100k/wk'],
  ['elite32', 110000, 100000, 2, '€110k/wk', '€100k/wk'],
  ['elite35', 105000, 100000, 2, '€105k/wk', '€100k/wk'],
  ['cameo35', 100000, 100000, 2, '€100k/wk', '€100k/wk'],
  ['latest-youth35', 80000, 100000, 2, '€80k/wk', '€100k/wk'],
  ['youth-only35', 85000, 100000, 2, '€85k/wk', '€100k/wk'],
  ['super35', 100000, 125000, 2.6, '€100k/wk', '€125k/wk'],
  ['shark35', 88000, 110000, 2.4, '€88k/wk', '€110k/wk'],
  ['cousin35', 76000, 95000, 2.15, '€76k/wk', '€95k/wk'],
  ['market35', 400, 500, 2, '€400/wk', '€500/wk'],
].map(([id, currentWage, originalWage, fees, currentLabel, originalLabel]) => ({
  id, currentWage, originalWage, fees, currentLabel, originalLabel,
  title: `prices the actual rival choice and Continue at ${id} without another draw`, marker: `SOCCER_RIVAL_WAGE_${id}`,
}));
const failing = cases.filter(row => row.currentWage !== row.originalWage);
const expectedTitles = [...oldTitles, ...cases.map(row => row.title)];
const operands = [
  { from: '        wage: Math.max(s.weeklyWage, wageForTier(club.tier, s.overall)),',
    to: '        wage: soccerTransferTerms(s, Math.max(s.weeklyWage, wageForTier(club.tier, s.overall)), 4).wage,' },
  { from: "     rate or your current wage if that is higher, their fee, your agent's\n     cut, and the armband stays behind. This summer's window is spent on\n     that move. */",
    to: "     rate or your current wage if higher, then the existing age/form policy.\n     Their fee and your agent's cut apply; the armband stays behind.\n     This summer's window is spent on that move. */" },
];
const report = { status: 'running', base: BASE, scope: 'Thirteen deliberate saved-boundary actual choice/Continue cases plus ten unchanged existing units. No natural-career or live-report attribution.',
  expectedTitles, cases, arms: [], transitions: [], comparisons: [], errors: [] };
const save = () => write('report.json', report);
const held = [ENGINE, TEST, 'src/lib/soccerCareerContracts.ts', 'src/lib/careerRivalryChoices.ts', 'src/lib/soccerCareerLife.ts',
  'src/lib/soccerCareerRole.ts', 'src/lib/soccerCareerMentor.ts', 'src/lib/soccerCareerTransferBrief.ts',
  'scripts/simSoccerContractMoves.mjs', 'scripts/simSoccerVeteranOffers.mjs', 'scripts/simCareerDilemmaTruth.mjs',
  'src/test/setup.ts', 'vitest.config.ts', 'package.json', 'package-lock.json', 'scripts/qa/soccerRivalWagesProof.mjs'];
const hold = () => held.map(file => { const bytes = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: bytes.length, sha256: hash(bytes) }; });
const enginePath = path.join(ROOT, ENGINE), temporary = `${enginePath}.rival-wages-${process.pid}.tmp`;
let currentRaw, originalRaw, temporaryOwned = false;
const replaceSource = (id, wanted, allowed) => {
  const actual = fs.readFileSync(enginePath), row = { id, status: 'attempted', before: write(`transitions/${id}/before.ts`, actual), wanted: write(`transitions/${id}/wanted.ts`, wanted) };
  report.transitions.push(row); save();
  assert(allowed.some(body => actual.equals(body)), 'Do not replace an unknown current Source body');
  row.changed = !actual.equals(wanted); assert(row.changed, 'Every original/undo transition changes the complete actual Source');
  assert(!fs.existsSync(temporary), 'Temporary Source path must be fresh');
  const descriptor = fs.openSync(temporary, 'wx'); temporaryOwned = true;
  try { fs.writeFileSync(descriptor, wanted); } finally { fs.closeSync(descriptor); }
  fs.renameSync(temporary, enginePath); temporaryOwned = false;
  const reopened = fs.readFileSync(enginePath); row.after = write(`transitions/${id}/after.ts`, reopened);
  assert(reopened.equals(wanted), 'Whole written Source must reopen byte-identically'); row.status = 'pass'; save();
};
const runArm = (id, expectedFailures) => {
  const folder = `arms/${id}`, observationDir = path.join(OUT, folder, 'observations'), resultPath = path.join(OUT, folder, 'vitest.json');
  const row = { id, status: 'running', expectedFailures, source: write(`${folder}/engine.ts`, fs.readFileSync(enginePath)), observations: [] };
  report.arms.push(row); save();
  const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--no-cache', '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=default', '--reporter=json', `--outputFile=${resultPath}`];
  row.command = { executable: process.execPath, args, cwd: ROOT, env: { SOCCER_RIVAL_WAGES_OUT: observationDir } }; save();
  const child = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, SOCCER_RIVAL_WAGES_OUT: observationDir }, maxBuffer: 100000000 });
  row.process = { exit: child.status, signal: child.signal, error: child.error ? errorText(child.error) : null,
    stdout: write(`${folder}/stdout.txt`, child.stdout || Buffer.alloc(0)), stderr: write(`${folder}/stderr.txt`, child.stderr || Buffer.alloc(0)) };
  if (fs.existsSync(resultPath)) row.vitest = write(`${folder}/vitest-retained.json`, fs.readFileSync(resultPath));
  if (fs.existsSync(observationDir)) for (const name of fs.readdirSync(observationDir).sort()) {
    const bytes = fs.readFileSync(path.join(observationDir, name)); row.observations.push({ name, file: { path: `${folder}/observations/${name}`, bytes: bytes.length, sha256: hash(bytes) } });
  }
  save(); assert(row.vitest, 'Complete Vitest result is required, including original failures');
  const result = JSON.parse(fs.readFileSync(resultPath)), assertions = result.testResults.flatMap(value => value.assertionResults);
  row.assertions = write(`${folder}/assertions.json`, assertions);
  row.actualFailures = assertions.filter(value => value.status === 'failed').map(value => value.title).sort(); save();
  assert.deepEqual(assertions.map(value => value.title).sort(), [...expectedTitles].sort());
  assert.equal(result.numTotalTests, 23); assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests, 0);
  assert.equal(result.numPassedTests, 23 - expectedFailures.length); assert.equal(result.numFailedTests, expectedFailures.length);
  assert(assertions.every(value => ['passed', 'failed'].includes(value.status)));
  assert.deepEqual(row.actualFailures, [...expectedFailures].sort());
  for (const value of assertions.filter(value => value.status === 'failed')) {
    const spec = cases.find(item => item.title === value.title); assert(spec);
    assert(value.failureMessages.length > 0 && value.failureMessages.every(message => message.includes(spec.marker)), 'Only the intended wage assertion can satisfy the original control');
  }
  assert.deepEqual(row.observations.map(value => value.name), cases.map(value => `${value.id}.json`).sort());
  row.actual = [];
  for (const spec of cases) {
    const actual = JSON.parse(fs.readFileSync(path.join(observationDir, `${spec.id}.json`))); row.actual.push(actual); save();
    assert.equal(actual.id, spec.id); assert.equal(actual.title, spec.title);
    assert.equal(actual.inputBefore, actual.inputAfter); assert.equal(actual.choiceBefore, actual.choiceAfter);
    const input = JSON.parse(actual.inputBefore), choice = JSON.parse(actual.choiceBefore), continued = JSON.parse(actual.result);
    assert.equal(choice.pendingRivalMove, 'Twente'); assert.equal(choice.pendingMoralDilemma, null);
    assert.equal(Math.round((choice.netWorth - input.netWorth) * 100), 1000); assert.equal(continued.netWorth, choice.netWorth);
    assert.equal(continued.currentClub, 'Twente'); assert.equal(continued.contractYearsLeft, 4); assert.equal(continued.phase, 'playing');
    assert.equal(continued.pendingRivalMove, null); assert.equal(continued.isClubCaptain, false); assert.equal(continued.captainClub, null);
    assert.equal(continued.agentFeesPaid, spec.fees); assert.deepEqual(continued.seasons, input.seasons);
    assert.equal(continued.weeklyWage, id === 'original' ? spec.originalWage : spec.currentWage);
    assert.deepEqual(actual.draws.map(value => value.value), [0, 0]);
    assert(actual.draws.every(value => typeof value.caller === 'string'));
    assert(actual.draws[0].caller.includes('wageForTier')); assert(actual.draws[1].caller.includes('realisticTransferFee'));
    assert(actual.fixtureDraws.length > 0 && actual.fixtureDraws.every(value => value.value === 0.7 && typeof value.caller === 'string'));
    const failed = expectedFailures.includes(spec.title); assert.equal(actual.completed, !failed);
    if (failed) assert(actual.failure?.classification === 'assertion' && actual.failure.message.includes(spec.marker));
    else assert.equal(actual.failure, null);
  }
  assert.equal(child.signal, null); assert.equal(row.process.error, null); assert.equal(child.status, expectedFailures.length ? 1 : 0);
  assert.equal(result.success, expectedFailures.length === 0);
  row.actualRows = write(`${folder}/all-observation-rows.json`, row.actual); delete row.actual;
  row.status = 'pass'; save(); console.log(`soccerRivalWagesProof arm=${id} assertions=23 traceRows=13 intendedFailures=${expectedFailures.length}`);
  return row;
};
const perform = (id, expectedFailures) => {
  try { return runArm(id, expectedFailures); } catch (error) {
    const row = report.arms.find(value => value.id === id); if (row) { row.status = 'fail'; row.error = errorText(error); }
    report.errors.push({ arm: id, error: errorText(error) }); save(); return row;
  }
};
try {
  assert(!process.env.NO_DOUBLE_SWAP, 'This proof requires the actual canonical engine module, without an alias control');
  report.sourceBefore = hold(); for (const row of report.sourceBefore) row.retained = write(`source/current/${row.file}`, fs.readFileSync(path.join(ROOT, row.file)));
  currentRaw = fs.readFileSync(enginePath); const current = currentRaw.toString('utf8').replace(/\r\n/g, '\n');
  assert.equal(hash(current), CURRENT_SHA); assert.equal(Buffer.byteLength(current), 544380);
  assert.equal(hash(fs.readFileSync(path.join(ROOT, TEST)).toString('utf8').replace(/\r\n/g, '\n')), TEST_SHA);
  const locked = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'))).packages['node_modules/vitest'];
  const installed = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/vitest/package.json')));
  report.vitestPackage = write('source/installed-vitest-package.json', fs.readFileSync(path.join(ROOT, 'node_modules/vitest/package.json')));
  assert.equal(installed.version, locked.version); assert.equal(installed.version, '3.2.7');
  const originalProcess = spawnSync('git', ['show', `${BASE}:${ENGINE}`], { cwd: ROOT, maxBuffer: 2000000 });
  originalRaw = originalProcess.stdout;
  report.original = { source: write('source/original-engine.ts', originalRaw || Buffer.alloc(0)), stderr: write('source/original-git.stderr', originalProcess.stderr || Buffer.alloc(0)),
    status: originalProcess.status, signal: originalProcess.signal, error: originalProcess.error ? errorText(originalProcess.error) : null };
  save(); assert.equal(originalProcess.status, 0); assert.equal(originalProcess.signal, null); assert.equal(report.original.error, null);
  assert.equal(originalProcess.stderr.length, 0); assert.equal(hash(originalRaw), ORIGINAL_SHA); assert.equal(originalRaw.length, 544316);
  let forward = originalRaw.toString('utf8');
  for (const operand of operands) { assert.equal(forward.split(operand.from).length - 1, 1); forward = forward.replace(operand.from, operand.to); }
  assert.equal(forward, current); let reverse = forward;
  for (const operand of [...operands].reverse()) { assert.equal(reverse.split(operand.to).length - 1, 1); reverse = reverse.replace(operand.to, operand.from); }
  assert.equal(reverse, originalRaw.toString('utf8')); report.sourceEdits = write('source/edits.json', operands); report.wholeSourceInverse = true; save();
  const byArm = {}; byArm.current = perform('current', []);
  replaceSource('original', originalRaw, [currentRaw]); byArm.original = perform('original', failing.map(value => value.title));
  replaceSource('whole-undo', currentRaw, [originalRaw]); byArm['whole-undo'] = perform('whole-undo', []);
  assert(report.arms.length === 3 && report.arms.every(value => value.status === 'pass'));
  const rows = id => JSON.parse(fs.readFileSync(path.join(OUT, byArm[id].actualRows.path)));
  const currentRows = rows('current'), originalRows = rows('original'), undoRows = rows('whole-undo');
  for (const spec of cases) {
    const now = currentRows.find(value => value.id === spec.id), old = originalRows.find(value => value.id === spec.id), undo = undoRows.find(value => value.id === spec.id);
    const comparison = { id: spec.id, status: 'running', current: byArm.current.actualRows, original: byArm.original.actualRows, undo: byArm['whole-undo'].actualRows };
    report.comparisons.push(comparison); save();
    assert.equal(now.inputBefore, old.inputBefore); assert.equal(now.inputBefore, undo.inputBefore);
    assert.equal(now.choiceBefore, old.choiceBefore); assert.equal(now.choiceBefore, undo.choiceBefore); assert.equal(now.result, undo.result);
    assert.deepEqual(now.fixtureDraws.map(value => value.value), old.fixtureDraws.map(value => value.value));
    assert.deepEqual(now.fixtureDraws.map(value => value.value), undo.fixtureDraws.map(value => value.value));
    const oldResult = JSON.parse(old.result), nowResult = JSON.parse(now.result), expected = JSON.parse(old.result);
    expected.weeklyWage = spec.currentWage; let changedSigningEvents = 0;
    expected.events = oldResult.events.map(line => {
      if (!line.startsWith('✍️ Signed with Twente ')) return line;
      assert.equal(line.split(`(4yr, ${spec.originalLabel})`).length - 1, 1);
      const changed = line.replace(`(4yr, ${spec.originalLabel})`, `(4yr, ${spec.currentLabel})`);
      if (changed !== line) changedSigningEvents++; return changed;
    });
    assert.equal(oldResult.events.filter(line => line.startsWith('✍️ Signed with Twente ')).length, 1);
    assert.equal(changedSigningEvents, spec.originalWage === spec.currentWage ? 0 : 1);
    assert.deepEqual(expected, nowResult, 'Every result key is held except the declared wage and exact wage-only signing label');
    comparison.currentWage = nowResult.weeklyWage; comparison.originalWage = oldResult.weeklyWage; comparison.changed = now.result !== old.result;
    assert.equal(comparison.changed, spec.originalWage !== spec.currentWage);
    comparison.rawSetupCallerEqual = JSON.stringify(now.fixtureDraws) === JSON.stringify(old.fixtureDraws);
    comparison.rawActionCallerEqual = JSON.stringify(now.draws) === JSON.stringify(old.draws);
    comparison.callerScope = 'Full raw callers retained; only ordered draw values/count and actual route names are asserted across Source arms. Raw caller strings are never normalized.';
    comparison.status = 'pass'; save();
  }
} catch (error) { report.errors.push({ stage: 'proof', error: errorText(error) }); }
finally {
  try {
    if (currentRaw && !fs.readFileSync(enginePath).equals(currentRaw)) replaceSource('finally-restoration', currentRaw, [originalRaw].filter(Boolean));
    if (temporaryOwned && fs.existsSync(temporary)) { report.partialTemporarySource = write('source/partial-temporary-source.bin', fs.readFileSync(temporary)); fs.unlinkSync(temporary); }
    report.sourceAfter = hold(); assert.deepEqual(report.sourceAfter, report.sourceBefore.map(({ retained, ...row }) => row), 'All actual Source bodies must be restored before exit');
    report.wholeRawSourceRestored = true;
  } catch (error) { report.errors.push({ stage: 'source-restoration', error: errorText(error) }); }
  report.status = report.errors.length === 0 && report.arms.length === 3 && report.arms.every(row => row.status === 'pass') && report.comparisons.length === 13 && report.comparisons.every(row => row.status === 'pass') && report.wholeRawSourceRestored ? 'pass' : 'fail';
  save();
}
if (report.status === 'pass') console.log('soccerRivalWagesProof PASS arms3 tests69 originalWageFailures10 traceRows39');
else { console.error(`soccerRivalWagesProof FAIL errors=${report.errors.length}`); process.exitCode = 1; }
