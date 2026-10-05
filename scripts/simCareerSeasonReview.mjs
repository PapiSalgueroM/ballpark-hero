/* Mounted saved-season outcomes. Copied-source controls never edit live source. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url);
const component = 'src/components/us-career/CareerSeasonReview.tsx';
const helper = 'src/lib/usCareerSeasonReview.ts', board = 'src/components/us-career/UsCareerBoard.tsx';
const testFile = 'src/test/careerSeasonReview.test.tsx';
const titles = {
  nba: 'shows the saved NBA regular and postseason values separately',
  nfl: 'shows NFL passing and defensive stats for their saved positions',
  mlb: 'distinguishes MLB batting starts and relief appearances from saved stats',
  nhl: 'distinguishes NHL attackers defenders and goalies in both season phases',
  compare: 'compares saved seasons exactly and returns focus to the selected year',
  legacy: 'keeps missing legacy fields honest and records real zero values',
  suspended: 'shows suspended seasons without inventing regular or postseason performances',
  live: 'opens each live Career Log and returns without saves draws or completion calls',
  retired: 'reviews retired careers and restores the retirement opener without paying again',
  baseline: 'restores existing retirement legacy and exact save bytes without another completion',
};
const controls = {
  nbaRegular: { file: helper, from: "number('Points per game', s.ppg)", to: "number('Points per game', s.poPpg)", test: titles.nba },
  nbaPostseason: { file: helper, from: "number('Assists per game', s.poApg)", to: "number('Assists per game', s.apg)", test: titles.nba },
  nflPassing: { file: helper, from: "number('Passing yards', s.passYds)", to: "number('Passing yards', s.ints)", test: titles.nfl },
  nflDefense: { file: helper, from: "number('Forced fumbles', s.forcedFum)", to: "number('Forced fumbles', s.passYds)", test: titles.nfl },
  mlbStarter: { file: helper, from: "const regular = pos === 'SP'", to: "const regular = pos === 'CF'", test: titles.mlb },
  mlbReliever: { file: helper, from: "    : pos === 'RP'", to: "    : pos === 'CF'", test: titles.mlb },
  mlbUnits: { file: helper, from: "gamesLabel: pos === 'SP' ? 'Starts' : pos === 'RP' ? 'Appearances' : 'Games'", to: "gamesLabel: 'Games'", test: titles.mlb },
  nhlGoalie: { file: helper, from: "pos === 'G' ? [number('Wins', s.wins)", to: "pos === 'C' ? [number('Wins', s.wins)", test: titles.nhl },
  nhlPostseason: { file: helper, from: "number('Save percentage', s.poSvpct, 3)", to: "number('Save percentage', s.svpct, 3)", test: titles.nhl },
  savedOvr: { file: component, from: '{recorded(season.ovr)}', to: '{recorded(career.ovr)}', test: titles.compare },
  savedGames: { file: component, from: '{recorded(season.games)}', to: '{recorded(season.games + 1)}', test: titles.compare },
  previous: { file: component, from: 'career.seasons[selected - 1]', to: 'career.seasons[selected]', test: titles.compare },
  age: { file: component, from: '{recorded(season.age)}', to: '{recorded(career.age)}', test: titles.compare },
  pay: { file: component, from: '`$${season.salary}M`', to: '`$${career.salary}M`', test: titles.compare },
  result: { file: component, from: "season.teamResult || 'Not recorded'", to: "'Result omitted'", test: titles.compare },
  awards: { file: component, from: "season.awards.join(', ')", to: "season.awards.slice(0, 1).join(', ')", test: titles.compare },
  focus: { file: component, from: 'lastSelected.current = index;', to: 'lastSelected.current = 0;', test: titles.compare },
  tabReset: { file: component, from: "setTab('Overview');", to: "setTab('Postseason');", test: titles.compare },
  legacy: { file: helper, from: "value: recorded(value) ? digits === undefined ? String(value) : value.toFixed(digits) : 'Not recorded',", to: "value: recorded(value) ? digits === undefined ? String(value) : value.toFixed(digits) : '0',", test: titles.legacy },
  suspended: { file: helper, from: "result === 'SUSPENDED'", to: 'false', test: titles.suspended },
  write: { file: component, from: 'lastSelected.current = index;', to: "lastSelected.current = index; localStorage.setItem(sport.saveKey, '{}');", test: titles.live },
  random: { file: component, from: 'lastSelected.current = index;', to: 'lastSelected.current = index; Math.random();', test: titles.live },
  completion: { file: component, changes: [
    { from: "import { cn } from '@/lib/utils';", to: "import { cn } from '@/lib/utils';\nimport { recordCompletion } from '@/lib/completions';" },
    { from: 'lastSelected.current = index;', to: 'lastSelected.current = index; recordCompletion(sport.gameSlug, 1);' },
  ], test: titles.live },
  returnFocus: { file: board, from: 'target?.focus({ preventScroll: true });', to: 'target?.blur();', test: titles.live },
  retiredBack: { file: board, from: "if (phase === 'retired') setRetiredReview(false);", to: "if (phase === 'retired') setRetiredReview(true);", test: titles.retired },
};
const control = process.env.CAREER_SEASON_REVIEW_CONTROL || '';
assert(!control || control === 'all' || control in controls, 'Known season-review control');
const evidence = path.resolve(process.env.CAREER_SEASON_REVIEW_ARTIFACTS || path.join(root, 'career-season-review-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const mode of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAREER_SEASON_REVIEW_CONTROL: mode, CAREER_SEASON_REVIEW_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${mode || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    outcomes.push({ control: mode || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} career season review ${mode || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCareerSeasonReview')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert(outcomes.every(row => row.passed), 'Every normal and control outcome passed; all modes were attempted');
  console.log(`simCareerSeasonReview: ${Object.keys(titles).length} mounted cases and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const held = [];
for (const relative of [component, helper, board, testFile, 'src/test/fixtures/careerSeasonReview1008.ts', ...['nba', 'nfl', 'mlb', 'nhl'].map(s => `src/lib/${s}CareerSport.ts`)]) {
  const file = path.join(root, relative), bytes = await readFile(file);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, relative + ' raw bytes held')));
}
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
let folder;
try {
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    let changed = source;
    for (const mutation of spec.changes || [spec]) {
      assert(!mutation.from.includes('\n'), control + ' uses a single-line anchor');
      assert.equal(changed.split(mutation.from).length - 1, 1, control + ' binds exactly one executable anchor');
      const next = changed.replace(mutation.from, mutation.to); assert.notEqual(next, changed); changed = next;
    }
    assert.notEqual(changed, source, control + ' changes executable source');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/career-season-review-'));
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
  console.log(`simCareerSeasonReview ${control || 'normal'}: intended assertions and independent retirement baseline passed.`);
} finally {
  if (folder) {
    assert(path.resolve(folder).startsWith(path.join(root, '.sim-control') + path.sep), 'Control cleanup stays in its workspace');
    await rm(folder, { recursive: true, force: true }); await rmdir(path.join(root, '.sim-control')).catch(() => {});
  }
  for (const verify of held) await verify();
}
