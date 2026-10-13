/* Remote-only routine and promised-followup outcomes through the actual engine.
   SC_ROUTINE_EXPECT_RED=1 classifies only the authored missing-feature assertions.
   SC_ROUTINE_CONTROL=missing|priority|effect rewrites actual source in memory.
   The original source, changed source, raw runner log and JSON are retained. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI, 'Soccer routine proof runs remotely only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['src/test/soccerCareerRoutineEvents.test.ts', 'src/test/soccerCareerLifeFollowups.test.ts'];
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const ROUTINE = path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts');
const CONTROL = process.env.SC_ROUTINE_CONTROL || '';
const EXPECT_RED = process.env.SC_ROUTINE_EXPECT_RED === '1';
assert(['', 'missing', 'priority', 'effect'].includes(CONTROL), 'Unknown SC_ROUTINE_CONTROL');
assert(!(CONTROL && EXPECT_RED), 'Baseline and fixed-source controls are separate arms');
const SCENARIOS = [
  'extra passing reps', 'video notes', 'first touch work', 'sprint mechanics', 'keeper catching',
  'long away trip', 'post trip quiet', 'travel meal routine', 'shared travel notes', 'calling home',
  'defensive clips', 'loan parent check in', 'loan local community', 'midfield receiving angles', 'captain squad responsibility',
  'reserve frustration', 'finishing practice', 'helping a training partner', 'kit preparation', 'captain media duty',
  'family visit', 'keeping an off season routine', 'sponsor appearance', 'quiet phone time', 'cool down routine',
  'recorded injury review', 'veteran warm up', 'skill review', 'new club introduction', 'family school calendar',
];
const ROUTINE_OWNED = [
  ...SCENARIOS.map((scenario, index) => `routine missing: ${600 + index} ${scenario} saves both choices exactly`),
  'routine missing: stable capped reads add no random draws',
  'routine missing: year and player identity rotate the offered decisions',
  'routine missing: recorded context excludes incompatible fresh offers',
  'routine missing: actual full catalog reads keep saved state intact',
  'routine missing: a queued reserve choice survives a real morale change and reload',
  'routine missing: two actual routine choices accumulate queued effects through reload',
  'routine missing: queued skill reaches the actual next season once',
  'routine missing: modest morale and popularity changes respect their boundaries',
];
const ROUTINE_PRESERVED = [
  'routine preservation: an existing humble celebration still saves its actual morale',
  'routine preservation: the existing golf choice keeps its queued pace tradeoff',
  'routine preservation: two existing cards still answer after each JSON reload',
  'routine preservation: an unavailable old card skips without applying invented effects',
  'routine preservation: existing category and once story cooldowns retain their season boundaries',
  'routine preservation: existing cousin agent gates still draw their own randomness',
];
const FOLLOWUP_OWNED = [
  'followup missing: esports results have priority in the actual next playing season',
  'followup missing: the boots story has priority in the actual next playing season',
];
const FOLLOWUP_PRESERVED = [
  'followup preservation: actual acquisitions and their existing season stamps survive JSON reload',
  'followup preservation: newly acquired stories are not due again in their acquisition season',
  'followup preservation: sold completed and declined stories do not create another priority',
  'followup preservation: retired careers get no new playing season priority',
  'followup preservation: existing personality agent and comeback priorities remain available',
  'followup preservation: the actual picker still holds a followup inside its cooldown',
  'followup preservation: priority reads keep old saves and the random stream untouched',
];
const SETUP_ERROR = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = text => createHash('sha256').update(text).digest('hex');
const paths = [ENGINE, LIFE, ...FILES.map(file => path.join(ROOT, file))];
if (fs.existsSync(ROUTINE)) paths.push(ROUTINE);
const sources = new Map(paths.map(file => [file, fs.readFileSync(file, 'utf8')]));
const arm = CONTROL || (EXPECT_RED ? 'baseline-red' : 'normal');
const retained = process.env.SOCCER_ROUTINE_OUT ? path.join(path.resolve(process.env.SOCCER_ROUTINE_OUT), 'units', arm) : null;
if (retained) {
  fs.mkdirSync(retained, { recursive: true });
  for (const [file, source] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), source);
}
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'dist/.soccer-routine-proof-'));
let changedFile = null;
let changedSource = null;
const anchors = [];
try {
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.SOCCER_ROUTINE_ENGINE;
  delete env.SOCCER_ROUTINE_LIFE;
  function rewrite(file, anchor, replacement) {
    const source = sources.get(file);
    assert.equal(source.split(anchor).length - 1, 1, 'One unique actual source anchor is required');
    changedFile = file;
    changedSource = source.replace(anchor, replacement);
    assert.notEqual(changedSource, source, 'The source control must change actual code');
    anchors.push(anchor);
    if (retained) fs.writeFileSync(path.join(retained, path.basename(file) + '.control'), changedSource);
  }
  if (CONTROL === 'missing') rewrite(LIFE, '...getSoccerRoutineEvents(state)', '');
  if (CONTROL === 'priority') rewrite(LIFE, '  return ids;\n}', '  return ids.filter(id => id !== 227 && id !== 231);\n}');
  if (CONTROL === 'effect') {
    assert(sources.has(ROUTINE), 'Effect control requires the actual new routine module');
    rewrite(ROUTINE, 'export function getSoccerRoutineEvents(', 'function getSoccerRoutineEventsOriginal(');
    changedSource += `
export function getSoccerRoutineEvents(state: Parameters<typeof getSoccerRoutineEventsOriginal>[0]) {
  const cards = getSoccerRoutineEventsOriginal(state);
  const card = cards.find(event => event.id === 600);
  if (card) {
    const apply = card.choices[1].apply;
    card.choices[1].apply = before => {
      const morale = before.morale;
      const after = apply(before);
      after.morale = morale;
      return after;
    };
  }
  return cards;
}
`;
    if (retained) fs.writeFileSync(path.join(retained, path.basename(ROUTINE) + '.control'), changedSource);
  }
  if (!EXPECT_RED) {
    assert(sources.has(ROUTINE), 'Fixed proof requires the actual routine module');
    const esbuild = await import('esbuild');
    await esbuild.build({
      entryPoints: { engine: ENGINE, life: LIFE }, outdir: tmp, outExtension: { '.js': '.mjs' },
      bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
      plugins: [{ name: 'soccer-routine-actual-source', setup(build) {
        if (!changedFile) return;
        build.onLoad({ filter: /\.ts$/ }, args => {
          if (path.resolve(args.path) !== changedFile) return undefined;
          return { contents: changedSource, loader: 'ts', resolveDir: path.dirname(changedFile) };
        });
      } }],
    });
    env.SOCCER_ROUTINE_ENGINE = path.join(tmp, 'engine.mjs').replaceAll('\\', '/');
    env.SOCCER_ROUTINE_LIFE = path.join(tmp, 'life.mjs').replaceAll('\\', '/');
    if (retained) {
      fs.copyFileSync(path.join(tmp, 'engine.mjs'), path.join(retained, 'engine.mjs'));
      fs.copyFileSync(path.join(tmp, 'life.mjs'), path.join(retained, 'life.mjs'));
    }
  }
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs');
  const reportFile = path.join(tmp, 'unit.json');
  assert(fs.existsSync(runner), 'Install locked dependencies remotely first');
  const result = spawnSync(process.execPath, [runner, 'run', ...FILES, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`], {
    cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024, timeout: 180000,
  });
  const output = (result.stdout || '') + (result.stderr || '');
  const receipts = [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
    beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file, 'utf8')) }));
  if (retained) {
    fs.writeFileSync(path.join(retained, 'output.log'), output);
    if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
    fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ arm, files: FILES, sourceReceipts: receipts,
      exitCode: result.status, processError: result.error?.message || null, controlAnchors: anchors,
      changedFile: changedFile === null ? null : path.relative(ROOT, changedFile).replaceAll('\\', '/'),
      changedSourceSha256: changedSource === null ? null : sha(changedSource),
    }, null, 2) + '\n');
  }
  assert(!result.error && result.status !== null, 'The actual unit process must finish within its bound');
  assert(!SETUP_ERROR.test(output), 'Setup or unhandled errors cannot earn proof credit');
  assert(fs.existsSync(reportFile), 'The actual unit report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 2, 'Both owned physical unit files must run');
  assert.deepEqual(report.testResults.map(file => {
    assert(!file.message, 'Each actual test file must load without a file error');
    const name = file.name.replaceAll('\\', '/');
    const owned = FILES.find(relative => name.endsWith('/' + relative));
    assert(owned, 'No other test file may earn proof credit');
    return owned;
  }).sort(), [...FILES].sort());
  const cases = report.testResults.flatMap(file => file.assertionResults);
  const followups = cases.filter(test => test.title.startsWith('followup '));
  assert.deepEqual(followups.map(test => test.title).sort(), [...FOLLOWUP_OWNED, ...FOLLOWUP_PRESERVED].sort());
  const routine = cases.filter(test => test.title.startsWith('routine '));
  assert.deepEqual(routine.map(test => test.title).sort(), [...ROUTINE_OWNED, ...ROUTINE_PRESERVED].sort(), 'Every exact routine outcome must run');
  assert.equal(routine.length, 44, 'All 44 exact routine outcomes must run');
  assert.equal(cases.length, 53, 'All 53 owned unit outcomes must run');
  assert.equal(report.numPendingTests, 0, 'No pending outcome may earn proof credit');
  assert(cases.every(test => ['passed', 'failed'].includes(test.status)), 'No skipped or todo outcome may earn proof credit');
  const routineOwned = routine.filter(test => test.title.startsWith('routine missing:'));
  const routinePreserved = routine.filter(test => test.title.startsWith('routine preservation:'));
  assert.equal(routineOwned.length, 38);
  assert.equal(routinePreserved.length, 6);
  assert([...routinePreserved, ...followups.filter(test => FOLLOWUP_PRESERVED.includes(test.title))].every(test => test.status === 'passed'), 'All 13 preservation outcomes must pass');
  const expectedFailures = EXPECT_RED ? [...ROUTINE_OWNED, ...FOLLOWUP_OWNED]
    : CONTROL === 'missing' ? ROUTINE_OWNED
      : CONTROL === 'priority' ? FOLLOWUP_OWNED
        : CONTROL === 'effect' ? [ROUTINE_OWNED[0]] : [];
  const failed = cases.filter(test => test.status === 'failed');
  assert.deepEqual(failed.map(test => test.title).sort(), [...expectedFailures].sort(), 'Only intended source-caused outcome assertions may fail');
  for (const test of failed) {
    const id = FOLLOWUP_OWNED.indexOf(test.title);
    const cause = CONTROL === 'effect' ? /^AssertionError: expected 65 to be 67/
      : id >= 0 ? new RegExp(`^AssertionError: expected \\[\\] to include ${id === 0 ? 227 : 231}`)
      : /^AssertionError:.*to have a length of 1 but got \+0/s;
    assert(test.failureMessages.length > 0 && test.failureMessages.every(message => cause.test(message)), 'Every intended failure must match its actual missing-feature assertion');
  }
  assert.equal(report.numFailedTests, expectedFailures.length);
  assert.equal(report.numPassedTests, 53 - expectedFailures.length);
  assert.equal(result.status, expectedFailures.length ? 1 : 0, 'The actual runner exit must agree with its causal report');
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual app and proof source must stay held');
  if (CONTROL) console.log(`Effective actual source control: ${CONTROL}; ${anchors.length} unique anchor changed; changed sha256=${sha(changedSource)}.`);
  console.log(`Actual physical unit files: ${report.testResults.length}; ${cases.length} exact completed outcomes.`);
  console.log(`Routine outcomes: ${routineOwned.length} owned; ${routinePreserved.length} preservation; ${routine.filter(test => test.status === 'passed').length} passed.`);
  console.log(`Promised followups: ${FOLLOWUP_OWNED.map(title => `${title}=${followups.find(test => test.title === title).status}`).join('; ')}; 7 preservation passes.`);
  console.log(`Actual causal totals: ${failed.length} intended failures; ${report.numPassedTests} passes; pending 0; runner exit ${result.status}.`);
  console.log(`Source receipts held: ${receipts.length}; file errors empty; raw setup and unhandled markers absent.`);
  console.log(`simSoccerCareerRoutineEvents ${EXPECT_RED ? 'expected baseline red' : CONTROL ? 'control ' + CONTROL : 'normal'}: green. All exact outcome and source guards passed.`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
