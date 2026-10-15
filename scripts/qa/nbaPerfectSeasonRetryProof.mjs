// Remote-only actual page outcomes, original source and independent recovery removals.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
assert(process.env.CI, 'This proof runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.NBA_RETRY_PROOF_OUT || 'nba-retry-artifacts/proof');
assert(!fs.existsSync(OUT), 'Preserve earlier evidence in its own output directory'); fs.mkdirSync(OUT, { recursive: true });
const PAGE = 'src/pages/PerfectSeasonNba.tsx', TEST = 'src/test/perfectSeasonNbaRetry.test.tsx';
const BASE = '4aa47b12179f3e6bd734ffd84dd3a4b6641e36b5';
const hash = body => createHash('sha256').update(body).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
const write = (name, body) => { const bytes = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  const full = path.join(OUT, name); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, bytes); return { path: name, bytes: bytes.length, sha256: hash(bytes) }; };
const titles = [
  'retries the initial archive in the chosen mode and refuses a stale prior-mode wheel',
  'keeps an earlier pick through a failed next spin and finishes one complete 82-game season',
  'does not spend rerolls on repeated unusable or failed fetches and charges one usable recovery',
  'allows exactly two successful rerolls and refuses a third squad request',
  'keeps an ordinary healthy draft and restart unchanged with one completion per run',
];
const report = { status: 'running', base: BASE, scope: 'Five actual component outcomes per Source arm. Fictional fetch fixtures, actual unchanged simulation. No production archive or browser reload claim from jsdom.',
  expectedTitles: titles, arms: [], controls: [], errors: [] };
const heldFiles = [PAGE, TEST, 'src/lib/perfectSeasonNba.ts', 'src/lib/perfectSeason.ts', 'src/lib/perfectSeasonExpansion.ts',
  'src/lib/fetchAllRows.ts', 'src/hooks/usePerfectSeasonBest.ts', 'src/components/perfect-season/SeasonVerdict.tsx',
  'package.json', 'package-lock.json', 'vitest.config.ts', 'scripts/qa/nbaPerfectSeasonRetryProof.mjs'];
