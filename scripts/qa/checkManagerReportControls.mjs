/* Remote Actions only. Each fault edits actual source, runs the full custom
   promotion test file, and restores the original bytes before the next fault.
   REPORT selects the evidence directory. No expected-red run is healthy credit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Run Manager source controls remotely in Actions');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Temporary source mutations require a remote Actions checkout');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.REPORT || path.join(ROOT, 'manager-report-artifacts/controls'));
const TEST = 'src/lib/clubManagerCustomPromotion.test.ts';
const ENGINE = 'src/lib/clubManager.ts', CALENDAR = 'src/lib/clubManagerCalendar.ts';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2));
fs.mkdirSync(OUT, { recursive: true });
const tracked = execFileSync('git', ['ls-files', '--', 'src', 'package.json', 'package-lock.json',
  'vitest.config.ts', 'scripts/qa/checkManagerReportControls.mjs'], { cwd: ROOT, encoding: 'utf8' })
  .trim().split(/\r?\n/).filter(Boolean).sort();
assert(tracked.includes(TEST) && tracked.includes(ENGINE) && tracked.includes(CALENDAR), 'Actual test and app source are tracked');
const manifest = () => tracked.map(file => {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  return { file, bytes: bytes.length, sha256: sha(bytes) };
});
const originals = new Map([ENGINE, CALENDAR].map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
const before = manifest();
write('source-before.json', before);

const titles = {
  promote: 'promotes created champions in every configured pair while preserving all real clubs',
  ordinary: 'promotes an ordinary champion through the same existing slots',
  relegate: 'relegates a promoted created club without replacing a second real club',
  legacy: 'migrates an unseeded legacy custom first summer without inventing history',
  exempt: 'keeps historic and unpaired created-club exemptions',
  reload: 'restores the promoted custom league and board after another slot registered overrides',
  summer: 'restores the real proxy on summer departure and removes the departed name from Europe',
  now: 'restores the real proxy when leaving a created European club during a season',
  domestic: 'keeps qualified non-English created clubs apart from their domestic opponents in Europe',
};
const movementFailures = [titles.promote, titles.relegate, titles.legacy, titles.reload, titles.summer];
const faults = [
  { id: 'freeze-custom-movement', failures: movementFailures, edits: [{ file: ENGINE,
    from: '  if (prev.customClub && !customUsesPyramid(prev.customClub, prev.eraId)) return { overrides: carried, lines: [] };',
    to: '  if (prev.customClub) return { overrides: carried, lines: [] };' }] },
  { id: 'stale-saved-custom-league', failures: movementFailures, edits: [{ file: ENGINE,
    from: '      ? Object.entries(pr.overrides ?? {}).find(([, clubs]) => clubs.includes(career.customClub!.replacedClub))?.[0] ?? career.customClub.leagueId',
    to: '      ? career.customClub.leagueId' }] },
  { id: 'missing-reload-memberships', failures: [titles.reload], edits: [{ file: ENGINE,
    from: '    registerLeagueOverrides(parsed.leagueOverrides ?? null);', to: '' }] },
  { id: 'departed-created-name-in-europe', failures: [titles.summer, titles.now], edits: [
    { file: ENGINE, from: '  if (moving) nextUclField = customExitUclField(career, nextUclField);', to: '' },
    { file: CALENDAR, from: '      uclField: career.uclField ? customExitUclField(career, career.uclField) : null,',
      to: '      uclField: career.uclField ?? null,' },
  ] },
  { id: 'created-domestic-european-draw', failures: [titles.domestic], edits: [{ file: ENGINE,
    scope: 'function initUclGroup(qualified: boolean, myClub: string, eraId?: string, field?: string[]): UclGroupState | null {',
    from: 'new Set(myLeague.clubs)', to: 'new Set(leagueOf(myClub).clubs)', matches: 2 }] },
];

function run(name) {
  const folder = path.join(OUT, name);
  fs.mkdirSync(folder, { recursive: true });
  const json = path.join(folder, 'vitest.json');
  const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST,
    '--reporter=verbose', '--reporter=json', `--outputFile.json=${json}`, '--maxWorkers=1', '--no-file-parallelism'];
  write(`${name}-command.json`, { executable: process.execPath, args, cwd: ROOT });
  const stdout = fs.openSync(path.join(folder, 'stdout.log'), 'w');
  const stderr = fs.openSync(path.join(folder, 'stderr.log'), 'w');
  let child;
  try {
    child = spawnSync(process.execPath, args, { cwd: ROOT, env: process.env,
      stdio: ['ignore', stdout, stderr], timeout: 300000 });
  } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
  const processResult = { status: child.status, signal: child.signal, error: child.error ? String(child.error) : null };
  fs.writeFileSync(path.join(folder, 'process.json'), JSON.stringify(processResult, null, 2));
  assert.equal(processResult.error, null, `${name}: no process or timeout error`);
  assert.equal(child.signal, null, `${name}: no process signal`);
  assert(fs.existsSync(json), `${name}: complete Vitest JSON exists`);
  return { child, report: JSON.parse(fs.readFileSync(json, 'utf8')) };
}

function outcomes(report, name) {
  assert.equal(report.testResults.length, 1, `${name}: exactly the intended test file ran`);
  assert(report.testResults[0].name.replaceAll('\\', '/').endsWith(TEST), `${name}: actual target file`);
  assert.equal(report.numPendingTests, 0, `${name}: no skipped tests`);
  assert.equal(report.numTodoTests ?? 0, 0, `${name}: no todo outcomes`);
  assert.equal(report.numPendingTestSuites, 0, `${name}: no skipped files`);
  if (report.numRuntimeErrorTestSuites !== undefined) assert.equal(report.numRuntimeErrorTestSuites, 0, `${name}: no setup suite errors`);
  if (Array.isArray(report.unhandledErrors)) assert.equal(report.unhandledErrors.length, 0, `${name}: no unhandled runtime errors`);
  const rows = report.testResults[0].assertionResults;
  assert(rows.length > 0, `${name}: actual named assertions ran`);
  assert.equal(report.numTotalTests, rows.length, `${name}: every outcome is retained`);
  assert.equal(new Set(rows.map(row => row.title)).size, rows.length, `${name}: unique test names`);
  assert(rows.every(row => ['passed', 'failed'].includes(row.status)), `${name}: no empty or skipped outcomes`);
  for (const row of rows.filter(row => row.status === 'failed')) {
    assert(row.failureMessages.length > 0 && row.failureMessages.every(message => /(^|\n)AssertionError:/.test(message)),
      `${name}: ${row.title} failed an assertion, not setup or runtime`);
  }
  return rows;
}

const results = [];
let healthyTitles = [], error = null;
try {
  const healthy = run('healthy'), rows = outcomes(healthy.report, 'healthy');
  assert.equal(healthy.child.status, 0, 'Healthy source exits zero');
  assert.equal(healthy.report.success, true, 'Healthy source is green');
  assert.equal(healthy.report.numFailedTests, 0, 'Healthy source has no failed outcomes');
  assert(rows.every(row => row.status === 'passed'), 'All healthy named outcomes pass');
  healthyTitles = rows.map(row => row.title).sort();
  for (const title of Object.values(titles)) assert(healthyTitles.includes(title), `The exact expected case exists: ${title}`);
  assert.deepEqual(manifest(), before, 'Healthy execution leaves source byte-identical');

  for (const fault of faults) {
    const result = { id: fault.id, expectedFailures: [...fault.failures].sort(), mutations: [], ok: false };
    try {
      assert.deepEqual(manifest(), before, `${fault.id}: original source before mutation`);
      for (const edit of fault.edits) {
        const file = path.join(ROOT, edit.file), original = fs.readFileSync(file);
        const text = original.toString('utf8');
        let start = 0, end = text.length;
        if (edit.scope) {
          assert.equal(text.split(edit.scope).length, 2, `${fault.id}: unique actual function scope`);
          start = text.indexOf(edit.scope);
          end = text.indexOf('\n}', start) + 2;
          assert(end > start + edit.scope.length, `${fault.id}: actual function closing brace`);
        }
        const source = text.slice(start, end), matches = edit.matches ?? 1;
        assert.equal(source.split(edit.from).length, matches + 1, `${fault.id}: exact actual source needles in ${edit.file}`);
        const changed = Buffer.from(text.slice(0, start) + source.split(edit.from).join(edit.to) + text.slice(end));
        assert.notEqual(sha(changed), sha(original), `${fault.id}: source mutation is effective`);
        fs.writeFileSync(file, changed);
        result.mutations.push({ file: edit.file, needleMatches: matches, scope: edit.scope ?? null,
          before: sha(original), mutated: sha(changed), from: edit.from, to: edit.to });
      }
      assert.equal(result.mutations.length, fault.edits.length, `${fault.id}: all requested seams changed`);
      const mutated = manifest();
      write(`${fault.id}-source-mutated.json`, mutated);
      const tested = run(fault.id), rows = outcomes(tested.report, fault.id);
      assert.equal(tested.child.status, 1, `${fault.id}: expected assertion-failure exit`);
      assert.equal(tested.report.success, false, `${fault.id}: the effective fault is red`);
      assert.deepEqual(rows.map(row => row.title).sort(), healthyTitles, `${fault.id}: every healthy case ran again`);
      result.actualFailures = rows.filter(row => row.status === 'failed').map(row => row.title).sort();
      result.actualPasses = rows.filter(row => row.status === 'passed').map(row => row.title).sort();
      assert.deepEqual(result.actualFailures, result.expectedFailures, `${fault.id}: exact expected named assertions fail`);
      assert.deepEqual(result.actualPasses, healthyTitles.filter(title => !fault.failures.includes(title)), `${fault.id}: all unaffected outcomes pass`);
      for (const title of [titles.ordinary, titles.exempt]) assert(result.actualPasses.includes(title), `${fault.id}: protected ordinary/exempt case passed`);
      assert.deepEqual(manifest(), mutated, `${fault.id}: execution used and preserved the mutated source`);
      result.ok = true;
    } catch (caught) { result.error = String(caught.stack || caught); }
    finally {
      for (const [file, original] of originals) fs.writeFileSync(path.join(ROOT, file), original);
      const restored = manifest();
      write(`${fault.id}-source-restored.json`, restored);
      if (JSON.stringify(restored) !== JSON.stringify(before)) { result.ok = false; result.restoreError = 'Source differs after restoration'; }
      write(`${fault.id}-result.json`, result);
      results.push(result);
      console.log(`${fault.id}: ${result.ok ? 'FIRED' : 'FAIL'}, ${result.actualFailures?.length ?? 0} failed named assertions`);
    }
  }
} catch (caught) { error = String(caught.stack || caught); }
finally {
  for (const [file, original] of originals) fs.writeFileSync(path.join(ROOT, file), original);
  const after = manifest();
  write('source-after.json', after);
  const restored = JSON.stringify(after) === JSON.stringify(before);
  const passed = !error && restored && results.length === faults.length && results.every(row => row.ok);
  write('report.json', { healthyTitles, results, error, sourceRestored: restored, passed });
  console.log(`Manager report controls: ${results.filter(row => row.ok).length}/${faults.length} effective faults, source restored=${restored}`);
  process.exitCode = passed ? 0 : 1;
}
