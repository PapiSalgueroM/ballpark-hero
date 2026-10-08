/* Actual result views and literal counters with effective copied-source controls. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url), stats = 'src/components/cage-clash/CageFightStats.tsx';
const board = 'src/components/cage-clash/CageClashBoard.tsx', canvas = 'src/components/cage-clash/CageClashCanvas.tsx';
const feedback = 'src/components/cage-clash/CagePracticeFeedback.tsx';
const testFile = 'src/test/cageFightStats.test.tsx';
const titles = {
  mapping: 'maps asymmetric literal counters into the correct labelled player and CPU columns',
  zeros: 'keeps zero counters visible and rounds damage and top time at literal boundaries',
  back: 'focuses Back and calls its callback once without editing the supplied fight',
  availability: 'excludes setup live combat and a completed unscored practice lesson',
  quick: 'opens and closes actual quick results with restored focus and no new writes or awards',
  circuit: 'shows each actual circuit fight separately and keeps next opponents and the one final award intact',
  baseline: 'preserves the accepted promotion world independently of fight stats controls',
};
const controls = {
  hits: { file: stats, from: 'fight.player.hits, fight.cpu.hits', to: 'fight.player.blocked, fight.cpu.blocked', test: titles.mapping },
  damage: { file: stats, from: 'Math.round(fight.player.damageDealt)', to: 'Math.round(fight.player.health)', test: titles.mapping },
  blocks: { file: stats, from: 'fight.player.blocked, fight.cpu.blocked', to: 'fight.player.hits, fight.cpu.hits', test: titles.mapping },
  takedowns: { file: stats, from: 'fight.player.takedowns, fight.cpu.takedowns', to: 'fight.player.blocked, fight.cpu.blocked', test: titles.mapping },
  seconds: { file: stats, from: 'fight.player.controlTicks * CAGE_TICK_MS / 1000', to: 'fight.player.controlTicks / 1000', test: titles.mapping },
  sides: { file: stats, from: '<td>{player}</td><td>{cpu}</td>', to: '<td>{cpu}</td><td>{player}</td>', test: titles.mapping },
  zero: { file: stats, from: '<td>{player}</td><td>{cpu}</td>', to: "<td>{player || '-'}</td><td>{cpu}</td>", test: titles.zeros },
  roundPlayer: { file: stats, from: 'Math.round(fight.player.damageDealt)', to: 'Math.floor(fight.player.damageDealt)', test: titles.zeros },
  roundCpu: { file: stats, from: 'Math.round(fight.cpu.damageDealt)', to: 'Math.floor(fight.cpu.damageDealt)', test: titles.zeros },
  precision: { file: stats, from: '(fight.player.controlTicks * CAGE_TICK_MS / 1000).toFixed(1)', to: '(fight.player.controlTicks * CAGE_TICK_MS / 1000).toFixed(0)', test: titles.zeros },
  backFocus: { file: stats, from: 'useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);', to: 'useEffect(() => {}, []);', test: titles.back },
  backCallback: { file: stats, from: 'onClick={onBack}>Back</button>', to: 'onClick={() => {}}>Back</button>', test: titles.back },
  readonly: { file: stats, from: 'onClick={onBack}>Back</button>', to: 'onClick={() => { fight.player.hits = 0; onBack(); }}>Back</button>', test: titles.back },
  open: { file: board, from: 'onClick={() => setStatsOpen(true)}', to: 'onClick={() => setStatsOpen(false)}', test: titles.quick },
  restoreFocus: { file: board, from: 'requestAnimationFrame(() => statsOpener.current?.focus({ preventScroll: true }));', to: 'requestAnimationFrame(() => {});', test: titles.quick },
  defaultView: { file: board, from: 'const [statsOpen, setStatsOpen] = useState(false);', to: 'const [statsOpen, setStatsOpen] = useState(true);', test: titles.quick },
  liveButton: { file: board, from: 'onClick={() => { game.pause(); onHelp(); }}>?</button>', to: 'onClick={() => { game.pause(); onHelp(); }}>?</button>{statsButton}', test: titles.availability },
  practiceButton: { file: board, from: '<p className="text-xs">{lesson.title} · No points awarded</p>', to: '<p className="text-xs">{lesson.title} · No points awarded</p>{statsButton}', test: titles.availability },
  circuitView: { file: board, from: '{statsOpen ? <CageFightStats fight={fight} onBack={closeStats} /> : <><p className="text-xl font-black">', to: '{false ? <CageFightStats fight={fight} onBack={closeStats} /> : <><p className="text-xl font-black">', test: titles.circuit },
};
const mode = process.env.CAGE_FIGHT_STATS_CONTROL || '';
assert(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known Cage Fight Stats control');
const evidence = path.resolve(process.env.CAGE_FIGHT_STATS_ARTIFACTS || path.join(root, 'cage-fight-stats-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (mode === 'all') {
  const results = [];
  for (const control of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAGE_FIGHT_STATS_CONTROL: control, CAGE_FIGHT_STATS_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${run.stdout || ''}\n${run.stderr || ''}`;
    await writeFile(path.join(evidence, `${control || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: control || 'normal', passed, exit: run.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} Cage Fight Stats ${control || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => /simCageFightStats/.test(line)).join('\n') + '\n' : output.slice(-12000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(result => result.passed), 'Every real outcome and effective control ran successfully');
  console.log(`simCageFightStats: ${Object.keys(titles).length} actual outcomes and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = [];
for (const relative of [stats, board, canvas, feedback, 'src/lib/cageClash.ts', 'src/lib/cagePractice.ts', 'src/lib/cageCircuit.ts', 'src/hooks/useCageClash.ts', testFile]) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} source bytes unchanged`)));
}
const controlRoot = path.join(root, '.sim-control'); await mkdir(controlRoot, { recursive: true });
const folder = await mkdtemp(path.join(controlRoot, 'cage-fight-stats-'));
try {
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
  if (mode) {
    const spec = controls[mode], source = (await readFile(path.join(root, spec.file), 'utf8')).replaceAll('\r\n', '\n');
    assert.equal(source.split(spec.from).length - 1, 1, 'Control binds one exact executable source anchor');
    const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source, 'Control changes actual executable code');
    const aliases = {};
    for (const original of [stats, board, canvas, feedback]) {
      const file = path.join(folder, path.basename(original));
      await writeFile(file, original === spec.file ? changed : (await readFile(path.join(root, original), 'utf8')).replaceAll('\r\n', '\n'));
      aliases['@/' + original.slice(4).replace(/\.tsx?$/, '')] = file;
    }
    await writeFile(path.join(evidence, `${mode}-changed-source.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  }
  const reportFile = path.join(evidence, `${mode || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (mode) args.push('--testNamePattern', [controls[mode].test, titles.baseline].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 150000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; await writeFile(path.join(evidence, `${mode || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'The bounded outcome process finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|Transform failed|Failed to (?:resolve import|load)|Cannot find module|not wrapped in act/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(result => result.assertionResults);
  assert.equal(rows.length, Object.keys(titles).length); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const failed = rows.filter(row => row.status === 'failed'), passed = rows.filter(row => row.status === 'passed');
  if (mode) {
    assert.equal(run.status, 1); assert.deepEqual(failed.map(row => row.title), [controls[mode].test]);
    assert.deepEqual(passed.map(row => row.title), [titles.baseline]);
    assert.equal(rows.filter(row => ['pending', 'skipped'].includes(row.status)).length, Object.keys(titles).length - 2);
    const failure = failed.flatMap(row => row.failureMessages).join('\n');
    assert.match(failure, /AssertionError/); assert.doesNotMatch(failure, /TypeError|ReferenceError|TestingLibraryElementError|Timed out/);
  } else {
    assert.equal(run.status, 0); assert.equal(failed.length, 0);
    assert.deepEqual(new Set(passed.map(row => row.title)), new Set(Object.values(titles)));
  }
  console.log(`simCageFightStats ${mode || 'normal'}: exact outcome assertions and independent promotion baseline passed.`);
} finally {
  assert.equal(path.dirname(folder), controlRoot); assert(path.basename(folder).startsWith('cage-fight-stats-'));
  await rm(folder, { recursive: true, force: true });
  for (const verify of held) await verify();
}
