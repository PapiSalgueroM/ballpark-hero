import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SOURCE = 'src/lib/soccerCareerEngine.ts';
const TEST = 'src/test/soccerCommunityShieldSevere.test.ts';
const SUITE = 'Soccer Career Community Shield severe opening';
const TITLES = ['SC_SHIELD_SEVERE_CONTRIBUTION: retains the selected opening before a controlled later severe injury'];
const CLEAN = ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'SC_EXTRA_CUPS_ENGINE',
  'COMPLETION_HOOK', 'OWNED_TIMEOUTS_HOOK', 'TYCOON_AWAY_CONTROL', 'CONQUEST_NBA_HOOK', 'CONQUEST_NBA_BOARD',
  'POLL_FIXTURES', 'DAILY_RECORD_CONTROL', 'TYCOON_ROOMS_PAGE', 'TYCOON_LOADS_STADIUM_HOOK', 'TYCOON_LOADS_ACADEMY_HOOK',
  'TYCOON_LOADS_STADIUM_LIB', 'TYCOON_LOADS_ACADEMY_LIB', 'TYCOON_PITCH_COMPONENT', 'TYCOON_PACKS_REWARDS', 'TYCOON_PACKS_PANEL'];
const sha = value => createHash('sha256').update(value).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const faults = [{
  id: 'omit-severe-merge', case: 'SC_SHIELD_SEVERE_CONTRIBUTION', marker: 'SC_SHIELD_SEVERE_CONTRIBUTION_MISSING',
  before: '      Object.assign(injuryRow, communityShieldSeasonStats(injuryRow, shieldMatch));\n',
  after: '',
}];

