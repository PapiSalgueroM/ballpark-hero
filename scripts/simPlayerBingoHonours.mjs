import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { TRANSFER_OVERLAY_2026 } from './transferOverlay2026.mjs';

const root = process.cwd();
const requestedOut = process.env.PLAYER_BINGO_HONOURS_OUT;
const defaultRoot = path.join(root, '.sim-artifacts/player-bingo-honours');
if (!requestedOut) mkdirSync(defaultRoot, { recursive: true });
const out = requestedOut ? path.resolve(requestedOut) : mkdtempSync(path.join(defaultRoot, 'run-'));
assert.ok(out.startsWith(root + path.sep), 'Output is owned by this checkout');
if (requestedOut) {
  assert.equal(existsSync(out), false, 'Fresh controls output required');
  mkdirSync(out, { recursive: true });
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const libFile = path.join(root, 'src/lib/playerBingo.ts');
const testFile = path.join(root, 'src/test/playerBingoHonours.test.ts');
const heldLib = readFileSync(libFile);
const heldTest = readFileSync(testFile);
const source = heldLib.toString('utf8').replaceAll('\r\n', '\n');
/* Release BE join (Round BEG): taken again once because Round 1352 (PR251, the World Cup Andy Robertson alias)
   changed fetchWorldCupSets in playerBingo.ts; main's file held 9195E989... before that merge. */
assert.equal(hash(Buffer.from(source)), 'AD1D776406BF0151C6BE4B1EB53EA544E6FEC40363BD1D5B491D491342FEAEEF');
assert.equal(hash(heldTest), '0AE18AE01A012509200926DB6F66BA115C81AF718FD07B308299DFE21EB4EB72');
writeFileSync(path.join(out, 'source.raw.ts'), heldLib);
writeFileSync(path.join(out, 'source.LF.ts'), source);
writeFileSync(path.join(out, 'test.raw.ts'), heldTest);
const controls = [
  { id: 'remove-2026', anchor: "  { keys: ['paris saint-germain'], years: [2025, 2026] },", replacement: "  { keys: ['paris saint-germain'], years: [2025] },", failures: [
    'accepts the current PSG midfielder in 2026 without borrowing forward history',
    'preserves the verified 2025 pair and rejects non-winning PSG years',
  ] },
  { id: 'remove-window-arrivals', anchor: '        const windowArrival = UCL_2026_WINDOW_ARRIVALS.has(normalizeName(p.name));', replacement: '        const windowArrival = false;', failures: [
    'gives a summer 2026 PSG arrival no 2026 title and keeps any earlier winning season',
  ] },
  { id: 'remove-vitinha-identity', anchor: "  if (normalizeName(ref.name) !== 'vitinha') return true;", replacement: '  return true;', failures: [
    'accepts the current PSG midfielder in 2026 without borrowing forward history',
    'keeps the Genoa forward unmerged and rejects a borrowed PSG title',
    'rejects a namesake history row with missing nationality',
    'rejects a namesake history row with different nationality',
    'rejects a namesake history row with missing position',
    'rejects a namesake history row with unknown position',
    'rejects a namesake history row with forward position',
    'rejects a namesake history row with attacking midfield position',
  ] },
  // Release BA closing check: the forward's second position must not read as the midfielder's role.
  { id: 'merge-attacking-midfield', anchor: "    /attacking midfield/i.test(position) ? null : /midfield/i.test(position) ? 'MID' : /wing|striker|forward|attack/i.test(position) ? 'FWD' : null;", replacement: "    /midfield/i.test(position) ? 'MID' : /wing|striker|forward|attack/i.test(position) ? 'FWD' : null;", failures: [
    'rejects a namesake history row with attacking midfield position',
  ] },
];
const temporary = [];
const report = { status: 'running', source: { rawBytes: heldLib.length, rawSha256: hash(heldLib), lfBytes: Buffer.byteLength(source), lfSha256: hash(Buffer.from(source)), testBytes: heldTest.length, testSha256: hash(heldTest) }, runs: [], controls: [], failures: [] };
const save = () => writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
save();
function run(id, copiedSource, expectedFailures) {
  const folder = path.join(out, id);
  mkdirSync(folder);
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  let copy;
  if (copiedSource !== null) {
    const sourceFolder = mkdtempSync(path.join(root, 'src/lib/.bingo-honours-'));
    copy = path.join(sourceFolder, 'playerBingo.ts');
    temporary.push({ copy, sourceFolder });
    writeFileSync(copy, copiedSource);
    writeFileSync(path.join(folder, 'source-copy.ts'), copiedSource);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/playerBingo': copy });
  }
  const resultFile = path.join(folder, 'vitest.json');
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/playerBingoHonours.test.ts', '--reporter=json', '--outputFile.json=' + resultFile, '--maxWorkers=1', '--no-file-parallelism'];
  const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 25000000 });
  writeFileSync(path.join(folder, 'stdout.txt'), result.stdout || '');
  writeFileSync(path.join(folder, 'stderr.txt'), result.stderr || '');
  const retained = { id, command: process.execPath, args, cwd: root, alias: env.NO_DOUBLE_SWAP ?? null, exit: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message, stack: result.error.stack } : null, expectedFailures, rows: null, status: 'unaccepted' };
  report.runs.push(retained); save();
  assert.equal(retained.error, null);
  assert.equal(retained.signal, null);
  assert.ok(existsSync(resultFile), 'Complete Vitest report present');
  const actual = JSON.parse(readFileSync(resultFile, 'utf8'));
  retained.rows = actual.testResults.flatMap(file => file.assertionResults); save();
  assert.equal(Number(actual.numUnhandledErrors ?? 0), 0);
  assert.equal(actual.numPendingTests, 0);
  assert.equal(retained.rows.length, 11);
  assert.equal(actual.numTotalTests, 11);
  assert.equal(actual.numFailedTests, expectedFailures.length);
  assert.equal(actual.numPassedTests, 11 - expectedFailures.length);
  assert.equal(result.status, expectedFailures.length ? 1 : 0);
  assert.deepEqual(retained.rows.filter(row => row.status === 'failed').map(row => row.title).sort(), [...expectedFailures].sort());
  for (const row of retained.rows) assert.equal(row.status, expectedFailures.includes(row.title) ? 'failed' : 'passed', row.fullName);
  retained.status = 'pass'; save();
}
// Release BA: the year 2026 rows carry the summer 2026 window (scripts/transferOverlay2026.mjs), so a
// player the overlay moved INTO a 2026 Champions League winner holds a 2026 row at that club although he
// joined after the final. Every such entry must be in playerBingo.ts's UCL_2026_WINDOW_ARRIVALS, and every
// name there must be such an entry (a stale name would strip a real squad member's title). Read from the
// code with comments stripped, never from the prose about it. The drop-one and add-one controls run every
// time and must each find exactly the name they changed.
function windowFence() {
  const marks = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
  const fold = value => String(value).normalize('NFD').replace(marks, '').toLowerCase().trim();
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const winners2026 = [...code.matchAll(/\{ keys: \[([^\]]*)\], years: \[([^\]]*)\] \}/g)]
    .filter(m => m[2].split(',').map(y => y.trim()).includes('2026'))
    .flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(k => fold(k[1])));
  assert.ok(winners2026.length >= 1, 'a 2026 winner pair is read from UCL_WINNER_PAIRS');
  const list = code.match(/const UCL_2026_WINDOW_ARRIVALS[^=]*= new Set\(\s*\[([^\]]*)\]/);
  assert.ok(list, 'UCL_2026_WINDOW_ARRIVALS is read from the code');
  const listed = [...list[1].matchAll(/'([^']+)'/g)].map(m => fold(m[1]));
  const arrivals = TRANSFER_OVERLAY_2026.filter(e => e.db && winners2026.includes(fold(e.db))).map(e => e.name);
  assert.ok(arrivals.length >= 4, `the overlay's moves into a 2026 winner are found (${arrivals.length})`);
  const check = names => ({
    missing: arrivals.filter(n => !names.includes(fold(n))),
    stale: names.filter(n => !arrivals.map(fold).includes(n)),
  });
  const healthy = check(listed);
  const dropped = listed.slice(1);
  const dropControl = check(dropped);
  const addControl = check([...listed, fold('Qzx Not An Arrival')]);
  report.fence = { winners2026, listed, arrivals, healthy, dropControl, addControl };
  save();
  assert.deepEqual(healthy, { missing: [], stale: [] }, 'every overlay arrival into a 2026 winner is listed, and nothing else');
  assert.deepEqual(dropControl.missing.map(fold), [listed[0]], 'drop-one control finds exactly the dropped name');
  assert.deepEqual(addControl.stale, ['qzx not an arrival'], 'add-one control finds exactly the added name');
}
try {
  windowFence();
  run('healthy', null, []);
  for (const control of controls) {
    const record = { ...control, forwardCount: source.split(control.anchor).length - 1, sourceChanged: false, reverseCount: null, wholeUndo: false, status: 'unaccepted' };
    report.controls.push(record); save();
    assert.equal(record.forwardCount, 1);
    const changed = source.replace(control.anchor, control.replacement);
    record.sourceChanged = changed !== source; save();
    assert.equal(record.sourceChanged, true);
    record.reverseCount = changed.split(control.replacement).length - 1; save();
    assert.equal(record.reverseCount, 1);
    const undo = changed.replace(control.replacement, control.anchor);
    writeFileSync(path.join(out, control.id + '.undo.ts'), undo);
    record.wholeUndo = undo === source; save();
    assert.equal(record.wholeUndo, true);
    run(control.id, changed, control.failures);
    record.status = 'pass'; save();
  }
  const last = report.controls.at(-1);
  const undo = readFileSync(path.join(out, last.id + '.undo.ts'), 'utf8');
  assert.equal(undo, source);
  run('whole-undo', undo, []);
  assert.deepEqual(readFileSync(libFile), heldLib);
  assert.deepEqual(readFileSync(testFile), heldTest);
  report.status = 'pass'; save();
  console.log('simPlayerBingoHonours: actual loader healthy11 and complete whole-undo11 pass.');
  console.log('simPlayerBingoHonours: remove2026 rejects exactly2 retained title cases,9 unrelated cases pass.');
  console.log('simPlayerBingoHonours: remove window arrivals rejects exactly1 summer 2026 arrival case,10 unrelated cases pass.');
  console.log('simPlayerBingoHonours: remove identity rejects exactly8 histories,3 unrelated cases pass.');
  console.log('simPlayerBingoHonours: merge attacking midfield rejects exactly1 namesake case,10 unrelated cases pass.');
  console.log(`simPlayerBingoHonours: window fence ${report.fence.arrivals.length} overlay arrivals into a 2026 winner (${report.fence.winners2026.join(', ')}) all listed; drop-one control missed exactly ${report.fence.dropControl.missing.join(', ')}, add-one control stale exactly ${report.fence.addControl.stale.join(', ')}.`);
  console.log('simPlayerBingoHonours: full source/test bytes, all four unique source mutations and complete reversals retained.');
  console.log('simPlayerBingoHonours PASS');
} catch (error) {
  report.status = 'fail';
  report.failures.push({ name: error.name, message: error.message, stack: error.stack });
  save(); process.exitCode = 1;
} finally {
  for (const { copy, sourceFolder } of temporary) {
    try {
      if (existsSync(copy)) unlinkSync(copy);
      rmdirSync(sourceFolder);
    } catch (error) {
      report.status = 'fail'; report.failures.push({ name: 'OwnedCopyCleanup', message: error.message, stack: error.stack }); process.exitCode = 1;
    }
  }
  const held = { lib: hash(readFileSync(libFile)) === hash(heldLib), test: hash(readFileSync(testFile)) === hash(heldTest) };
  writeFileSync(path.join(out, 'source-held.json'), JSON.stringify(held, null, 2) + '\n');
  if (!held.lib || !held.test) { report.status = 'fail'; report.failures.push({ name: 'SourceHold', message: 'Actual source changed during controls' }); process.exitCode = 1; save(); }
  save();
}
