import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SOURCE = 'src/lib/soccerCareerExtraCups.ts';
const TEST = 'src/test/soccerCommunityShieldMatch.test.ts';
const SUITE = 'Community Shield actual pure match';
const TITLES = [
  'SC_SHIELD_MATCH_NORMAL: retains the observed normal result and merges the played contribution once',
  'SC_SHIELD_MATCH_PENS: retains actual sudden-death kicks separately from match goals and contribution',
  'SC_SHIELD_MATCH_INDEPENDENCE: keeps the same team outcome when player context changes',
  'SC_SHIELD_MATCH_KEEPER: gives a selected goalkeeper no goals and no clean sheet after conceding',
  'SC_SHIELD_MATCH_AVAILABILITY: records unknown availability bench and nonentrant outcomes without appearances',
  'SC_SHIELD_MATCH_GLOBAL: leaves the global random stream and all actual input fields untouched',
];
const CLEAN = ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'SC_EXTRA_CUPS_ENGINE',
  'COMPLETION_HOOK', 'OWNED_TIMEOUTS_HOOK', 'TYCOON_AWAY_CONTROL', 'CONQUEST_NBA_HOOK', 'CONQUEST_NBA_BOARD',
  'POLL_FIXTURES', 'DAILY_RECORD_CONTROL', 'TYCOON_ROOMS_PAGE', 'TYCOON_LOADS_STADIUM_HOOK', 'TYCOON_LOADS_ACADEMY_HOOK',
  'TYCOON_LOADS_STADIUM_LIB', 'TYCOON_LOADS_ACADEMY_LIB', 'TYCOON_PITCH_COMPONENT', 'TYCOON_PACKS_REWARDS', 'TYCOON_PACKS_PANEL'];
const sha = value => createHash('sha256').update(value).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const faults = [
  { id: 'normal-player-goal', case: 'SC_SHIELD_MATCH_NORMAL', marker: 'SC_SHIELD_MATCH_NORMAL',
    before: 'for (let i = 0; i < score[side]; i++) if (playerRng() < share * (0.6 + quality * 0.6)) goals++;',
    after: 'for (let i = 0; i < score[side]; i++) if (playerRng() < share * (0.6 + quality * 0.6)) goals += 0;' },
  { id: 'fixed-shootout', case: 'SC_SHIELD_MATCH_PENS', marker: 'SC_SHIELD_MATCH_PENS',
    before: 'const penalties = score[0] === score[1] ? shootout(rng) : undefined;',
    after: 'const penalties = score[0] === score[1] ? [5, 4] as [number, number] : undefined;' },
  { id: 'team-uses-player-role', case: 'SC_SHIELD_MATCH_INDEPENDENCE', marker: 'SC_SHIELD_MATCH_INDEPENDENCE',
    before: 'const score: [number, number] = [poissonGoals(clamp(1.32 + d, 0.25, 3.4), rng), poissonGoals(clamp(1.32 - d, 0.25, 3.4), rng)];',
    after: 'const score: [number, number] = [poissonGoals(clamp(1.32 + d, 0.25, 3.4), rng), poissonGoals(clamp(1.32 - d, 0.25, 3.4), rng)];\n  if (input.position === \'GK\') score[0] += 1;' },
  { id: 'keeper-goal', case: 'SC_SHIELD_MATCH_KEEPER', marker: 'SC_SHIELD_MATCH_KEEPER',
    before: "if (selected) {\n    const group = input.position === 'GK' ? 'GK'",
    after: "if (selected) {\n    if (input.position === 'GK') goals = 1;\n    const group = input.position === 'GK' ? 'GK'" },
  { id: 'ignore-availability', case: 'SC_SHIELD_MATCH_AVAILABILITY', marker: 'SC_SHIELD_MATCH_AVAILABILITY',
    before: "const selected = availability === 'available' && playerRng() < clamp(input.selectionChance, 0, 1);",
    after: 'const selected = playerRng() < clamp(input.selectionChance, 0, 1);' },
  { id: 'global-team-draw', case: 'SC_SHIELD_MATCH_GLOBAL', marker: 'SC_SHIELD_MATCH_GLOBAL',
    before: 'const rng = keyedRng(key), d = (strengths[0] - strengths[1]) / 2;',
    after: 'const rng = Math.random, d = (strengths[0] - strengths[1]) / 2;' },
];

