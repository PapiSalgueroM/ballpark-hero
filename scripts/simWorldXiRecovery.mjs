import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'src/pages/WorldXi.tsx', HELPER = 'src/lib/worldXiNationPools.ts';
const TEST = 'src/test/worldXiRecovery.test.tsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [PAGE, HELPER, TEST, 'src/data/gameContent/soccer1.ts', 'src/lib/worldXi.ts',
  'src/test/worldXiNationPools.test.ts', 'src/test/worldXiNations.test.tsx', 'src/test/worldXiRespins.test.tsx',
  'src/test/worldXiSummary.test.tsx', 'src/test/worldXiRosterDepth.test.ts', 'src/lib/positionFit.ts',
  'src/lib/squadShape.ts', 'src/data/wc2026Results.ts', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
for (const [file, expected] of [
  [PAGE, '4569d859387827a09d1009e1ff2efa31a96fd47ad7c717e6f3dd747495d09f2e'],
  [HELPER, '69b1e153b0f6b52d58008847d5d4267b3a0e321437b2b77b892302834e4d47e2'],
  [TEST, '963069474041fac3d15a8b6e314fa1950c14309ccff01a08895e14bfbd5797c5'],
  ['src/data/gameContent/soccer1.ts', 'be5f1f5be7bd0dfd031040427e7d42b113b8b72b438881864b72305e956b8640'],
  ['src/lib/worldXi.ts', 'fa46ab78100b777fd4ea834cb8c9ea673b9149edacdadc49f34918c1e58e0cbe'],
]) assert.equal(sha(held.get(file)), expected, file + ': exact qualified input');
const base = path.resolve(process.env.WORLD_XI_RECOVERY_OUT || os.tmpdir());
assert(!base.startsWith(path.join(root, 'src') + path.sep) && base !== path.join(root, 'src'));
fs.mkdirSync(base, { recursive: true });
const out = fs.mkdtempSync(path.join(base, 'dukb-world-xi-recovery-'));
const candidates = new Map([[PAGE, path.join(out, 'WorldXi.tsx')], [HELPER, path.join(out, 'worldXiNationPools.ts')]]);
const cases = ['WX_CURACAO:', 'WX_UNUSED_COUNT:', 'WX_FREE_RECOVERY:', 'WX_NO_ALTERNATIVE:', 'WX_FOCUS:'];
const results = [];
const receipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
function hold() { for (const [file, bytes] of held) assert.equal(sha(fs.readFileSync(path.join(root, file))), sha(bytes), file + ': actual source held'); }
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
for (const [file, candidate] of candidates) { fs.writeFileSync(candidate, held.get(file)); fs.writeFileSync(path.join(out, 'actual-' + path.basename(file)), held.get(file)); }
function run(name, target = null, selected = null) {
  const reportFile = path.join(out, name + '.vitest.json'), env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.US_BOARD_CONTROL_ALIAS; delete env.US_BOARD_CONTROL_FILE;
  if (target) { env.US_BOARD_CONTROL_ALIAS = '@/' + target.slice(4).replace(/\.tsx?$/, ''); env.US_BOARD_CONTROL_FILE = candidates.get(target); }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism',
    '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
  if (selected) args.push('--testNamePattern=' + selected);
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || ''); fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
  fs.writeFileSync(path.join(out, name + '.exit.json'), JSON.stringify({ status: child.status, signal: child.signal, error: child.error ? { name: child.error.name, message: child.error.message } : null }, null, 2));
  hold(); assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, selected ? 1 : 0);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const expected = selected ? { passed: 0, ownedFailures: 1, declaredSkips: 4 } : { passed: 5, ownedFailures: 0, declaredSkips: 0 };
  assert.equal(report.success, !selected); assert.equal(report.numTotalTests, 5);
  assert.equal(report.numPassedTests, expected.passed); assert.equal(report.numFailedTests, expected.ownedFailures);
  assert.equal(report.numPendingTests, expected.declaredSkips); assert.equal(report.numTodoTests, 0);
  assert.equal(report.testResults.length, 1); assert(report.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEST));
  const rows = report.testResults[0].assertionResults, seen = new Set(); assert.equal(rows.length, 5);
  for (const row of rows) {
    const identities = cases.filter(id => row.title.startsWith(id)); assert.equal(identities.length, 1);
    const id = identities[0]; assert(!seen.has(id)); seen.add(id);
    const failed = selected === id, skipped = !!selected && !failed;
    assert.equal(row.status, failed ? 'failed' : skipped ? 'skipped' : 'passed');
    assert.equal(row.failureMessages.length, failed ? 1 : 0);
    if (failed) {
      assert.match(row.failureMessages[0], /AssertionError:/);
      if (name === 'free-spends-budget') assert(row.failureMessages[0].includes('WX_RECOVERY_PAID_BUDGET_MUST_STAY_ZERO'));
      if (name === 'whole-old-page') assert(row.failureMessages[0].includes('WORLD_XI_FREE_RECOVERY_MISSING'));
    }
  }
  const runtimeCounters = { numUnhandledErrors: report.numUnhandledErrors ?? null, numRuntimeErrorTestSuites: report.numRuntimeErrorTestSuites ?? null };
  for (const count of Object.values(runtimeCounters)) if (count !== null) { assert.equal(typeof count, 'number'); assert.equal(count, 0); }
  for (const errors of [report.errors, report.unhandledErrors]) if (Array.isArray(errors)) assert.equal(errors.length, 0);
  const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test((child.stdout || '') + '\n' + (child.stderr || ''));
  assert.equal(detectedRuntimeError, false);
  const row = { name, rawExit: child.status, ...expected, runtimeCounters, runtimeCounterCompleteness: Object.values(runtimeCounters).some(count => count === null) ? 'UNKNOWN' : 'REPORTED',
    detectedRuntimeError, rawErrors: report.errors ?? null, rawUnhandledErrors: report.unhandledErrors ?? null };
  results.push(row); fs.writeFileSync(path.join(out, name + '.summary.json'), JSON.stringify(row, null, 2));
  console.log(name + ': ' + row.passed + ' passes, ' + row.ownedFailures + ' owned assertions, ' + row.declaredSkips + ' declared skips.');
}
const executed = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
function replaceUnique(source, before, after) {
  assert.notEqual(before, after); assert.equal(source.split(before).length - 1, 1); assert.equal(executed(source).split(before).length - 1, 1);
  return source.replace(before, after);
}
function control(name, target, edits, selected) {
  const original = held.get(target).toString('utf8'); let changed = original; const spans = [];
  for (const [before, after] of edits) { const offset = changed.indexOf(before); changed = replaceUnique(changed, before, after); spans.push({ offset, before, after }); }
  assert.notEqual(changed, original); let inverse = changed;
  for (const { offset, before, after } of [...spans].reverse()) { assert.equal(inverse.slice(offset, offset + after.length), after); inverse = inverse.slice(0, offset) + before + inverse.slice(offset + after.length); }
  assert.equal(inverse, original); const candidate = candidates.get(target); fs.writeFileSync(candidate, changed);
  fs.writeFileSync(path.join(out, name + '-' + path.basename(target)), changed);
  fs.writeFileSync(path.join(out, name + '.edit.json'), JSON.stringify({ target, spans, originalSha256: sha(Buffer.from(original)), changedSha256: sha(Buffer.from(changed)), inverseSha256: sha(Buffer.from(inverse)) }, null, 2));
  try { run(name, target, selected); } finally { fs.writeFileSync(candidate, held.get(target)); assert.equal(sha(fs.readFileSync(candidate)), sha(held.get(target))); hold(); }
}
try {
  run('current'); run('healthy-helper-copy', HELPER); run('healthy-page-copy', PAGE);
  const oldPage = spawnSync('git', ['cat-file', 'blob', 'f1d4155192611287d3c1f8dcdf96c6890c9d04d1'], { cwd: root });
  assert.ifError(oldPage.error); assert.equal(oldPage.signal, null); assert.equal(oldPage.status, 0);
  assert.equal(createHash('sha1').update(`blob ${oldPage.stdout.length}\0`).update(oldPage.stdout).digest('hex'), 'f1d4155192611287d3c1f8dcdf96c6890c9d04d1');
  assert.equal(sha(oldPage.stdout), 'ab177001f66c5d62a67454075ef1b4f84326e682b40334fb0dfd55e3da77af83');
  assert.notEqual(sha(oldPage.stdout), sha(held.get(PAGE))); fs.writeFileSync(path.join(out, 'whole-old-page.tsx'), oldPage.stdout);
  fs.writeFileSync(candidates.get(PAGE), oldPage.stdout);
  try { run('whole-old-page', PAGE, cases[2]); }
  finally { fs.writeFileSync(candidates.get(PAGE), held.get(PAGE)); assert.equal(sha(fs.readFileSync(candidates.get(PAGE))), sha(held.get(PAGE))); hold(); }
  control('curacao-alias', HELPER, [["    case 'Curacao': return 'Curaçao';\n", '']], cases[0]);
  control('distinct-name-count', PAGE, [['const names = new Set<string>();', 'const names: string[] = [];'], ['names.add(player.name);', 'names.push(player.name);'], ['return names.size;', 'return names.length;']], cases[1]);
  control('query-limited-count', PAGE, [['return names.size;', 'return suggestCountryPlayers(selectedData, country, query, usedNames).filter(player => fitsSlot(player, slot)).length;'], ['}, [selectedData, slot, country, usedNames]);', '}, [selectedData, slot, country, usedNames, query]);']], cases[1]);
  control('used-name-count', PAGE, [['if (!usedNames.has(player.name) && fitsSlot(player, slot)) names.add(player.name);', 'if (fitsSlot(player, slot)) names.add(player.name);']], cases[2]);
  const selection = '    const next = respinSlotCountry(formation, { ...selectedData, countries: available }, slotIndex, countries);';
  control('free-replacement-noop', PAGE, [[selection, '    const next = country;']], cases[2]);
  control('used-recovery-candidate', PAGE, [['.some(player => !usedNames.has(player.name) && fitsSlot(player, slot)));', '.some(player => fitsSlot(player, slot)));']], cases[3]);
  control('free-spends-budget', PAGE, [[selection, selection + '\n    setRespinsLeft(n => n - 1);']], cases[2]);
  control('free-resets-timer', PAGE, [[selection, selection + '\n    setTimeLeft(timerMode.seconds);']], cases[2]);
  control('free-changes-other-country', PAGE, [[selection, selection + '\n    countries[0] = available[0];']], cases[2]);
  const refusal = "      setFeedback('No unused nation has a fitting player left. Your squad stays as it is.');";
  control('refusal-changes-board', PAGE, [[refusal, '      setCountries(previous => previous.map((c, i) => i === slotIndex ? selectedData.countries[0] : c));\n' + refusal]], cases[3]);
  control('focus-scroll', PAGE, [['inputRef.current?.focus({ preventScroll: true });', 'inputRef.current?.focus();']], cases[4]);
  run('restored');
  const totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures, declaredSkips: sum.declaredSkips + row.declaredSkips }), { passed: 0, ownedFailures: 0, declaredSkips: 0 });
  assert.equal(results.length, 16); assert.deepEqual(totals, { passed: 20, ownedFailures: 12, declaredSkips: 48 });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ scope: 'Actual World XI alias, count, exhausted-slot recovery and native focus only. No route, roster-currentness or whole-game readiness claim.', childRuns: 16, totalExecuted: 32, totals, results }, null, 2));
  console.log('simWorldXiRecovery: 20 passes, 12 owned assertions, 48 declared skips; 32 executed outcomes.');
} finally {
  hold(); fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(receipts(), null, 2));
  for (const [file, candidate] of candidates) assert.equal(sha(fs.readFileSync(candidate)), sha(held.get(file)), 'Physical source copy restored');
  console.log('World XI recovery evidence: ' + out);
}