const hold = () => heldFiles.map(file => ({ file, bytes: fs.statSync(path.join(ROOT, file)).size, sha256: hash(fs.readFileSync(path.join(ROOT, file))) }));
let pageFolder, testFolder;
try {
  report.sourceBefore = hold(); for (const row of report.sourceBefore) row.retained = write(`source/${row.file}`, fs.readFileSync(path.join(ROOT, row.file)));
  const rawCurrent = fs.readFileSync(path.join(ROOT, PAGE)), current = rawCurrent.toString('utf8').replace(/\r\n/g, '\n');
  /* Release BG join (Round BGG): NBA_RETRY_PARENT_REF names the tree without this packet on a newer main (the BG join
     passes the first parent of its m2 merge). Unset, it is the packet's own parent and this proof runs exactly as before.
     Set, both pins still hold, on the packet's own blobs (its parent BASE and its head PACKET_HEAD), and the page under
     test must equal the bound parent's page with exactly the packet's edit merged in (git merge-file, no conflict). */
  const PACKET_HEAD = '1984e7e39e6ce31a5d8eb8fab953472862de02c1', PARENT = process.env.NBA_RETRY_PARENT_REF || BASE;
  report.parentRef = PARENT;
  if (PARENT === BASE) assert.equal(hash(current), '407709f4a78d811d03d6bda19e3358acc62910de5844239354e26ca5641dacac');
  else {
    const blob = ref => { const shown = spawnSync('git', ['show', `${ref}:${PAGE}`], { cwd: ROOT, maxBuffer: 1000000 });
      assert.equal(shown.status, 0); return shown.stdout.toString('utf8').replace(/\r\n/g, '\n'); };
    const packetBase = blob(BASE), packetHead = blob(PACKET_HEAD), parentPage = blob(PARENT);
    assert.equal(hash(packetHead), '407709f4a78d811d03d6bda19e3358acc62910de5844239354e26ca5641dacac');
    assert.equal(hash(packetBase), '5c7e61f180264eb5e23fba64cbf4d40fe39e817d1b603b137dcbc4418b2a798e');
    const joinFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'nba-retry-join-'));
    const joinFile = (name, body) => { const full = path.join(joinFolder, name); fs.writeFileSync(full, body); return full; };
    const merged = spawnSync('git', ['merge-file', '-p', joinFile('parent.tsx', parentPage), joinFile('base.tsx', packetBase), joinFile('head.tsx', packetHead)], { cwd: ROOT, maxBuffer: 1000000 });
    report.joinBinding = { parentRef: PARENT, packetHead: PACKET_HEAD, mergeStatus: merged.status, merged: write('source/join-merged-page.tsx', merged.stdout) };
    assert.equal(merged.status, 0, 'The packet edit merges onto the bound parent without a conflict');
    assert.equal(merged.stdout.toString('utf8'), current, 'The page under test is the bound parent plus exactly the packet edit');
    assert.notEqual(parentPage, current, 'The bound parent is the tree without this packet');
  }
  const originalProcess = spawnSync('git', ['show', `${PARENT}:${PAGE}`], { cwd: ROOT, maxBuffer: 1000000 });
  report.original = { source: write('source/original-page.tsx', originalProcess.stdout), stderr: write('source/original-git.stderr', originalProcess.stderr), status: originalProcess.status };
  assert.equal(originalProcess.status, 0); const original = originalProcess.stdout.toString('utf8');
  if (PARENT === BASE) assert.equal(hash(original), '5c7e61f180264eb5e23fba64cbf4d40fe39e817d1b603b137dcbc4418b2a798e');
  const edit = (source, from, to) => { assert.equal(source.split(from).length - 1, 1, 'A real unique Source operand is required'); const result = source.replace(from, to);
    assert.notEqual(result, source); assert.equal(result.split(to).length - 1, 1); assert.equal(result.replace(to, from), source); return result; };
  const mutations = [
    { id: 'original', source: original, expectedFailures: titles.slice(0, 3), edits: [] },
    { id: 'eager-debit', expectedFailures: [titles[2]], edits: [
      { from: "    if (isReroll) {\n      if (rerolls <= 0) return;\n    }\n    retryReroll.current = isReroll;\n", to: "    if (isReroll) {\n      if (rerolls <= 0) return;\n      setRerolls(r => r - 1);\n    }\n    retryReroll.current = isReroll;\n" },
      { from: "    if (!found) {\n      setPhase('error');\n      return;\n    }\n    if (isReroll) setRerolls(r => r - 1);\n", to: "    if (!found) {\n      setPhase('error');\n      return;\n    }\n" },
    ] },
    { id: 'forgotten-reroll', expectedFailures: [titles[2]], edits: [
      { from: 'void spin(retryReroll.current)', to: 'void spin(false)' },
    ] },
    { id: 'stale-wheel', expectedFailures: [titles[0]], edits: [
      { from: "    setIndex([]);\n    setPhase('boot');\n  };\n", to: "    setPhase('boot');\n  };\n" },
    ] },
  ];
  for (const mutation of mutations.filter(row => row.id !== 'original')) {
    let source = current; for (const operand of mutation.edits) source = edit(source, operand.from, operand.to); mutation.source = source;
    let undo = source; for (const operand of [...mutation.edits].reverse()) undo = edit(undo, operand.to, operand.from);
    assert.equal(undo, current, 'Whole current Source is restored'); mutation.undo = undo;
  }
  pageFolder = fs.mkdtempSync(path.join(ROOT, 'src/pages/.nba-retry-proof-'));
  testFolder = fs.mkdtempSync(path.join(ROOT, 'src/test/.nba-retry-proof-'));
  const originalTest = fs.readFileSync(path.join(ROOT, TEST), 'utf8');
  const run = arm => {
    const record = { id: arm.id, status: 'running', expectedFailures: arm.expectedFailures, source: write(`arms/${arm.id}/page.tsx`, arm.source),
      undo: arm.undo ? write(`arms/${arm.id}/undo.tsx`, arm.undo) : null, edits: write(`arms/${arm.id}/edits.json`, arm.edits || []) }; report.arms.push(record); write('report.json', report);
    const pageFile = path.join(pageFolder, `${arm.id}.tsx`), testFile = path.join(testFolder, `${arm.id}.test.tsx`);
    fs.writeFileSync(pageFile, arm.source);
    const importFrom = "@/pages/PerfectSeasonNba", importTo = `@/pages/${path.basename(pageFolder)}/${arm.id}`;
    assert.equal(originalTest.split(importFrom).length - 1, 1); const servedTest = originalTest.replace(importFrom, importTo); fs.writeFileSync(testFile, servedTest);
    record.test = write(`arms/${arm.id}/served.test.tsx`, servedTest);
    const componentOut = path.join(OUT, 'arms', arm.id, 'observations'), resultFile = path.join(OUT, 'arms', arm.id, 'vitest.json');
    const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', path.relative(ROOT, testFile), '--reporter=default', '--reporter=json', `--outputFile=${resultFile}`];
    record.command = { executable: process.execPath, args, cwd: ROOT, observationOutput: componentOut };
    const child = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, NBA_RETRY_COMPONENT_OUT: componentOut }, maxBuffer: 100000000 });
    record.process = { status: child.status, signal: child.signal, error: child.error ? String(child.error.stack || child.error) : null,
      stdout: write(`arms/${arm.id}/stdout.txt`, child.stdout || Buffer.alloc(0)), stderr: write(`arms/${arm.id}/stderr.txt`, child.stderr || Buffer.alloc(0)) };
    if (fs.existsSync(resultFile)) record.vitest = { path: path.relative(OUT, resultFile), bytes: fs.statSync(resultFile).size, sha256: hash(fs.readFileSync(resultFile)) };
    assert(record.vitest, 'The entire test result is required, even for original/control failure');
    const result = JSON.parse(fs.readFileSync(resultFile)), assertions = result.testResults.flatMap(row => row.assertionResults);
    assert.deepEqual(assertions.map(row => row.title).sort(), [...titles].sort()); assert.equal(result.numTotalTests, 5); assert.equal(result.numPendingTests, 0);
    assert(assertions.every(row => ['passed', 'failed'].includes(row.status))); record.assertions = write(`arms/${arm.id}/complete-assertions.json`, assertions);
    record.actualFailures = assertions.filter(row => row.status === 'failed').map(row => row.title).sort();
    record.observations = titles.map(title => { const file = path.join(componentOut, `${title.replace(/[^a-zA-Z0-9]+/g, '-')}.json`); assert(fs.existsSync(file)); const raw = fs.readFileSync(file);
      return { title, file: { path: path.relative(OUT, file), bytes: raw.length, sha256: hash(raw) } }; });
    assert.deepEqual(record.actualFailures, [...arm.expectedFailures].sort());
    const expectedGuards = arm.id === 'original' ? ['NBA_RETRY_GUARD_initial_mode_retry', 'NBA_RETRY_GUARD_prior_pick_recovery', 'NBA_RETRY_GUARD_repeat_failure_requests']
      : arm.id === 'eager-debit' ? ['NBA_RETRY_GUARD_usable_recovery_request'] : arm.id === 'forgotten-reroll' ? ['NBA_RETRY_GUARD_retry_reroll_debit']
      : arm.id === 'stale-wheel' ? ['NBA_RETRY_GUARD_stale_wheel_boot'] : [];
    const failures = assertions.filter(row => row.status === 'failed');
    record.expectedAssertionGuards = Object.fromEntries(arm.expectedFailures.map((title, index) => [title, expectedGuards[index]]));
    for (const failure of failures) assert(failure.failureMessages.join('\n').includes(record.expectedAssertionGuards[failure.title]), 'A copied Source control must fail its intended assertion, not an unrelated setup or callback error');
    assert.equal(child.signal, null); assert.equal(record.process.error, null); assert.equal(child.status, arm.expectedFailures.length ? 1 : 0);
    record.status = 'pass'; write('report.json', report); return record;
  };
  const byArm = {};
  const perform = arm => {
    try { return run(arm); } catch (error) {
      const record = report.arms.find(row => row.id === arm.id); if (record) { record.status = 'fail'; record.error = String(error.stack || error); }
      report.errors.push({ arm: arm.id, error: String(error.stack || error) }); write('report.json', report); return record;
    }
  };
  for (const mutation of mutations) {
    const record = perform(mutation); byArm[mutation.id] = record;
    const control = { id: mutation.id, status: 'running', changed: mutation.source !== current, expectedFailures: mutation.expectedFailures,
      source: record?.source, edits: record?.edits, wholeUndo: mutation.id === 'original' ? write('arms/original/current-restoration.tsx', current) : record?.undo };
    report.controls.push(control);
    try {
    assert(control.changed, 'Each original/removal control changes the whole current Source');
    assert.equal(record?.status, 'pass', 'Every original/control test outcome is required');
    const measuredRow = record.observations.find(row => row.title === (mutation.id === 'stale-wheel' ? titles[0] : titles[2]));
    const measured = JSON.parse(fs.readFileSync(path.join(OUT, measuredRow.file.path)));
    const wanted = mutation.id === 'original' ? { index: 1, squads: 9, sims: 0 } : mutation.id === 'eager-debit' ? { index: 1, squads: 15, sims: 0 }
      : mutation.id === 'forgotten-reroll' ? { index: 1, squads: 16, sims: 0 } : { index: 3, squads: 7, sims: 1 };
    assert.deepEqual({ index: measured.indexCalls.length, squads: measured.squadCalls.length, sims: measured.simulations.length }, wanted, 'The Source fault reaches its exact intended measured boundary');
    assert(measured.snapshots.some(row => row.label === 'retry-settled'));
    control.actualFailures = record.actualFailures; control.measuredBoundary = wanted; control.status = 'pass';
    } catch (error) { control.status = 'fail'; control.error = String(error.stack || error); report.errors.push({ control: mutation.id, error: control.error }); }
    write('report.json', report);
  }
  byArm.current = perform({ id: 'current', source: current, expectedFailures: [], edits: [] });
  byArm['whole-undo'] = perform({ id: 'whole-undo', source: current, expectedFailures: [], edits: [] });
  assert(report.arms.every(row => row.status === 'pass')); assert(report.controls.every(row => row.status === 'pass')); assert.equal(report.errors.length, 0);
  const outcome = row => { const value = JSON.parse(fs.readFileSync(path.join(OUT, row.file.path))); return { fixture: value.fixture, indexCalls: value.indexCalls, squadCalls: value.squadCalls, simulations: value.simulations, completions: value.completions, daily: value.daily }; };
  for (const title of titles.slice(3)) { const originalRow = byArm.original.observations.find(row => row.title === title);
    assert.deepEqual(outcome(byArm.current.observations.find(row => row.title === title)), outcome(originalRow), 'Whole unchanged healthy game-simulation and fetch outcomes match original'); }
  assert.deepEqual(byArm['whole-undo'].observations.map(outcome), byArm.current.observations.map(outcome), 'Whole undo preserves all actual game outcomes');
  report.runtimeEqualityScope = 'Full fixture/fetch/simulation/completion/daily outputs. Entire DOM and unfiltered draw callers retained independently, not normalized into a cross-arm equality claim.';
  report.status = 'pass';
} catch (error) { report.status = 'fail'; report.errors.push(String(error.stack || error)); }
finally {
  for (const [folder, parent] of [[pageFolder, 'src/pages'], [testFolder, 'src/test']]) if (folder) {
    try { assert.equal(path.dirname(folder), path.resolve(ROOT, parent)); assert(path.basename(folder).startsWith('.nba-retry-proof-')); fs.rmSync(folder, { recursive: true }); }
    catch (error) { report.status = 'fail'; report.errors.push(`Owned-copy cleanup: ${String(error.stack || error)}`); }
  }
  try { report.sourceAfter = hold(); assert.deepEqual(report.sourceAfter, report.sourceBefore?.map(({ retained, ...row }) => row)); }
  catch (error) { report.status = 'fail'; report.errors.push(`Source hold: ${String(error.stack || error)}`); }
  write('report.json', report);
}
console.log(`NBA retry proof: ${report.arms.length}/6 complete Source arms, five actual tests each.`);
console.log(`NBA retry controls: ${report.controls.length}/4 exact measured original/removal maps.`);
console.log(`NBA retry evidence: full Source, outputs, fixtures, raw DOM, draws and process records at ${OUT}`);
console.log(`${report.status === 'pass' ? 'PASS' : 'FAIL'} NBA Perfect Season retry proof`);
if (report.status !== 'pass') process.exitCode = 1;
