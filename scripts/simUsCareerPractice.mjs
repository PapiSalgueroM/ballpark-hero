/* Round 992: play real drills on all four real career boards. The saved
   player, the next simulated season and the displayed receipt must agree.
   Controls copy production source, prove a unique edit and require exactly
   the named outcomes to fail. Reports and copies are retained in TEMP.
   US_CAREER_PRACTICE_CONTROL=before|gain|cap|once|save|receipt|renew|rules|abort|pending|reset|carry
   The before control mounts the actual pre-992 boards from a0ba8344. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.US_CAREER_PRACTICE_CONTROL || '';
const BOARD = 'src/components/us-career/UsCareerBoard.tsx';
const RULE = 'src/lib/careerTraining.ts';
const GAIN = 'banks played skill into the real save once and survives reload';
const QUIET = 'quiet legacy restore preserves the existing career unchanged';
const controls = {
  gain: { file: BOARD, from: '...career, ovr: bank.ovr,', to: '...career, ovr: career.ovr,', test: GAIN },
  cap: { file: RULE, from: 'raiseWithinPotential(ovr, pot, tier)', to: 'Math.min(99, ovr + tier)', test: 'ceiling pays only the available headroom' },
  once: { file: RULE, from: 'return lastTrainedSeason !== season;', to: 'return true;', test: GAIN },
  save: { file: BOARD, from: "setFeed(f => [`Practice: ${trainingBankNote(bank)}`, ...f].slice(0, 8));\n    persist(c, 'season', teamQuality);", to: "setFeed(f => [`Practice: ${trainingBankNote(bank)}`, ...f].slice(0, 8));", test: GAIN },
  receipt: { file: 'src/components/us-career/UsCareerPractice.tsx', from: '${trainingBankNote(result)}', to: 'Rating +2.', test: 'ceiling pays only the available headroom' },
  renew: { file: RULE, from: 'return lastTrainedSeason !== season;', to: 'return lastTrainedSeason == null;', test: 'earned rating reaches the next real season and practice renews afterwards' },
  rules: { file: 'src/components/us-career/UsCareerPractice.tsx', from: 'Example: an 80 score at 74 OVR with a 75 ceiling earns +1.', to: 'Every score earns a rating increase.', test: GAIN },
  abort: { file: BOARD, from: 'const closePractice = () => {', to: "const closePractice = () => { bankPractice('closed', 80);", test: 'abort leaves no save changes and rules reopen during play' },
  pending: { file: BOARD, from: 'if (career.pendingRivalryEvent) {', to: 'if (false && career.pendingRivalryEvent) {', test: 'keeps pending rivalry ahead of practice and resets a finished career cleanly' },
  reset: { file: BOARD, from: 'localStorage.removeItem(sport.saveKey);', to: 'void sport.saveKey;', test: 'keeps pending rivalry ahead of practice and resets a finished career cleanly' },
  carry: { file: BOARD, from: 'const campNote = sport.campBattle(c, teamQuality, Math.random);', to: 'c.ovr -= c.practice?.gain ?? 0;\n    const campNote = sport.campBattle(c, teamQuality, Math.random);', test: 'earned rating reaches the next real season and practice renews afterwards' },
};
assert(!CONTROL || CONTROL === 'before' || controls[CONTROL], `Unknown practice control: ${CONTROL}`);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-practice992-'));
const sourceCopies = [];
let sourceFolder;
if (CONTROL) {
  const parent = path.join(ROOT, '.sim-control');
  fs.mkdirSync(parent, { recursive: true });
  sourceFolder = fs.mkdtempSync(path.join(parent, 'practice992-'));
  process.once('exit', () => {
    for (const copy of sourceCopies) fs.rmSync(copy, { force: true });
    fs.rmdirSync(sourceFolder);
  });
}
const writeControl = (name, source) => {
  fs.writeFileSync(path.join(work, name), source);
  // React imports resolve from the project; TEMP retains the evidence copy.
  const copy = path.join(sourceFolder, name);
  fs.writeFileSync(copy, source);
  sourceCopies.push(copy);
  return copy.replaceAll('\\', '/');
};
const swaps = {};
const alias = file => `@/${file.slice(4).replace(/\.tsx?$/, '')}`;
if (CONTROL === 'before') {
  for (const [slug, name] of [['nfl', 'Nfl'], ['nba', 'Nba'], ['mlb', 'Mlb'], ['nhl', 'Nhl']]) {
    const file = `src/components/${slug}-my-career/${name}MyCareerBoard.tsx`;
    const original = execFileSync('git', ['show', `a0ba8344:${file}`], { cwd: ROOT, encoding: 'utf8' });
    assert(original.includes('Play the {career.year} season') && !original.includes('data-career-practice'), `Not a pre-practice board: ${file}`);
    swaps[alias(file)] = writeControl(`${name}Before.tsx`, original);
  }
} else if (CONTROL) {
  const control = controls[CONTROL];
  const source = fs.readFileSync(path.join(ROOT, control.file), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(source.split(control.from).length - 1, 1, `${CONTROL} must change exactly one source anchor`);
  const broken = source.replace(control.from, control.to);
  assert.notEqual(broken, source, `${CONTROL} did not change source`);
  swaps[alias(control.file)] = writeControl(path.basename(control.file), broken);
}
const report = path.join(work, 'report.json');
const require = createRequire(path.join(ROOT, 'package.json'));
const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const args = [vitest, 'run', 'src/test/usCareerPractice.test.tsx', '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', `--outputFile=${report}`];
const named = CONTROL === 'before' ? GAIN : controls[CONTROL]?.test;
if (named) args.push('-t', `${named}|${QUIET}`);
const env = { ...process.env, NO_COLOR: '1' };
delete env.FORCE_COLOR;
delete env.NO_DOUBLE_SWAP;
delete env.US_BOARD_CONTROL_ALIAS;
delete env.US_BOARD_CONTROL_FILE;
if (Object.keys(swaps).length) env.NO_DOUBLE_SWAP = JSON.stringify(swaps);
const run = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
fs.writeFileSync(path.join(work, 'output.log'), `${run.stdout || ''}\n${run.stderr || ''}`);
console.log(`Practice evidence: ${work}`);
if (run.error || (!CONTROL && run.status !== 0)) console.error(`${run.stdout || ''}\n${run.stderr || ''}`.slice(-16000));
assert(!run.error, `Vitest did not finish: ${run.error}`);
assert(fs.existsSync(report), 'Vitest produced no outcome report');
const results = JSON.parse(fs.readFileSync(report, 'utf8'));
const tests = results.testResults.flatMap(file => file.assertionResults);
const failed = tests.filter(test => test.status === 'failed');
const passed = tests.filter(test => test.status === 'passed');
for (const file of results.testResults) {
  if (file.status === 'failed' && !file.assertionResults.length) console.error(file.message);
}
const labels = ['NFL', 'NBA', 'MLB', 'NHL'];
// Vitest formats an object-table string as 'NFL'; retain the exact outcome
// title while normalising only those four known sport prefixes.
const outcomeTitle = test => test.title.replace(/^'(NFL|NBA|MLB|NHL)' /, '$1 ');
if (!CONTROL) {
  for (const test of failed) console.error(`${test.fullName}\n${test.failureMessages.join('\n')}`.slice(0, 6000));
  assert.equal(run.status, 0, `Practice failed: ${failed.map(t => t.fullName).join('; ')}`);
  assert.equal(failed.length, 0);
  assert.equal(passed.length, 32, 'All 32 actual-board outcomes must run');
  for (const label of labels) {
    assert.equal(passed.filter(t => outcomeTitle(t).startsWith(`${label} `)).length, 8, `${label} outcomes missing`);
    console.log(`   ${label}: 8 actual-board outcomes passed, including saved gains, reload and the next season`);
  }
  console.log('simUsCareerPractice: 32 actual-board outcomes passed across NFL, NBA, MLB and NHL');
} else {
  assert.equal(run.status, 1, `${CONTROL} must be an assertion failure, not a stall or runner error`);
  assert.equal(failed.length, 4, `${CONTROL}: exactly four named sport outcomes must fail`);
  for (const label of labels) assert(failed.some(t => outcomeTitle(t) === `${label} ${named}`), `${CONTROL}: missing ${label} named failure`);
  assert.equal(passed.length, 4, `${CONTROL}: the four independent quiet restores must stay green`);
  for (const label of labels) assert(passed.some(t => outcomeTitle(t) === `${label} ${QUIET}`), `${CONTROL}: ${label} quiet restore did not pass`);
  assert(failed.every(t => t.failureMessages?.some(message => /AssertionError|TestingLibraryElementError|expect\(/.test(message))
    && !t.failureMessages.some(message => /timed out|Failed to resolve|Cannot find module|ReferenceError|TypeError|unhandled/i.test(message))), `${CONTROL}: failures must be assertions, never runner errors or deadlines`);
  assert.equal(results.numRuntimeErrorTestSuites ?? 0, 0, `${CONTROL}: runtime suite errors are not a control result`);
  console.log(`simUsCareerPractice control ${CONTROL}: all four named outcomes rejected the defect, all four quiet restores passed`);
}
