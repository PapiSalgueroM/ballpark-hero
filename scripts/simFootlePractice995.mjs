/* Actual model, hook and page outcomes with exact copied-source controls. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const model = 'src/lib/footlePracticeRun.ts', logic = 'src/lib/gameLogic.ts', hook = 'src/hooks/useGame.ts', page = 'src/pages/Footle.tsx';
const unitFile = 'src/lib/footlePracticeRun.test.ts';
const tierTitles = ['easy', 'hard', 'insane'].map(tier => `selects five distinct ${tier} answers excluding the daily`);
const titles = {
  short: 'refuses a short tier instead of borrowing another difficulty',
  aliases: 'treats accent aliases as one identity for daily exclusion and distinct answers',
  guards: 'caps misses and makes duplicate guesses and next inputs inert',
  frozen: 'round trips a frozen pool and preserves null versus measured zero',
  corrupt: 'rejects corrupt nested snapshots and impossible progress',
  finished: 'finishes only after five outcomes and retains real attempt totals',
  leagues: 'compares known leagues and keeps either unknown league neutral',
  continent: 'places Guinea-Bissau with Africa rather than European nationality clues',
  numeric: 'keeps unknown goals and assists neutral while real zero still compares',
};
const mounted = {
  complete: 'finishes five puzzles with the exact receipt and untouched daily record',
  unlimited: 'starts the first Unlimited puzzle from the resolved pool',
  guards: 'ignores duplicate guesses and double next inputs at the hook boundary',
  isolation: 'keeps practice difficulty separate from a played Unlimited puzzle',
  entry: 'offers practice from the daily result without resetting that result',
  rules: 'shows worked rules and derives examples from a loaded non-answer player',
  corrupt: 'rejects a corrupt saved run and permits a clean replacement',
  save: 'reports a failed save while keeping the current run playable',
  flags: 'prints the answer nationality with its flag in the feedback line, the Nation row and the example',
  noflag: 'prints a nationality with no flag code as its bare name, never a wrong flag',
  short: 'disables a short practice tier rather than starting fewer puzzles',
};
const mapper = 'preserves unknown counts and real zero in both fetched tiers';
const groups = {
  model: { files: [unitFile], titles: [...tierTitles, ...Object.values(titles)] },
  mounted: { files: ['src/test/footlePractice.test.tsx'], titles: Object.values(mounted) },
  fetch: { files: ['src/lib/fetchFootlePlayerPool.test.ts'], titles: ['returns an empty pool when either obscure query fails', 'keeps the famous and obscure tiers on a complete successful fetch', 'keeps the empty fallback behavior when the famous query fails', mapper] },
};
const controls = {
  tier: { file: model, anchor: 'player.difficulty !== tier || seen.has(key)', replacement: 'seen.has(key)', failed: [tierTitles[1], tierTitles[2], titles.short, titles.frozen] },
  daily: { file: model, anchor: 'new Set<string>([identity(dailyName)])', replacement: 'new Set<string>()', failed: [...tierTitles, titles.aliases] },
  aliases: { file: model, anchor: 'const identity = normalizeName;', replacement: 'const identity = (name: string) => name.trim().toLowerCase();', failed: [titles.aliases] },
  distinct: { file: model, anchor: 'targets: candidates.slice(0, PRACTICE_LENGTH).map(player => player.name)', replacement: 'targets: candidates.slice(0, PRACTICE_LENGTH).map(() => candidates[0].name)', failed: [...tierTitles, titles.aliases, titles.frozen, titles.finished] },
  short: { file: model, anchor: 'if (candidates.length < PRACTICE_LENGTH) return null;', replacement: '', failed: [titles.short] },
  duplicate: { file: model, anchor: ' || round.guesses.includes(name)', replacement: '', failed: [titles.guards] },
  next: { file: model, anchor: "run.rounds[run.index].status === 'playing' || run.index >= PRACTICE_LENGTH - 1", replacement: 'run.index >= PRACTICE_LENGTH - 1', failed: [titles.guards] },
  limit: { file: model, anchor: "guesses.length >= MAX_GUESSES ? 'lost'", replacement: "guesses.length > MAX_GUESSES ? 'lost'", failed: [titles.guards] },
  frozen: { file: model, anchor: '}).map(player => ({ ...player }));', replacement: '}).map(player => player);', failed: [titles.frozen] },
  corrupt: { file: model, anchor: 'const run = JSON.parse(raw) as FootlePracticeRun;', replacement: 'const run = JSON.parse(raw) as FootlePracticeRun; return run;', failed: [titles.corrupt] },
  finish: { file: model, anchor: "return run.index === PRACTICE_LENGTH - 1 && run.rounds[run.index].status !== 'playing';", replacement: "return run.index >= PRACTICE_LENGTH - 2 && run.rounds[run.index].status !== 'playing';", failed: [titles.finished] },
  leagues: { file: logic, anchor: "if (!guessLeague || !targetLeague || guessLeague === 'Other' || targetLeague === 'Other')", replacement: 'if (false)', failed: [titles.leagues] },
  continent: { file: logic, anchor: "'Guinea-Bissau': 'Africa'", replacement: "'Guinea-Bissau': 'Europe'", failed: [titles.continent] },
  numeric: { file: logic, anchor: 'if (guessVal === null || targetVal === null)', replacement: 'if (false)', failed: [titles.numeric] },
  mapper: { group: 'fetch', file: 'src/lib/fetchFootlePlayerPool.ts', anchor: 'goals: row.goals,', replacement: 'goals: row.goals ?? 0,', count: 2, failed: [mapper] },
  assists: { group: 'fetch', file: 'src/lib/fetchFootlePlayerPool.ts', anchor: 'assists: row.assists,', replacement: 'assists: row.assists ?? 0,', count: 2, failed: [mapper] },
  completion: { group: 'mounted', file: hook, anchor: "useGameCompletion('footle', effectiveDailyStatus !== 'playing', dailyScore);", replacement: "useGameCompletion('footle', gameStatus !== 'playing', dailyScore);", failed: [mounted.complete, mounted.unlimited] },
  receipt: { group: 'mounted', file: page, anchor: 'total + round.guesses.length, 0)', replacement: 'total + round.guesses.length + 1, 0)', failed: [mounted.complete] },
  saving: { group: 'mounted', file: hook, anchor: 'setPracticeSaveFailed(true);', replacement: 'setPracticeSaveFailed(false);', failed: [mounted.save] },
  focus: { group: 'mounted', file: page, anchor: 'practicePanel.current?.focus({ preventScroll: true });', replacement: 'void 0;', failed: [mounted.complete, mounted.entry] },
  rules: { group: 'mounted', file: page, anchor: 'These example numbers are hypothetical.', replacement: 'These example numbers.', failed: [mounted.rules] },
  example: { group: 'mounted', file: hook, anchor: 'const examplePlayer = playerPool.find(player => player.name !== dailyTarget?.name', replacement: 'const examplePlayer = playerPool.find(player => player.name === dailyTarget?.name', failed: [mounted.rules] },
  loading: { group: 'mounted', file: hook, mutations: [
    { anchor: "if (mode !== 'unlimited' || isLoadingPool || !dailyTarget) return;", replacement: "if (mode !== 'unlimited' || !dailyTarget) return;" },
    { anchor: 'const unlimitedTarget = isLoadingPool || unlimitedPaused ? null : savedUnlimitedTarget;', replacement: 'const unlimitedTarget = unlimitedPaused ? null : savedUnlimitedTarget;' },
  ], failed: [mounted.unlimited], failurePattern: /Unlimited must wait for the resolved player pool/ },
  ready: { group: 'mounted', file: hook, anchor: 'practiceCandidates(playerPool, practiceDifficulty, dailyTarget.name).length >= 5', replacement: 'practiceCandidates(playerPool, practiceDifficulty, dailyTarget.name).length >= 1', failed: [mounted.short], failurePattern: /expect\(element\)\.toBeDisabled\(\)[\s\S]*Received element is not disabled:[\s\S]*data-testid="practice-start"/ },
  isolation: { group: 'mounted', file: hook, anchor: 'if (!practiceRef.current || practiceFinished(practiceRef.current)) setPracticeDifficulty(newDiff);', replacement: 'if (!practiceRef.current || practiceFinished(practiceRef.current)) { setPracticeDifficulty(newDiff); saveUnlimited({ ...unlimitedRef.current, tier: newDiff }); }', failed: [mounted.isolation] },
};
const mode = process.env.FOOTLE_PRACTICE_CONTROL || '';
assert.ok(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known practice control');
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const folder = await mkdtemp(path.join(parent, 'footle995-'));
const output = path.join(root, 'footle-practice-artifacts/behavior'); await mkdir(output, { recursive: true });
const sources = new Map();
for (const relative of new Set(Object.values(controls).map(control => control.file))) sources.set(relative, await readFile(path.join(root, relative)));
const outcomes = [], problems = [];
try {
  const modes = mode === 'all' ? [...Object.keys(groups).map(group => ({ group })), ...Object.keys(controls).map(control => ({ control }))] : mode ? [{ control: mode }] : Object.keys(groups).map(group => ({ group }));
  for (const entry of modes) {
    const control = controls[entry.control], group = groups[control?.group ?? entry.group ?? 'model'];
    const name = entry.control || `normal-${entry.group}`, env = { ...process.env, FORCE_COLOR: '0' };
    try {
    delete env.NO_DOUBLE_SWAP;
    if (control) {
      const source = sources.get(control.file).toString('utf8').replaceAll('\r\n', '\n');
      let changed = source;
      for (const mutation of control.mutations ?? [control]) {
        assert.equal(changed.split(mutation.anchor).length - 1, mutation.count ?? 1, `${name}: exact executable mutation anchors exist`);
        const next = changed.replaceAll(mutation.anchor, mutation.replacement);
        assert.notEqual(next, changed, `${name}: each mutation changed executable code`);
        changed = next;
      }
      assert.notEqual(changed, source, `${name}: control changed executable code`);
      const copy = path.join(folder, path.basename(control.file)); await writeFile(copy, changed);
      env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + control.file.slice(4).replace(/\.tsx?$/, '')]: copy });
    }
    const reportPath = path.join(output, `${name}.json`);
    const child = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...group.files, '--reporter=json', '--outputFile.json=' + reportPath, '--maxWorkers=1', '--no-file-parallelism'], {
      cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    });
    const log = `${child.stdout || ''}\n${child.stderr || ''}`; await writeFile(path.join(output, `${name}.log`), log);
    assert.ok(!child.error && !child.signal, `${name}: actual tests finish normally`);
    assert.doesNotMatch(log, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|SyntaxError|TypeError|ReferenceError|Cannot find module|not wrapped in act/, `${name}: no infrastructure failure is credited`);
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    const rows = report.testResults.flatMap(file => file.assertionResults);
    assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
    assert.deepEqual(rows.map(row => row.title).sort(), [...group.titles].sort(), `${name}: exact expected cases execute`);
    assert.ok(rows.every(row => ['passed', 'failed'].includes(row.status)), `${name}: no skipped outcomes`);
    const rejected = rows.filter(row => row.status === 'failed'), expected = control?.failed ?? [];
    assert.deepEqual(rejected.map(row => row.title).sort(), [...expected].sort(), `${name}: exact intended outcomes reject`);
    assert.equal(child.status, expected.length ? 1 : 0);
    for (const row of rejected) {
      const message = row.failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g, '');
      assert.match(message, control?.failurePattern ?? /AssertionError|expected |Expected /, 'Only intended assertion failures count');
      assert.doesNotMatch(message, /TypeError|ReferenceError|SyntaxError|Timed out|Unable to find|Found multiple/, 'Controls must reach assertions');
    }
    for (const row of rows) console.log(`${name} ${row.status.toUpperCase()}: ${row.title}`);
    outcomes.push({ mode: name, total: rows.length, passed: rows.length - rejected.length, rejected: rejected.map(row => row.title), expected });
    for (const [relative, bytes] of sources) assert.deepEqual(await readFile(path.join(root, relative)), bytes, `${relative}: product bytes held`);
    } catch (error) {
      problems.push({ mode: name, name: error.name, message: error.message });
      console.error(`${name}: UNEXPECTED FAILURE: ${error.message}`);
    }
  }
  await writeFile(path.join(output, 'verified-summary.json'), JSON.stringify({ outcomes, problems, sourceSha256: Object.fromEntries([...sources].map(([file, bytes]) => [file, createHash('sha256').update(bytes).digest('hex')])), scope: 'Actual models and mounted page/hook outcomes with frozen fictional fixtures. Effective copied-source controls. Native built-site verification is separate; no live database audit.' }, null, 2));
  assert.deepEqual(problems, [], 'Every mode must satisfy the unchanged exact outcome assertions');
  console.log(`Footle practice: ${outcomes.length} modes completed, every expected case executed and exact controls verified.`);
} finally {
  assert.equal(path.dirname(folder), parent); assert.ok(path.basename(folder).startsWith('footle995-'));
  await rm(folder, { recursive: true, force: true });
  for (const [relative, bytes] of sources) assert.deepEqual(await readFile(path.join(root, relative)), bytes, 'Product source held after owned cleanup');
}
