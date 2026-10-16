/* Baseline-only remote proof for I1343's first capped legacy match. No source mutation. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Record boundary proof requires remote offline CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '5053712fdf440201bc61a9f5dcf953e2d35ac120';
assert(!process.env.CM_RECORD_BOUNDARY_BASE || process.env.CM_RECORD_BOUNDARY_BASE === BASE, 'This is the exact frozen I1343 baseline');
assert(process.env.CM_RECORD_BOUNDARY_OUT && path.isAbsolute(process.env.CM_RECORD_BOUNDARY_OUT), 'Absolute retained evidence root required');
const OUT = path.resolve(process.env.CM_RECORD_BOUNDARY_OUT);
const TEST = 'src/test/clubManagerRecordBoundary.test.ts';
const FILES = ['src/lib/clubManager.ts', 'src/lib/clubManagerRecords.ts', 'src/lib/saveFence.ts',
  'package.json', 'package-lock.json', 'bun.lock', TEST, 'scripts/simClubManagerRecordBoundary.mjs'];
const TARGETS = [
  { title: 'legacy300 preserves the oldest nine-goal game with zero missed',
    cause: 'RECORD_BOUNDARY_LEGACY300: oldest known nine-goal record and zero missed must survive the first capped match' },
  { title: 'legacy350 preserves the oldest nine-goal game with fifty missed',
    cause: 'RECORD_BOUNDARY_LEGACY350: oldest known nine-goal record and fifty missed must survive the first capped match' },
];
const PRESERVED = [
  'legacy299 preserves the available record before the book reaches its cap',
  'stored preserves the modern nine-goal record at the book cap',
  'null starts counting at the actual new match without reviving legacy rows',
  'actual higher totals replace the record and equal totals keep the first game',
];
const IDS = ['legacy300', 'legacy350', 'legacy299', 'stored', 'null', 'higher', 'tie'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => {
  const child = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert.equal(child.status, 0, 'Exact Git source read must finish'); return child.stdout;
};
fs.mkdirSync(OUT, { recursive: true });
const reportFile = path.join(OUT, 'unit.json'), rawFile = path.join(OUT, 'raw-states.json');
assert(!fs.existsSync(reportFile) && !fs.existsSync(rawFile), 'Do not overwrite physical proof outcomes');
const sources = FILES.map(file => ({ file, bytes: fs.readFileSync(path.join(ROOT, file)) }));
for (const row of sources) {
  fs.writeFileSync(path.join(OUT, path.basename(row.file) + '.before'), row.bytes);
  if (!row.file.startsWith('src/test/') && !row.file.startsWith('scripts/')) {
    assert.equal(row.bytes.toString('utf8').replaceAll('\r\n', '\n'), git(['show', `${BASE}:${row.file}`]), 'Application and package bytes bind the exact incoming baseline: ' + row.file);
  }
}
let verdict = {};
function receipt(extra = {}) {
  verdict = { ...verdict, ...extra };
  fs.writeFileSync(path.join(OUT, 'source.json'), JSON.stringify({ head: git(['rev-parse', 'HEAD']).trim(), base: BASE,
    purpose: 'Baseline-only causal handoff; six cases, two exact faults, four preservation cases',
    sources: sources.map(row => ({ file: row.file, bytes: row.bytes.length, beforeSha256: sha(row.bytes),
      afterSha256: sha(fs.readFileSync(path.join(ROOT, row.file))) })), ...verdict }, null, 2));
}
try {
  receipt();
  const child = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST,
    '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile],
  { cwd: ROOT, env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, encoding: 'utf8', timeout: 300000,
    maxBuffer: 64 * 1024 * 1024 });
  const output = (child.stdout || '') + (child.stderr || '');
  fs.writeFileSync(path.join(OUT, 'output.log'), output); process.stdout.write(output);
  fs.writeFileSync(path.join(OUT, 'exit.json'), JSON.stringify({ exit: child.status, signal: child.signal, error: child.error?.message || null }, null, 2));
  receipt({ exit: child.status, signal: child.signal, processError: child.error?.message || null });
  assert(!child.error && !child.signal && child.status !== null, 'Actual unit runner must complete');
  assert(!/TypeError:|ReferenceError:|SyntaxError:|ERR_MODULE_NOT_FOUND|Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|SIM_OFFLINE_BLOCK|RECORD_BOUNDARY_SETUP|RECORD_BOUNDARY_PRESERVATION/i.test(output),
    'Setup, transport, paired-state or preservation faults cannot qualify as the two record faults');
  assert(fs.existsSync(reportFile) && fs.existsSync(rawFile), 'Physical actual unit and complete raw-state files required');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1); assert.equal(report.numTotalTests, 6);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  const file = report.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'Only the actual target file may run, without a file-level error');
  const cases = file.assertionResults;
  assert.deepEqual(cases.map(row => row.title).sort(), [...TARGETS.map(row => row.title), ...PRESERVED].sort(), 'Exactly six named physical cases');
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)), 'No incomplete cases');
  const failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title).sort(), TARGETS.map(row => row.title).sort(), 'Only the two actual capped legacy record faults qualify');
  for (const row of failed) {
    const cause = TARGETS.find(target => target.title === row.title).cause;
    assert.equal(row.failureMessages.length, 1);
    assert(row.failureMessages[0].startsWith('AssertionError: ' + cause) && row.failureMessages[0].includes('expected false to be true'), 'Exact single false-to-true Boolean cause required');
  }
  assert.equal(report.numPassedTests, 4); assert.equal(report.numFailedTests, 2);
  assert.equal(report.success, false); assert.equal(child.status, 1);
  const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  assert.deepEqual(Object.keys(raw).sort(), [...IDS].sort(), 'All seven full paired observations physically retained before classification');
  const observations = [];
  for (const id of IDS) {
    const row = raw[id], isFault = ['legacy300', 'legacy350'].includes(id);
    assert(!row.error && row.before && row.referenceBefore && row.initializer?.value && row.actual?.value && row.reference?.value, id + ': complete public-state observations');
    assert.equal(row.initializer.value.clubName, 'Everton');
    assert(row.initializer.value.squad.length >= 11 && row.initializer.value.calendar.length > 0 && row.initializer.value.world, id + ': genuine initialized club world');
    assert.equal(Object.keys(row.holds).length, 18); assert(Object.values(row.holds).every(value => value === true), id + ': all exact state, save and RNG holds');
    assert.equal(row.correctRecord, !isFault, id + ': exact expected baseline outcome');
    assert.equal(row.actual.value.kind, 'match'); assert.equal(row.reference.value.kind, 'match');
    assert(row.attempts.length >= 1 && row.attempts.length <= 16 && row.seed >= 1 && row.seed <= 16);
    assert(row.actual.draws.length > 0); assert.deepEqual(row.actual.draws, row.reference.draws);
    assert.deepEqual(row.actualReload.draws, []); assert.deepEqual(row.referenceReload.draws, []);
    const report = row.actual.value.report, total = report.homeGoals + report.awayGoals;
    assert(Number.isInteger(total) && total > 0 && total < 9, id + ': real low-goal result acquired, never forced');
    assert.equal(row.actual.value.state.careerStats.played, row.before.careerStats.played + 1);
    if (isFault) {
      const played = id === 'legacy300' ? 300 : 350, missed = played - 300;
      assert.equal(row.before.h2h.length, 300); assert.equal(row.before.careerStats.played, played);
      assert(!Object.hasOwn(row.before.careerStats, 'highestScoring'));
      assert.deepEqual(row.expectedRecord, { opp: 'Prepared archive club 001', score: '5-4', res: 'W', season: 1, ...(missed ? { missed } : {}) });
      for (const state of [row.actual.value.state, row.actualReload.loaded]) {
        assert.notEqual(state.careerStats.highestScoring.opp, 'Prepared archive club 001');
        assert.notEqual(state.careerStats.highestScoring.score, '5-4');
        assert.equal(state.careerStats.highestScoring.missed, missed + 1, 'Physical defect is the already-trimmed seed, not a missing match');
      }
    }
    observations.push({ id, seed: row.seed, total, draws: row.actual.draws.length, holds: Object.keys(row.holds).length,
      correctRecord: row.correctRecord, savedBytes: Buffer.byteLength(row.actualReload.raw), loadedRecord: row.actualReload.loaded.careerStats.highestScoring });
  }
  assert.equal(raw.higher.current.score, raw.tie.current.score, 'The tie uses the same actual score under the same game stream');
  assert.equal(raw.higher.seed, raw.tie.seed);
  assert.deepEqual(raw.higher.actual.draws, raw.tie.actual.draws, 'Higher and tie observations retain the same consumed game RNG stream');
  for (const row of sources) assert.deepEqual(fs.readFileSync(path.join(ROOT, row.file)), row.bytes, 'Complete source bytes held: ' + row.file);
  receipt({ qualified: true, completed: 6, passed: 4, exactRecordFaults: 2, setupFaults: 0,
    rawSha256: sha(fs.readFileSync(rawFile)), observations });
  console.log('Manager record boundary baseline: 6 completed; 2 exact capped-legacy Boolean faults; 4 preservation cases passed; 7 full paired public-game/save/RNG observations; setup faults 0.');
  console.log('I1343 application, old methods and packages remain unchanged. This is a qualified defect handoff, not a fixed or full-suite verdict.');
} catch (error) { receipt({ qualificationError: error?.stack || String(error) }); throw error; }
