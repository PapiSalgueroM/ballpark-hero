/* Real decision applications and transient receipts, with copied-source controls. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), self = fileURLToPath(import.meta.url);
const board = 'src/components/us-career/UsCareerBoard.tsx', helper = 'src/lib/usCareerDecisionOutcome.ts';
const card = 'src/components/us-career/CareerDecisionOutcome.tsx', testFile = 'src/test/careerDecisionOutcome.test.tsx';
const titles = {
  trade: 'applies the real third-season NBA trade once before its quality draw and keeps the full save on return',
  capped: 'shows each real sport choice as the actual capped change and saves it once',
  signs: 'reports negative effects and real endorsement earnings without calling them cash',
  rapid: 'consumes same-frame choices once and accepts the next ordinary event',
  continue: 'continues with no extra draws writes season or completion and restores Play focus',
  reload: 'reloads the applied career without replaying its transient receipt or choice',
  units: 'keeps team contract salary cash and earnings changes in their own units',
  legacy: 'uses Not recorded for missing legacy sides and preserves known zero changes',
  unchanged: 'shows an honest unchanged outcome when a real capped option changes nothing',
  expand: 'expands every applied change without hiding Continue or changing its payload',
  baseline: 'preserves real ordinary engine choices and the existing rivalry receipt independently',
};
const controls = {
  delta: { file: helper, from: 'to - from : null', to: 'to - from + 1 : null', test: titles.capped },
  direction: { file: helper, from: "difference < 0 ? '-'", to: "difference < 0 ? '+'", test: titles.signs },
  snapshot: { file: board, from: 'before: career, after: c, teamLabel: sport.teamLabelOf,', to: 'before: c, after: c, teamLabel: sport.teamLabelOf,', test: titles.capped },
  choice: { file: board, from: 'choice: pendingEvent.options[idx].label,', to: 'choice: pendingEvent.title,', test: titles.capped },
  apply: { file: board, from: 'const outcome = pendingEvent.options[idx].apply(c, Math.random);', to: "const outcome = 'Choice skipped';", test: titles.capped },
  rapid: { file: board, from: ' || consumedEvent.current === pendingEvent', to: '', test: titles.rapid },
  drawOrder: { file: board, from: 'const outcome = pendingEvent.options[idx].apply(c, Math.random);', to: 'const earlyQuality = sport.rollTeamQuality(teamQuality, Math.random); const outcome = pendingEvent.options[idx].apply(c, Math.random);',
    also: [{ from: 'const tq = sport.rollTeamQuality(teamQuality, Math.random);', to: 'const tq = earlyQuality;' }], test: titles.rapid },
  tradeDrawOrder: { file: board, from: 'const outcome = pendingEvent.options[idx].apply(c, Math.random);', to: 'const earlyQuality = sport.rollTeamQuality(teamQuality, Math.random); const outcome = pendingEvent.options[idx].apply(c, Math.random);',
    also: [{ from: 'const tq = sport.rollTeamQuality(teamQuality, Math.random);', to: 'const tq = earlyQuality;' }], test: titles.trade },
  tradeTeam: { file: board, from: 'const tq = sport.rollTeamQuality(teamQuality, Math.random);', to: 'const tq = sport.rollTeamQuality(teamQuality, Math.random); c.team = career.team;', test: titles.trade },
  persist: { file: board, from: 'setFeed(f => [outcome, ...f].slice(0, 6));', to: 'setFeed(f => [outcome, ...f].slice(0, 6)); c.earnings = career.earnings;', test: titles.reload },
  continueDraw: { file: board, from: 'decisionReturn.current = true;', to: 'decisionReturn.current = true; Math.random();', test: titles.continue },
  continueWrite: { file: board, from: 'decisionReturn.current = true;', to: "decisionReturn.current = true; persist(career, 'season', teamQuality);", test: titles.continue },
  continueSeason: { file: board, from: 'decisionReturn.current = true;', to: 'decisionReturn.current = true; playSeason();', test: titles.continue },
  continueFocus: { file: board, from: 'const target = careerEntryButton.current;', to: 'const target = null as HTMLButtonElement | null;', test: titles.continue },
  continueButton: { file: card, from: 'onClick={onContinue}', to: 'onClick={() => undefined}', test: titles.continue },
  team: { file: helper, from: 'if (before.team !== after.team)', to: 'if (false)', test: titles.units },
  earnings: { file: helper, from: "{ key: 'earnings', label: 'Career earnings', money: true }", to: "{ key: 'earnings', label: 'Cash', money: true }", test: titles.signs },
  money: { file: helper, from: 'money ? `$${amount(value)}M` : amount(value)', to: 'money ? amount(value) : amount(value)', test: titles.units },
  contract: { file: helper, from: "{ key: 'contractYears', label: 'Contract years' }", to: "{ key: 'contractYears', label: 'Contract years', money: true }", test: titles.units },
  precision: { file: helper, from: 'Number(value.toFixed(6))', to: 'Number(value.toFixed(0))', test: titles.units },
  missing: { file: helper, from: "const format = (value: unknown) => finite(value) ? money ? `$${amount(value)}M` : amount(value) : 'Not recorded';", to: "const format = (value: unknown) => finite(value) ? money ? `$${amount(value)}M` : amount(value) : '0';", test: titles.legacy },
  unknownDelta: { file: helper, from: 'const difference = finite(from) && finite(to) ? to - from : null;', to: 'const difference = finite(from) && finite(to) ? to - from : 0;', test: titles.legacy },
  unchanged: { file: helper, from: 'from === to || (!finite(from) && !finite(to))', to: '(!finite(from) && !finite(to))', test: titles.unchanged },
  collapsed: { file: card, from: 'outcome.changes.slice(0, 4)', to: 'outcome.changes.slice(0, 2)', test: titles.expand },
  expand: { file: card, from: 'const shown = expanded ? outcome.changes : outcome.changes.slice(0, 4);', to: 'const shown = outcome.changes.slice(0, 4);', test: titles.expand },
};
const control = process.env.CAREER_DECISION_OUTCOME_CONTROL || '';
assert(!control || control === 'all' || control in controls, 'Known decision-outcome control');
const evidence = path.resolve(process.env.CAREER_DECISION_OUTCOME_ARTIFACTS || path.join(root, 'career-decision-outcome-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const mode of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAREER_DECISION_OUTCOME_CONTROL: mode, CAREER_DECISION_OUTCOME_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${mode || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    outcomes.push({ control: mode || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} career decision outcome ${mode || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCareerDecisionOutcome')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert(outcomes.every(row => row.passed), 'Every normal and control mode passed; all modes were attempted');
  console.log(`simCareerDecisionOutcome: ${Object.keys(titles).length} mounted cases and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = [];
for (const relative of [board, helper, card, testFile, 'src/test/fixtures/careerDecisionOutcome1009.ts', ...['nba', 'nfl', 'mlb', 'nhl'].map(s => `src/lib/${s}MyCareer.ts`)]) {
  const file = path.join(root, relative), bytes = await readFile(file);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, relative + ' raw bytes held')));
}
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
let folder;
try {
  if (control) {
    const spec = controls[control], source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    let changed = source;
    for (const edit of [spec, ...(spec.also || [])]) {
      assert(!edit.from.includes('\n'), control + ' uses a single-line anchor');
      assert.equal(changed.split(edit.from).length - 1, 1, control + ' binds exactly one executable anchor');
      const prior = changed; changed = changed.replace(edit.from, edit.to); assert.notEqual(changed, prior);
    }
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/career-decision-outcome-'));
    const copy = path.join(folder, path.basename(spec.file)); await writeFile(copy, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: copy });
  }
  const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, titles.baseline].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
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
    assert.deepEqual(passed.map(row => row.title), [titles.baseline]);
    assert.equal(rows.filter(row => ['pending', 'skipped'].includes(row.status)).length, count - 2);
    const failure = failed.flatMap(row => row.failureMessages).join('\n');
    assert.match(failure, /AssertionError/); assert.doesNotMatch(failure, /TypeError|ReferenceError|TestingLibraryElementError|Timed out/);
  } else {
    assert.equal(run.status, 0); assert.equal(failed.length, 0); assert.equal(passed.length, count);
    assert.deepEqual(new Set(passed.map(row => row.title)), new Set(Object.values(titles)));
  }
  console.log(`simCareerDecisionOutcome ${control || 'normal'}: intended assertions and independent ordinary/rivalry baseline passed.`);
} finally {
  if (folder) {
    assert(path.resolve(folder).startsWith(path.join(root, '.sim-control') + path.sep), 'Control cleanup stays in its workspace');
    await rm(folder, { recursive: true, force: true }); await rmdir(path.join(root, '.sim-control')).catch(() => {});
  }
  for (const verify of held) await verify();
}