async function main() {
  const root = process.cwd(), tmp = path.join(root, 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const out = process.env.SC_SHIELD_SEVERE_OUT ? path.resolve(process.env.SC_SHIELD_SEVERE_OUT) : fs.mkdtempSync(path.join(tmp, 'sc-shield-severe-'));
  assert.notEqual(out, root); assert.ok(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Evidence directory must be fresh');
  fs.mkdirSync(out, { recursive: true });
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const paths = [SOURCE, TEST, 'src/lib/soccerCareerExtraCups.ts', 'src/lib/careerEras.ts', 'src/lib/soccerCareerSave.ts',
    'scripts/data/careerLeagueWorldSaves1100.json', 'src/lib/keyedRng.ts', 'src/lib/soccerCareerLeagueWorld.ts', 'src/lib/soccerCareerContinental.ts',
    'vitest.config.ts', 'package.json', 'package-lock.json', 'tsconfig.app.json', 'scripts/lib/offlineTransport.cjs', relative(fileURLToPath(import.meta.url))];
  const held = new Map();
  for (const file of paths) {
    const rawBytes = await fs.promises.readFile(path.join(root, file));
    held.set(file, Buffer.from(rawBytes));
  }
  const holds = () => {
    const receipt = [];
    for (const [file, expected] of held) {
      const actual = fs.readFileSync(path.join(root, file)); assert.deepEqual(actual, expected, 'Held actual input: ' + file);
      receipt.push({ file, bytes: actual.length, sha256: sha(actual) });
    }
    return receipt;
  };
  write(path.join(out, 'source-before.json'), holds());
  const original = held.get(SOURCE), rawText = original.toString('utf8');
  assert.deepEqual(Buffer.from(rawText), original, 'Source must round-trip as UTF-8');
  const ending = rawText.includes('\r\n') ? '\r\n' : '\n';
  const withoutPairs = rawText.replace(/\r\n/g, '');
  assert.equal(withoutPairs.includes('\r'), false, 'Lone CR source endings are not supported');
  if (ending === '\r\n') assert.equal(withoutPairs.includes('\n'), false, 'Mixed source endings are refused');
  const text = fs.readFileSync(path.join(root, SOURCE), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(text, rawText.replace(/\r\n/g, '\n'), 'Normalized matching text must bind to the held original');
  const encode = normalized => Buffer.from(ending === '\r\n' ? normalized.replace(/\n/g, '\r\n') : normalized);
  const copy = path.join(root, 'src/lib/__control_shield_severe_' + process.pid + '.ts');
  assert.equal(fs.existsSync(copy), false, 'Owned physical source copy must not exist');
  const results = [], controlReceipts = [];
  let written = null, primary = null;
  const secondary = [];
  function put(body) { fs.writeFileSync(copy, body); written = Buffer.from(body); assert.deepEqual(fs.readFileSync(copy), written); }
  function run(name, fault = null, useCopy = false) {
    const env = { ...process.env, NODE_OPTIONS: '', SIM_NETWORK: 'offline' }; for (const key of CLEAN) delete env[key];
    if (useCopy) env.SC_EXTRA_CUPS_ENGINE = copy;
    env.SC_SHIELD_SEVERE_EVIDENCE = path.join(out, name + '.evidence.json');
    assert.equal(fs.existsSync(env.SC_SHIELD_SEVERE_EVIDENCE), false);
    env.SIM_OFFLINE_RECEIPT = path.join(out, name + '.transport');
    fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
    const reportFile = path.join(out, name + '.vitest.json'); assert.equal(fs.existsSync(reportFile), false);
    const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'),
      'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
    if (fault) args.push('--testNamePattern=' + fault.case + ':');
    write(path.join(out, name + '.argv.json'), [process.execPath, ...args]);
    const copyBefore = useCopy ? fs.readFileSync(copy) : null;
    const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
    fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '');
    fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
    fs.writeFileSync(path.join(out, name + '.exit'), String(child.status) + '\n');
    write(path.join(out, name + '.process.json'), { status: child.status, signal: child.signal,
      error: child.error ? { name: child.error.name, message: child.error.message } : null });
    assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, fault ? 1 : 0);
    assert.equal(fs.statSync(env.SIM_OFFLINE_RECEIPT).size, 0, 'Child transport receipt must be empty');
    holds(); if (useCopy) assert.deepEqual(fs.readFileSync(copy), copyBefore, 'Physical source copy must stay held during child');
    const reportBytes = fs.readFileSync(reportFile), report = JSON.parse(reportBytes);
    const counters = Object.fromEntries(['numUnhandledErrors', 'numRuntimeErrorTestSuites', 'numRuntimeErrorTests'].map(key => [key, report[key] ?? null]));
    for (const value of Object.values(counters)) if (value !== null) { assert.equal(typeof value, 'number'); assert.equal(value, 0); }
    const rawErrors = Object.fromEntries(['errors', 'unhandledErrors'].map(key => [key, report[key] ?? null]));
    for (const value of Object.values(rawErrors)) if (value !== null) { assert.ok(Array.isArray(value)); assert.equal(value.length, 0); }
    const raw = (child.stdout || '') + '\n' + (child.stderr || '');
    const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled|ERR_MODULE_NOT_FOUND|Failed to load url|Cannot find module|SyntaxError:|ReferenceError:|TypeError:)/i.test(raw)
      || Object.values(counters).some(value => typeof value === 'number' && value > 0) || Object.values(rawErrors).some(value => Array.isArray(value) && value.length > 0);
    assert.equal(detectedRuntimeError, false, 'Setup or runtime failure is never an owned severe contribution assertion');
    assert.equal(report.success, !fault);
    for (const [key, value] of Object.entries({ numTotalTests: 1, numPassedTests: fault ? 0 : 1,
      numFailedTests: fault ? 1 : 0, numPendingTests: 0, numTodoTests: 0 })) assert.equal(report[key], value, key);
    assert.equal(report.testResults.length, 1);
    const suite = report.testResults[0]; assert.equal(relative(suite.name), TEST); assert.equal(suite.message, '');
    assert.equal(suite.status, fault ? 'failed' : 'passed'); assert.equal(suite.assertionResults.length, 1);
    assert.deepEqual(suite.assertionResults.map(row => row.fullName).sort(), TITLES.map(title => SUITE + ' ' + title).sort());
    for (const row of suite.assertionResults) {
      assert.deepEqual(row.ancestorTitles, [SUITE]); assert.equal(row.fullName, SUITE + ' ' + row.title);
      if (fault && row.title.startsWith(fault.case + ':')) {
        assert.equal(row.status, 'failed'); assert.equal(row.failureMessages.length, 1);
        const first = row.failureMessages[0].replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).find(line => line.trim())?.trim();
        assert.equal(first?.startsWith('AssertionError: ' + fault.marker + ':'), true, 'Owned primary severe contribution assertion: ' + fault.id);
      } else if (fault) { assert.ok(['pending', 'skipped'].includes(row.status)); assert.equal(row.failureMessages.length, 0); }
      else { assert.equal(row.status, 'passed'); assert.equal(row.failureMessages.length, 0); }
    }
    assert.equal(sha(fs.readFileSync(reportFile)), sha(reportBytes));
    let evidenceBytes;
    {
      const rawEvidenceBytes = fs.readFileSync(env.SC_SHIELD_SEVERE_EVIDENCE);
      evidenceBytes = Buffer.from(rawEvidenceBytes);
    }
    const evidence = JSON.parse(evidenceBytes);
    assert.equal(evidence.calls.length, 4);
    assert.deepEqual(evidence.calls.map(row => row.label), ['repair', 'actual-close', 'opening-present', 'opening-absent']);
    for (const call of evidence.calls) { assert.ok(call.before && call.after && Array.isArray(call.draws)); assert.equal(call.error, undefined); }
    assert.equal(evidence.primary === null, !fault);
    const result = { name, passed: fault ? 0 : 1, ownedFailures: fault ? 1 : 0, declaredUnselectedSkips: 0,
      executed: 1, evidenceSha256: sha(evidenceBytes), rawExit: child.status, rawReportSha256: sha(reportBytes),
      sourceCopySha256: copyBefore ? sha(copyBefore) : null, counters, rawErrors, detectedRuntimeError,
      runtimeCounterCompleteness: Object.values(counters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED',
      identities: suite.assertionResults.map(row => ({ fullName: row.fullName, status: row.status })) };
    write(path.join(out, name + '.summary.json'), result); results.push(result);
  }
  try {
    run('current'); put(original); run('healthy-copy', null, true);
    for (const fault of faults) {
      const before = fault.before, after = fault.after;
      const offset = text.indexOf(before); assert.ok(offset >= 0 && text.indexOf(before, offset + 1) < 0, 'Unique executable anchor: ' + fault.id);
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
      assert.equal(code.split(before).length, 2, 'Source anchor must occur once in executed code');
      const changedText = text.slice(0, offset) + after + text.slice(offset + before.length);
      assert.equal(after, '', 'This control only omits the one severe merge');
      const changed = encode(changedText);
      assert.notEqual(sha(changed), sha(original), 'Source control must change physical source bytes');
      const inverse = encode(changedText.slice(0, offset) + before + changedText.slice(offset + after.length));
      assert.deepEqual(inverse, original, 'Whole source inverse must return exact original bytes');
      put(changed);
      fs.writeFileSync(path.join(out, fault.id + '.source.ts'), changed);
      run(fault.id, fault, true);
      put(original);
      const receipt = { id: fault.id, case: fault.case, primaryMarker: fault.marker, offset, offsetUnits: 'UTF-16 normalized source',
        lineEnding: ending === '\r\n' ? 'CRLF' : 'LF', before, after,
        original: { bytes: original.length, sha256: sha(original) }, changed: { bytes: changed.length, sha256: sha(changed) },
        inverse: { bytes: inverse.length, sha256: sha(inverse) }, physicalRestoreSha256: sha(fs.readFileSync(copy)) };
      write(path.join(out, fault.id + '.edit.json'), receipt); controlReceipts.push(receipt);
    }
    run('restored-copy', null, true);
    assert.equal(results.length, 4); assert.equal(controlReceipts.length, 1);
    const totals = results.reduce((a, r) => ({ passed: a.passed + r.passed, ownedFailures: a.ownedFailures + r.ownedFailures,
      declaredUnselectedSkips: a.declaredUnselectedSkips + r.declaredUnselectedSkips, executed: a.executed + r.executed }),
      { passed: 0, ownedFailures: 0, declaredUnselectedSkips: 0, executed: 0 });
    assert.deepEqual(totals, { passed: 3, ownedFailures: 1, declaredUnselectedSkips: 0, executed: 4 });
    write(path.join(out, 'summary.json'), { scope: 'One selected opening followed by a controlled severe injury, with one effective physical severe-merge omission. No natural injury, rate, UI or full-career claim.',
      children: 4, results, totals, physicalControls: controlReceipts.length });
  } catch (error) { primary = error; }
  finally {
    try { if (fs.existsSync(copy)) { assert.deepEqual(fs.readFileSync(copy), written, 'Only the owned source copy may be removed'); fs.unlinkSync(copy); } }
    catch (error) { secondary.push({ stage: 'copy-cleanup', name: error.name, message: error.message }); }
    try { write(path.join(out, 'source-after.json'), holds()); }
    catch (error) { secondary.push({ stage: 'input-holds', name: error.name, message: error.message }); }
    try { write(path.join(out, 'receipt.json'), { complete: !primary && secondary.length === 0,
      completedChildren: results.length, removedSourceCopy: !fs.existsSync(copy),
      primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary }); }
    catch (error) { secondary.push({ stage: 'receipt', name: error.name, message: error.message }); }
  }
  if (primary) throw primary;
  assert.equal(secondary.length, 0, 'Severe harness cleanup or input hold failed');
  console.log('SC_SHIELD_SEVERE: 4 children, 3 healthy outcomes, 1 primary-owned severe-merge fault, 0 skips, 4 executed. Evidence: ' + out);
}
main().catch(error => { console.error(error); process.exitCode = 1; });