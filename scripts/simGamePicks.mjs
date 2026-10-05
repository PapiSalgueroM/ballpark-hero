/* Mounted Home/Search outcomes. Controls rewrite isolated source copies only. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url);
const hook = 'src/hooks/useGamePicks.ts', row = 'src/components/home/GamePicksRow.tsx';
const button = 'src/components/game/GamePickButton.tsx', test = 'src/test/gamePicks.test.tsx';
const titles = {
  pin: 'pins Footle from Home without opening a game or touching saves and scores',
  restore: 'pins NHL Connections from Search and restores both exact Home destinations after remount',
  remove: 'removes only the chosen pick and launches the retained game through its real link',
  valid: 'filters hostile saved paths and duplicates without rewriting storage while reading',
  write: 'keeps failed writes useful across page changes and labels them as this-visit picks',
  read: 'shows an honest warning when the browser cannot read saved picks',
  events: 'adopts cross-tab updates removals and clear without echoing a storage write',
  stale: 'merges a stale tab toggle with the current stored picks',
  focus: 'keeps keyboard focus on a useful control when shelf picks are removed',
  baseline: 'keeps the original Search result link and arrow-key launch flow with no picks',
};
const controls = {
  pin: { file: button, from: 'onClick={() => onToggle(game.path)}', to: 'onClick={() => {}}', test: titles.pin },
  persist: { file: hook, from: 'window.localStorage.setItem(GAME_PICKS_KEY, JSON.stringify(paths));', to: 'void paths;', test: titles.pin },
  restore: { file: hook, from: 'return storedPicks(window.localStorage.getItem(GAME_PICKS_KEY));', to: 'return { paths: [], storageFailed: false };', test: titles.restore },
  remove: { file: hook, from: 'held.filter(item => item !== path)', to: 'held.filter(item => item === path)', test: titles.remove },
  valid: { file: hook, from: "typeof path === 'string' && isGamePath(path)", to: "typeof path === 'string'", test: titles.valid },
  unique: { file: hook, from: "[...new Set(value.filter((path): path is string => typeof path === 'string' && isGamePath(path)))]", to: "value.filter((path): path is string => typeof path === 'string' && isGamePath(path))", test: titles.valid },
  visit: { file: hook, from: 'visitPicks = paths;', to: 'visitPicks = [];', test: titles.write },
  warning: { file: hook, from: 'storageFailed = true;', to: 'storageFailed = false;', test: titles.write },
  read: { file: hook, from: 'return { paths: visitPicks ?? [], storageFailed: true };', to: 'return { paths: visitPicks ?? [], storageFailed: false };', test: titles.read },
  event: { file: hook, from: "window.addEventListener('storage', changed);", to: 'void changed;', test: titles.events },
  queued: { file: hook, from: 'update(storedPicks(window.localStorage.getItem(GAME_PICKS_KEY)));', to: 'update(storedPicks(event.newValue));', test: titles.events },
  stale: { file: hook, from: 'held = storedPicks(window.localStorage.getItem(GAME_PICKS_KEY)).paths;', to: 'held = current.current.paths;', test: titles.stale },
  focus: { file: row, from: 'if (at >= 0 && document.activeElement === buttons[at])', to: 'if (false)', test: titles.focus },
  link: { file: row, from: 'to={game.path}', to: 'to="/footle"', test: titles.remove },
};
const control = process.env.GAME_PICKS_CONTROL || '';
assert(!control || control === 'all' || control in controls, 'Known game picks control');
const evidence = path.resolve(process.env.GAME_PICKS_ARTIFACTS || path.join(root, 'game-picks-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const mode of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, GAME_PICKS_CONTROL: mode, GAME_PICKS_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${mode || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    outcomes.push({ control: mode || 'normal', passed, exit: run.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} game picks ${mode || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simGamePicks')).join('\n') + '\n' : output.slice(-12000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert(outcomes.every(result => result.passed), 'Every baseline and effective control passes');
  console.log(`simGamePicks: ${Object.keys(titles).length} mounted outcomes and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = await Promise.all([hook, row, button, test, 'src/pages/Index.tsx', 'src/pages/Search.tsx'].map(async file => [file, await readFile(path.join(root, file))]));
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
let folder;
try {
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.from).length - 1, 1, control + ' changes exactly one executable anchor');
    let changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source);
    if (spec.file === row) {
      assert.equal(changed.split("from './SportGlyph'").length - 1, 1);
      changed = changed.replace("from './SportGlyph'", "from '@/components/home/SportGlyph'");
    }
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/game-picks-'));
    const copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: copy });
  }
  const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, titles.baseline].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Runner completes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|Transform failed|Failed to (?:resolve import|load)|Cannot find module/, 'A runner problem does not earn control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(result => result.assertionResults);
  assert.equal(rows.length, Object.keys(titles).length); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const failed = rows.filter(result => result.status === 'failed'), passed = rows.filter(result => result.status === 'passed');
  if (control) {
    assert.equal(run.status, 1); assert.deepEqual(failed.map(result => result.title), [controls[control].test]);
    assert.deepEqual(passed.map(result => result.title), [titles.baseline]);
    assert.equal(rows.filter(result => ['pending', 'skipped'].includes(result.status)).length, Object.keys(titles).length - 2);
    const failure = failed.flatMap(result => result.failureMessages).join('\n');
    assert.match(failure, /AssertionError/); assert.doesNotMatch(failure, /TypeError|ReferenceError|TestingLibraryElementError|Timed out/);
  } else {
    assert.equal(run.status, 0); assert.equal(failed.length, 0);
    assert.deepEqual(new Set(passed.map(result => result.title)), new Set(Object.values(titles)));
  }
  console.log(`simGamePicks ${control || 'normal'}: exact expected outcomes and independent original Search behavior passed.`);
} finally {
  if (folder) { await rm(folder, { recursive: true, force: true }); await rmdir(path.join(root, '.sim-control')).catch(() => {}); }
  for (const [file, bytes] of held) assert.deepEqual(await readFile(path.join(root, file)), bytes, file + ' raw bytes held');
}