async function main() {
  const root = process.cwd(), tmp = path.join(root, 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const out = process.env.SC_SHIELD_MATCH_OUT ? path.resolve(process.env.SC_SHIELD_MATCH_OUT) : fs.mkdtempSync(path.join(tmp, 'sc-shield-match-'));
  assert.notEqual(out, root); assert.ok(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Evidence directory must be fresh');
  fs.mkdirSync(out, { recursive: true });
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const paths = [SOURCE, TEST, 'src/lib/keyedRng.ts', 'src/lib/soccerCareerLeagueWorld.ts', 'src/lib/soccerCareerContinental.ts',
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
  const opening = 'export function playCommunityShield(input: CommunityShieldOpeningInput): CommunityShieldResult | null {';
  const following = 'function pair(v: unknown, max = Number.MAX_SAFE_INTEGER): v is [number, number] {';
  const englishStart = text.indexOf(opening);
  assert.ok(englishStart >= 0 && text.indexOf(opening, englishStart + opening.length) < 0, 'Unique actual English generator');
  const englishEnd = text.indexOf(following, englishStart + opening.length);
  assert.ok(englishEnd > englishStart && text.indexOf(following, englishEnd + following.length) < 0, 'Unique following English generator boundary');
  const english = text.slice(englishStart, englishEnd);
  const copy = path.join(root, 'src/lib/__control_shield_match_' + process.pid + '.ts');
  assert.equal(fs.existsSync(copy), false, 'Owned physical source copy must not exist');
  const results = [], controlReceipts = [];
  let written = null, primary = null;
  const secondary = [];
  function put(body) { fs.writeFileSync(copy, body); written = Buffer.from(body); assert.deepEqual(fs.readFileSync(copy), written); }
  function run(name, fault = null, useCopy = false) {
    const env = { ...process.env, NODE_OPTIONS: '', SIM_NETWORK: 'offline' }; for (const key of CLEAN) delete env[key];
    if (useCopy) { env.US_BOARD_CONTROL_ALIAS = '@/lib/soccerCareerExtraCups'; env.US_BOARD_CONTROL_FILE = copy; }
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
    assert.equal(detectedRuntimeError, false, 'Setup or runtime failure is never an owned match assertion');
    assert.equal(report.success, !fault);
    for (const [key, value] of Object.entries({ numTotalTests: 6, numPassedTests: fault ? 0 : 6,
      numFailedTests: fault ? 1 : 0, numPendingTests: fault ? 5 : 0, numTodoTests: 0 })) assert.equal(report[key], value, key);
    assert.equal(report.testResults.length, 1);
    const suite = report.testResults[0]; assert.equal(relative(suite.name), TEST); assert.equal(suite.message, '');
    assert.equal(suite.status, fault ? 'failed' : 'passed'); assert.equal(suite.assertionResults.length, 6);
    assert.deepEqual(suite.assertionResults.map(row => row.fullName).sort(), TITLES.map(title => SUITE + ' ' + title).sort());
    for (const row of suite.assertionResults) {
      assert.deepEqual(row.ancestorTitles, [SUITE]); assert.equal(row.fullName, SUITE + ' ' + row.title);
      if (fault && row.title.startsWith(fault.case + ':')) {
        assert.equal(row.status, 'failed'); assert.equal(row.failureMessages.length, 1);
        const first = row.failureMessages[0].replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).find(line => line.trim())?.trim();
        assert.equal(first?.startsWith('AssertionError: ' + fault.marker + ':'), true, 'Owned primary match assertion: ' + fault.id);
      } else if (fault) { assert.ok(['pending', 'skipped'].includes(row.status)); assert.equal(row.failureMessages.length, 0); }
      else { assert.equal(row.status, 'passed'); assert.equal(row.failureMessages.length, 0); }
    }
    assert.equal(sha(fs.readFileSync(reportFile)), sha(reportBytes));
    const result = { name, passed: fault ? 0 : 6, ownedFailures: fault ? 1 : 0, declaredUnselectedSkips: fault ? 5 : 0,
      executed: fault ? 1 : 6, rawExit: child.status, rawReportSha256: sha(reportBytes),
      sourceCopySha256: copyBefore ? sha(copyBefore) : null, counters, rawErrors, detectedRuntimeError,
      runtimeCounterCompleteness: Object.values(counters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED',
      identities: suite.assertionResults.map(row => ({ fullName: row.fullName, status: row.status })) };
    write(path.join(out, name + '.summary.json'), result); results.push(result);
  }
  try {
    run('current'); put(original); run('healthy-copy', null, true);
    for (const fault of faults) {
      const before = fault.before, after = fault.after;
      const localOffset = english.indexOf(before);
      assert.ok(localOffset >= 0 && english.indexOf(before, localOffset + before.length) < 0, 'Unique executable English anchor: ' + fault.id);
      const offset = englishStart + localOffset;
      assert.equal(text.slice(offset, offset + before.length), before);
      const changedEnglish = english.slice(0, localOffset) + after + english.slice(localOffset + before.length);
      assert.equal(changedEnglish.indexOf(after), localOffset); assert.equal(changedEnglish.indexOf(after, localOffset + after.length), -1);
      const changedText = text.slice(0, englishStart) + changedEnglish + text.slice(englishEnd);
      assert.equal(changedText.slice(0, englishStart), text.slice(0, englishStart), 'Control keeps the complete preceding source');
      assert.equal(changedText.slice(englishStart + changedEnglish.length), text.slice(englishEnd), 'Control keeps the complete following source including German code');
      const changed = encode(changedText);
      assert.notEqual(sha(changed), sha(original), 'Source control must change physical source bytes');
      const inverse = encode(changedText.slice(0, offset) + before + changedText.slice(offset + after.length));
      assert.deepEqual(inverse, original, 'Whole source inverse must return exact original bytes');
      put(changed);
      fs.writeFileSync(path.join(out, fault.id + '.source.ts'), changed);
      run(fault.id, fault, true);
      put(original);
      const receipt = { id: fault.id, case: fault.case, primaryMarker: fault.marker, offset, offsetUnits: 'UTF-16 normalized source',
        sourceRange: { function: 'playCommunityShield', start: englishStart, end: englishEnd, localOffset },
        lineEnding: ending === '\r\n' ? 'CRLF' : 'LF', before, after,
        original: { bytes: original.length, sha256: sha(original) }, changed: { bytes: changed.length, sha256: sha(changed) },
        inverse: { bytes: inverse.length, sha256: sha(inverse) }, physicalRestoreSha256: sha(fs.readFileSync(copy)) };
      write(path.join(out, fault.id + '.edit.json'), receipt); controlReceipts.push(receipt);
    }
    run('restored-copy', null, true);
    assert.equal(results.length, 9); assert.equal(controlReceipts.length, 6);
    const totals = results.reduce((a, r) => ({ passed: a.passed + r.passed, ownedFailures: a.ownedFailures + r.ownedFailures,
      declaredUnselectedSkips: a.declaredUnselectedSkips + r.declaredUnselectedSkips, executed: a.executed + r.executed }),
      { passed: 0, ownedFailures: 0, declaredUnselectedSkips: 0, executed: 0 });
    assert.deepEqual(totals, { passed: 18, ownedFailures: 6, declaredUnselectedSkips: 30, executed: 24 });
    write(path.join(out, 'summary.json'), { scope: 'Six pure match regressions and six effective physical source faults only. No annual integration, UI or balance-rate credit.',
      children: 9, results, totals, physicalControls: controlReceipts.length });
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
  assert.equal(secondary.length, 0, 'Match harness cleanup or input hold failed');
  console.log('SC_SHIELD_MATCH: 9 children, 18 healthy outcomes, 6 primary-owned source faults, 30 declared unselected skips, 24 executed. Evidence: ' + out);
}
main().catch(error => { console.error(error); process.exitCode = 1; });