/* Real mounted entry guides with copied-source controls and an independent baseline. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), self = fileURLToPath(import.meta.url);
const help = 'src/components/game/GameHelp.tsx', testFile = 'src/test/careerEntryGuide.test.tsx';
const titles = {
  first: 'opens each opted-in career guide and remembers only its dismissal',
  returning: 'returns quietly and reopens the guide without changing career progress',
  route: 'isolates route receipts and ignores a late guide from the previous route',
  async: 'waits for usable instructions without recording an unseen guide',
  blocked: 'keeps blocked-storage guides dismissible and reopenable without changing saves',
  prerender: 'keeps first-visit state out of prerendered pages',
  content: 'reuses real instructions for saved season reviews and actual decision results',
  baseline: 'leaves default GameHelp manual and independent career bytes unchanged',
};
const controls = {
  noAutoOpen: { file: help, from: "setOpen(localStorage.getItem(localStorageKey) !== '1');", to: 'setOpen(false);', test: titles.first },
  repeatOpen: { file: help, from: "setOpen(localStorage.getItem(localStorageKey) !== '1');", to: 'setOpen(true);', test: titles.returning },
  noReceipt: { file: help, from: "localStorage.setItem(localStorageKey, '1');", to: 'void localStorageKey;', test: titles.first },
  prematureReceipt: { file: help, from: 'setContent(c);', to: "setContent(c); if (firstVisit) { try { localStorage.setItem(localStorageKey, '1'); } catch {} }", test: titles.async },
  sharedRoute: { file: help, from: 'const localStorageKey = `rules-gate-seen:${pathname}`;', to: "const localStorageKey = 'rules-gate-seen:/nba-my-career';", test: titles.route },
  lateGuide: { file: help, from: 'if (cancelled) return;', to: 'if (false) return;', test: titles.route },
  blockedRead: { file: help, from: 'setOpen(true);', to: 'setOpen(false);', test: titles.blocked },
  blockedDismiss: { file: help, from: 'catch { /* The guide still closes when storage is blocked. */ }', to: 'catch { return; }', test: titles.blocked },
  prerenderDialog: { file: help, from: 'if (!firstVisit || prerender || !c || flatGuide(c).howToPlay.length === 0) return;', to: 'if (!firstVisit || !c || flatGuide(c).howToPlay.length === 0) return;', test: titles.prerender },
  noReopen: { file: help, from: 'setOpen(nextOpen);', to: 'setOpen(false);', test: titles.returning },
  dismissalDraw: { file: help, from: 'if (open && !nextOpen) {', to: 'if (open && !nextOpen) { Math.random();', test: titles.first },
  dismissalWrite: { file: help, from: 'if (open && !nextOpen) {', to: "if (open && !nextOpen) { localStorage.setItem('dukb-local-completions', 'changed by guide');", test: titles.first },
  manualDefault: { file: help, from: 'firstVisit = false', to: 'firstVisit = true', test: titles.baseline, baseline: titles.prerender },
  noWorkedExample: { file: help, from: '{guide.example.length > 0 && (', to: '{false && (', test: titles.content },
  ...Object.fromEntries(['Nba', 'Nfl', 'Mlb', 'Nhl'].map(name => [`missing${name}`, {
    file: `src/pages/${name}MyCareer.tsx`, from: '<GameHelp firstVisit ', to: '<GameHelp ', test: titles.first,
  }])),
};
const control = process.env.CAREER_ENTRY_GUIDE_CONTROL || '';
assert(!control || control === 'all' || control in controls, 'Known career guide control');
const evidence = path.resolve(process.env.CAREER_ENTRY_GUIDE_ARTIFACTS || path.join(root, 'career-entry-guide-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const mode of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAREER_ENTRY_GUIDE_CONTROL: mode, CAREER_ENTRY_GUIDE_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${mode || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    outcomes.push({ control: mode || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} career entry guide ${mode || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCareerEntryGuide')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert(outcomes.every(row => row.passed), 'Every normal and control mode passed; all modes were attempted');
  console.log(`simCareerEntryGuide: ${Object.keys(titles).length} mounted outcomes and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = [];
for (const relative of [help, testFile, 'src/components/game/HowToPlayPopover.tsx', 'src/components/us-career/UsCareerBoard.tsx', 'src/components/us-career/SeasonRevealCard.tsx', 'src/test/fixtures/careerDecisionOutcome1009.ts',
  ...['Nba', 'Nfl', 'Mlb', 'Nhl'].map(name => `src/pages/${name}MyCareer.tsx`)]) {
  const file = path.join(root, relative), bytes = await readFile(file);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, relative + ' raw bytes held')));
}
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
let folder;
try {
  if (control) {
    const spec = controls[control], source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert(!spec.from.includes('\n'), 'Control uses a single-line source anchor');
    assert.equal(source.split(spec.from).length - 1, 1, control + ' binds exactly one source anchor');
    const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source, 'Control must change imported code');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/career-entry-guide-'));
    const copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: copy });
  }
  const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  const independent = control ? controls[control].baseline || titles.baseline : '';
  if (control) args.push('--testNamePattern', [controls[control].test, independent].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Runner completes without interruption');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|Transform failed|Failed to (?:resolve import|load)|Cannot find module/, 'Runtime failures do not earn control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(result => result.assertionResults), count = Object.keys(titles).length;
  assert.equal(rows.length, count); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const failed = rows.filter(row => row.status === 'failed'), passed = rows.filter(row => row.status === 'passed');
  if (control) {
    assert.equal(run.status, 1); assert.deepEqual(failed.map(row => row.title), [controls[control].test]);
    assert.deepEqual(passed.map(row => row.title), [independent]);
    assert.equal(rows.filter(row => ['pending', 'skipped'].includes(row.status)).length, count - 2);
    const failure = failed.flatMap(row => row.failureMessages).join('\n');
    assert.match(failure, /AssertionError/); assert.doesNotMatch(failure, /TypeError|ReferenceError|TestingLibraryElementError|Timed out/);
  } else {
    assert.equal(run.status, 0); assert.equal(failed.length, 0); assert.equal(passed.length, count);
    assert.deepEqual(new Set(passed.map(row => row.title)), new Set(Object.values(titles)));
  }
  console.log(`simCareerEntryGuide ${control || 'normal'}: intended guide outcomes and independent baseline passed.`);
} finally {
  if (folder) {
    assert(path.resolve(folder).startsWith(path.join(root, '.sim-control') + path.sep), 'Cleanup stays inside the owned workspace');
    await rm(folder, { recursive: true, force: true }); await rmdir(path.join(root, '.sim-control')).catch(() => {});
  }
  for (const verify of held) await verify();
}
