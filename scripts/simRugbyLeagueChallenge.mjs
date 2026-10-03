/* Offline representative records, actual page/helper, and copied executable controls.
   RUGBY_LEAGUE_CHALLENGE_CONTROL=all runs every gate serially and retains evidence. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url);
const helper = 'src/lib/rugbyLeagueChallenge.ts';
const scheduler = 'src/lib/champOrNot.ts';
const panel = 'src/components/champ-or-not/RugbyLeagueChallenge.tsx';
const testFile = 'src/test/rugbyLeagueChallenge.test.tsx';
const balanced = 'deals ten deterministic alternating claims with five distinct years per category';
const duplicate = 'accepts only one answer and one advance from same-frame repeated actions';
const delayed = 'keeps asynchronous rules focus and derives its example only from eligible records';
const independent = [
  'preserves the historical multi-bank schedule independently of rugby mode',
  'preserves the original daily score save and single completion independently of rugby mode',
];
const controls = {
  fetch: { file: helper, from: "const RUGBY_KEYS = ['nrl', 'dallym'] as const;", to: "const RUGBY_KEYS = ['nrl', 'dallym', 'afl'] as const;", test: 'fetches only the two existing rugby record definitions and rejects a failed bank' },
  balance: { file: helper, from: 'categories[index % 2][Math.floor(index / 2)]', to: 'categories[0][Math.floor(index / 2)]', test: balanced },
  unique: { file: helper, from: 'if (round && !years.has(round.year)) {', to: 'if (round) {', test: balanced },
  ties: { file: helper, from: 'buildRound(def, rows, `${seed}:rugby:${key}:${attempt}`)', to: 'buildRound(def, rows.filter((row, index) => rows.findIndex(other => other.year === row.year) === index), `${seed}:rugby:${key}:${attempt}`)', test: 'keeps both winners of split years and never invents a vacant-year claim' },
  cutoff: { file: helper, from: 'row.year <= 2025 && ', to: '', test: 'refuses missing thin or future-only banks and excludes unfinished seasons' },
  single: { file: scheduler, from: 'if (compKeys.length === 1) return Array.from({ length: count }, () => compKeys[0]);', to: 'if (compKeys.length === 1) return compKeys.slice(0, count);', test: 'returns an exact finite schedule when only one legacy bank is available' },
  help: { file: panel, from: "if (!active || helpOpen || phaseRef.current !== 'question' || !current) return;", to: "if (!active || phaseRef.current !== 'question' || !current) return;", test: 'shows playable rules and a verified example before the first question and reopens them safely' },
  focus: { file: panel, from: 'if (helpOpen) return;', to: 'if (helpOpen) setHelpOpen(false);', test: delayed },
  example: { file: panel, from: "const example = rounds.find(round => round.compKey === 'nrl');", to: "const example = rows?.get('nrl')?.[0] ? { year: rows.get('nrl')[0].year, realTeams: [rows.get('nrl')[0].team] } : undefined;", test: delayed },
  score: { file: panel, from: 'setAnswers(previous => [...previous, pick === current.isTrue]);', to: 'setAnswers(previous => [...previous, pick !== current.isTrue]);', test: 'reveals actual winners until explicit advance and totals the ten calls by category' },
  replay: { file: panel, from: '    setAnswers([]);', to: '    if (runNumber.current === 1) setAnswers([]);', test: 'replays a new balanced set with no stale points answers or result card' },
  answer: { file: panel, from: "phaseRef.current !== 'question' || !current", to: "phase !== 'question' || !current", test: duplicate },
  advance: { file: panel, from: "if (!active || helpOpen || phaseRef.current !== 'reveal') return;", to: "if (!active || helpOpen || phase !== 'reveal') return;", test: duplicate },
  save: { file: panel, from: '    setLastPick(pick);', to: "    setLastPick(pick);\n    localStorage.removeItem(`champ-or-not-daily-${new Date().toISOString().slice(0, 10)}`);", test: 'retains pending Daily and Unlimited Hard play while rugby leaves every saved byte alone' },
  completion: { file: panel, from: '  const score = answers.filter(Boolean).length;', to: "  const score = answers.filter(Boolean).length;\n  useGameCompletion('champ-or-not', phase === 'done', score, 1);", test: 'finishes and replays rugby without booking or corrupting an earned Daily on reload' },
  retry: { file: panel, from: 'setLoadAttempt(previous => previous + 1);', to: 'setLoadAttempt(previous => previous);', test: 'refuses an incomplete record bank and recovers through the actual retry action' },
};
const control = process.env.RUGBY_LEAGUE_CHALLENGE_CONTROL || '';
assert.ok(!control || control === 'all' || control in controls, 'Known Rugby League control');
const evidence = path.resolve(process.env.RUGBY_LEAGUE_CHALLENGE_ARTIFACTS || path.join(root, 'rugby-league-challenge-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root,
      env: { ...process.env, RUGBY_LEAGUE_CHALLENGE_CONTROL: name, RUGBY_LEAGUE_CHALLENGE_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    outcomes.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} Rugby League ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simRugbyLeagueChallenge')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert.ok(outcomes.every(row => row.passed), 'Every normal/control outcome must pass; all were attempted');
  console.log(`simRugbyLeagueChallenge all: 15 normal outcomes and ${Object.keys(controls).length} executable controls passed; two original-mode baselines passed in every control.`);
  process.exit(0);
}

const heldFiles = [helper, scheduler, panel, testFile, 'src/pages/ChampOrNot.tsx', 'src/hooks/useChampOrNot.ts', 'src/hooks/useGameCompletion.ts', 'src/test/fixtures/rugbyLeagueRecords.json'];
const held = await Promise.all(heldFiles.map(async file => ({ file, bytes: await readFile(path.join(root, file)) })));
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
let folder;
let copy;
try {
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.from).length - 1, 1, `${control} binds exactly one executable anchor`);
    let changed = source.replace(spec.from, spec.to);
    if (control === 'completion') {
      const anchor = "import { useRevealScroll } from '@/hooks/useRevealScroll';";
      assert.equal(changed.split(anchor).length - 1, 1);
      changed = changed.replace(anchor, anchor + "\nimport { useGameCompletion } from '@/hooks/useGameCompletion';");
    }
    assert.notEqual(changed, source, `${control} changes executable code`);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/rugby-league-'));
    copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: copy });
    console.log(`simRugbyLeagueChallenge ${control}: executable ${spec.file} changed in a disposable copy`);
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, ...independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output);
  process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Actual runner completed normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runner faults cannot earn control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 15, 'All fifteen cases discovered');
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    const title = controls[control].test;
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1);
    assert.equal(report.numPassedTests, 2); assert.equal(report.numPendingTests, 12);
    const matching = rows.filter(row => row.title === title); assert.equal(matching.length, 1);
    assert.equal(matching[0].status, 'failed', `Intended outcome fails: ${title}`);
    const failure = matching[0].failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
    assert.match(failure, /AssertionError:|Error: expect\(element\)/, 'An outcome assertion rejects the mutation, never a timeout');
    for (const name of independent) assert.equal(rows.find(row => row.title === name)?.status, 'passed', `Original-mode baseline: ${name}`);
    console.log(`simRugbyLeagueChallenge ${control}: one intended assertion failure, two legacy baselines passed, twelve intentional skips.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 15); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simRugbyLeagueChallenge: all 15 helper and mounted outcomes passed using representative verified records, with zero live data calls.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
  for (const item of held) assert.deepEqual(await readFile(path.join(root, item.file)), item.bytes, `${item.file} raw bytes held`);
}
console.log('simRugbyLeagueChallenge: eight source/fixture inputs held byte for byte; reports and changed copies retained.');
