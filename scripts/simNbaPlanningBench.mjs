/* Actual NBA page/hook outcomes with isolated copied-source controls.
   Run NBA_PLANNING_CONTROL=all for every report, even after a failure. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url);
const hook = 'src/hooks/useNbaConnections.ts', page = 'src/pages/NbaConnections.tsx';
const helper = 'src/lib/nbaConnectionDrafts.ts', testFile = 'src/test/nbaPlanningBench.test.tsx';
const titles = {
  model: 'moves canonical notes without duplication and rejects malformed or stale documents',
  free: 'plans four drafts freely and never submits the fifth selection',
  score: 'revises a wrong draft then finds four groups for exactly the original 750 points',
  rapid: 'charges one life for same-frame submissions and rejects solved-name reuse',
  ready: 'waits for the real loaded pool and restores mode notes with daily bytes held',
  reset: 'reopens the saved Unlimited puzzle despite a new random draw and resets to the new scope',
  roster: 'rejects a same-id changed roster and foreign saved names without overwriting during load',
  help: 'shows worked help and blocks background submission while its rules are open',
  warning: 'keeps live notes usable and warns when browser persistence fails',
  baseline: 'restores the original completed Daily payload quietly and keeps its exact bytes',
};
const controls = {
  navigation: { file: hook, from: 'if (JSON.stringify(next.groups) !== JSON.stringify(draftsRef.current?.groups))', to: 'if (true)', test: titles.rapid },
  scope: { file: helper, from: 'value.scope !== scope', to: 'false', test: titles.model },
  roster: { file: helper, from: 'JSON.stringify([...value.roster].sort()) !== JSON.stringify([...roster].sort())', to: 'false', test: titles.model },
  duplicate: { file: helper, from: '|| seen.has(name)', to: '|| false', test: titles.model },
  move: { file: helper, from: 'notes.groups.map(group => group.filter(player => player !== name))', to: 'notes.groups.map(group => [...group])', test: titles.model },
  cap: { file: helper, from: 'current.length >= 5', to: 'false', test: titles.free },
  auto: { file: hook, from: 'if (next !== current) writeDrafts(next);', to: "if (next !== current) { writeDrafts(next); if (next.groups[next.active].length === 5 && mode === 'daily') addDailyAction({ t: 'x' }); }", test: titles.free },
  rapid: { file: hook, from: 'if (submittedRef.current === submission) return;', to: 'if (false) return;', test: titles.rapid },
  score: { file: hook, from: '(dailyLives * 250)', to: '(dailyLives * 200)', test: titles.score },
  ready: { file: hook, from: "const loadingGame = isLoadingPool || (mode === 'daily' && isLoading);", to: "const loadingGame = (mode === 'daily' && isLoading);", test: titles.ready },
  mode: { file: helper, from: '`nba-connections-notes-v1:${mode}`', to: "'nba-connections-notes-v1:daily'", test: titles.ready },
  sport: { file: helper, from: '`nba-connections-notes-v1:${mode}`', to: '`nhl-connections-notes-v1:${mode}`', test: titles.free },
  restore: { file: hook, from: 'if (savedIndex >= 0) setUnlimitedIndex(savedIndex);', to: 'if (false) setUnlimitedIndex(savedIndex);', test: titles.reset },
  reset: { file: hook, from: "emptyNbaDrafts(nbaDraftScope('unlimited', nextPuzzle.id, todayStr), nextPuzzle.groups.flatMap(group => group.players))", to: 'emptyNbaDrafts(scope, roster)', test: titles.reset },
  help: { file: page, from: 'onClick={() => { if (!showRules) submitSelection(); }}', to: 'onClick={() => { submitSelection(); }}', test: titles.help },
  warning: { file: hook, from: 'catch { setNotesWarning(true); }\n  }, [mode]);', to: 'catch { setNotesWarning(false); }\n  }, [mode]);', test: titles.warning },
};
const control = process.env.NBA_PLANNING_CONTROL || '';
assert(!control || control === 'all' || control in controls, 'Known planning control');
const evidence = path.resolve(process.env.NBA_PLANNING_ARTIFACTS || path.join(root, 'nba-planning-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const mode of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, NBA_PLANNING_CONTROL: mode, NBA_PLANNING_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${mode || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    outcomes.push({ control: mode || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} NBA planning ${mode || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simNbaPlanningBench')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert(outcomes.every(row => row.passed), 'All normal and control outcomes must pass; every mode was attempted');
  console.log(`simNbaPlanningBench: 10 actual model/mounted cases and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = [];
for (const relative of [hook, page, helper, testFile, 'src/components/nba-connections/NbaConnectionsHowToPlay.tsx', 'src/data/nbaConnectionsPuzzles.ts', 'src/hooks/useDailyPuzzle.ts', 'src/hooks/useGameCompletion.ts']) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, relative + ' raw bytes held')));
}
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
let folder;
try {
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.from).length - 1, 1, control + ' binds exactly one executable anchor');
    const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/nba-planning-'));
    const copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: copy });
  }
  const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, titles.baseline].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Runner completes without interruption');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|Transform failed|Failed to (?:resolve import|load)|Cannot find module/, 'Runner failures do not earn control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(result => result.assertionResults);
  assert.equal(rows.length, 10); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const failed = rows.filter(row => row.status === 'failed'), passed = rows.filter(row => row.status === 'passed');
  if (control) {
    assert.equal(run.status, 1); assert.deepEqual(failed.map(row => row.title), [controls[control].test]);
    assert.deepEqual(passed.map(row => row.title), [titles.baseline]);
    assert.equal(rows.filter(row => ['pending', 'skipped'].includes(row.status)).length, 8);
    const failure = failed.flatMap(row => row.failureMessages).join('\n');
    assert.match(failure, /AssertionError/); assert.doesNotMatch(failure, /TypeError|ReferenceError|TestingLibraryElementError|Timed out/);
  } else {
    assert.equal(run.status, 0); assert.equal(failed.length, 0); assert.equal(passed.length, 10);
    assert.deepEqual(new Set(passed.map(row => row.title)), new Set(Object.values(titles)));
  }
  console.log(`simNbaPlanningBench ${control || 'normal'}: exact expected assertions and independent Daily restore passed.`);
} finally {
  if (folder) { await rm(folder, { recursive: true, force: true }); await rmdir(path.join(root, '.sim-control')).catch(() => {}); }
  for (const verify of held) await verify();
}
