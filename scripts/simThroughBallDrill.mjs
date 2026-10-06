/* Round 1032: the Through Ball drill, Soccer Career's CM and CAM position
   drill, played for real: the rules module and the rendered board, through
   src/test/throughBallDrill.test.ts and src/test/throughBallBoard.test.tsx.

   What it holds (each a named test in those files):
     - ONE SEED, ONE RUN: the daily is the same ten runs for a seed, the next
       day differs, every older drill keeps its seed, the same input settles
       the same way twice.
     - THE STATED MAXIMUM: the perfect input (played on the cue, into his
       stride) scores 100 on each of 120 sampled days.
     - SKILL GAPS: a better judge of weight beats a worse one at three gaps,
       and a better all round player beats a worse one at three gaps, on
       paired seeds. Measured 2026-10-06 over five batches of 240 runs:
       weight +-0.03/0.06/0.10/0.18 scored 100.0 / 89.2 to 90.0 / 55.6 to
       56.7 / 31.2 to 31.7, gaps 10.0 to 10.8, 33.0 to 34.4, 24.7 to 25.4,
       held at floors 5, 16, 12; all round 0.6/1/1.4/2 scored 99.5 / 87.5 to
       89.0 / 66.1 to 68.3 / 33.6 to 36.4, gaps 10.5 to 12.1, 20.4 to 21.5,
       31.6 to 32.8, held at 5, 10, 15. The best of 729 fixed inputs scored
       10.5 to 12.4 against 87.5 to 89.2 for all round skill 1 (floor 50).
       A noisy player converts 0.739 to 0.751 of the first three balls and
       0.489 to 0.547 of the last three (floor 0.1).
     - BANKING: Passing through drillStatFor and applyDrillResult, +2 at 80,
       +1 at 50, capped by the ceiling, once a season shared with every
       other drill, and the board banks once before the callback.
     - REDUCED MOTION IS STATIC: the runner does not move while the clock
       runs, and the settled pass is drawn where it ended at once.

   Negative controls, THROUGH_BALL_CONTROL=<name>, each rewriting one asserted
   line in a copy of the source and pointing the suite at it through the
   NO_DOUBLE_SWAP alias in vitest.config.ts. Each refuses to run unless its
   anchor appears exactly the expected number of times.
     weight        the ball rolls the same distance whatever the weight, so
                   the weight skill gap test must go red
     replay        the runner's hold is drawn from Math.random, so the daily
                   replay test must go red
     offsideearly  the flag goes up a quarter second early, so the perfect
                   pass is offside and the stated maximum test must go red
     bankstat      Through Ball banks Shooting, so the banking test goes red
     twice         a second session in a season banks again (the shared once
                   a season rule removed), so the banking test goes red
     bank          the board saves the bank as unbanked, so the board's bank
                   test goes red
     reduced       the runner moves under reduced motion, so the static
                   pitch test goes red

   Run: node scripts/simThroughBallDrill.mjs  (vitest is found by walking up
   from the repo root, so a worktree runs it without a copy). */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.THROUGH_BALL_CONTROL || '';
const sources = {
  engine: { file: 'src/lib/throughBallDrill.ts', alias: '@/lib/throughBallDrill', relative: [["'./arcade'", "'@/lib/arcade'"], ["'./firstTouchDrill'", "'@/lib/firstTouchDrill'"]] },
  drills: { file: 'src/lib/careerDrills.ts', alias: '@/lib/careerDrills', relative: [["'./arcade'", "'@/lib/arcade'"], ["'./freeKick'", "'@/lib/freeKick'"], ["'./soccerCareerEngine'", "'@/lib/soccerCareerEngine'"]] },
  board: { file: 'src/components/soccer-career/ThroughBallBoard.tsx', alias: '@/components/soccer-career/ThroughBallBoard', relative: [["'./ThroughBallBoard.module.css'", "'@/components/soccer-career/ThroughBallBoard.module.css'"]] },
};
const controls = {
  weight: { source: 'engine', changes: [['const dist = clamp(weight, 0, 1) * MAX_PASS;', 'const dist = 0.6 * MAX_PASS;', 1]], failure: /a better judge of weight outscores a worse one at three skill gaps/ },
  replay: { source: 'engine', changes: [['const hold = rounded(0.5 + rng() * 0.7);', 'const hold = rounded(0.5 + Math.random() * 0.7);', 1]], failure: /deals Through Ball to CM and CAM, keeps every old seed and replays one daily for a seed/ },
  offsideearly: { source: 'engine', changes: [["if (!(press <= crossTime(setup))) return settle('offside');", "if (!(press <= crossTime(setup) - 0.25)) return settle('offside');", 1]], failure: /scores the stated maximum, 100, for the perfect input on every sampled day/ },
  bankstat: { source: 'drills', changes: [["if (kind === 'throughball') return trainingStatFor(position, 'passing');", "if (kind === 'throughball') return trainingStatFor(position, 'shooting');", 1]], failure: /banks Passing through the shared season pipeline, once, capped by the ceiling/ },
  twice: { source: 'drills', changes: [['  if (prev.trainingSeasonYear === year) return prev;', '', 1]], failure: /banks Passing through the shared season pipeline, once, capped by the ceiling/ },
  bank: { source: 'board', changes: [['save({ ...recordRef.current, banked: true });', 'save({ ...recordRef.current, banked: false });', 1]], failure: /completes ten, blocks a daily replay and banks Passing once before the callback/ },
  reduced: { source: 'board', changes: [["reduced && phase === 'playing' ? setup.start : ", '', 1]], failure: /keeps a reduced motion pitch static while the same clock plays the same pass/ },
};
assert.ok(!control || control in controls, `Unknown Through Ball control ${control}`);

/* A worktree has no node_modules of its own and resolves the main tree's by
   walking up, so the runner does the same rather than hard coding root. */
function findVitest() {
  for (let dir = root; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules/vitest/vitest.mjs');
    if (existsSync(candidate)) return candidate;
    if (path.dirname(dir) === dir) throw new Error('vitest not found above ' + root);
  }
}

const originals = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([key, spec]) => [key, await readFile(path.join(root, spec.file), 'utf8')])));
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '2200' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const spec = controls[control];
    const source = sources[spec.source];
    let changed = originals[spec.source].replace(/\r\n/g, '\n');
    for (const [anchor, replacement, count] of spec.changes) {
      assert.equal(changed.split(anchor).length - 1, count, `Control ${control} must find its anchor exactly ${count} time(s) in ${source.file}`);
      changed = changed.replaceAll(anchor, replacement);
    }
    assert.notEqual(changed, originals[spec.source].replace(/\r\n/g, '\n'), 'Control must change actual code');
    for (const [relative, resolved] of source.relative) {
      assert.equal(changed.split(relative).length - 1, 1, `Temporary copy must resolve ${relative}`);
      changed = changed.replace(relative, resolved);
    }
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/through-ball-'));
    copy = path.join(folder, path.basename(source.file));
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [source.alias]: copy });
    console.log(`NEGATIVE CONTROL ON: ${control} (${source.file})`);
  }
  const run = spawnSync(process.execPath, [findVitest(), 'run', 'src/test/throughBallDrill.test.ts', 'src/test/throughBallBoard.test.tsx', '--reporter=verbose'], {
    cwd: root, env, encoding: 'utf8', timeout: 600000,
  });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output.split('\n').filter(line => /✓|×|FAIL|Through Ball|Tests |Test Files|Error/.test(line)).slice(0, 80).join('\n') + '\n');
  assert.ok(!run.error, String(run.error));
  assert.match(output, /throughBallDrill\.test\.ts/, 'The rules tests must execute');
  assert.match(output, /throughBallBoard\.test\.tsx/, 'The rendered board tests must execute');
  if (control) {
    assert.notEqual(run.status, 0, 'The changed behaviour must fail an outcome');
    assert.match(output, /Tests\s+\d+ failed.*\d+ passed/, 'Intended failures and unchanged green outcomes must both be reported');
    assert.match(output, new RegExp('FAIL[^\\n]*' +controls[control].failure.source), 'The intended outcome test must be in the actual failure report');
    assert.match(output, /AssertionError|TestingLibraryElementError|expected .* to/i, 'A real assertion must fail rather than module resolution');
    assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|No test files found/);
    console.log(`simThroughBallDrill ${control}: the control fired its intended test and the rest stayed green, the check works.`);
  } else {
    assert.equal(run.status, 0, output.slice(-7000));
    assert.match(output, /Tests\s+17 passed/);
    assert.match(output, /weight ladder over 240 paired runs/);
    assert.match(output, /all round ladder over 240 paired runs/);
    console.log('simThroughBallDrill: green. Seventeen rules and board checks passed: one seed one run, the perfect pass scores 100, skill beats spam at every measured gap, Passing banks once a season, and reduced motion holds still.');
  }
  for (const [key, spec] of Object.entries(sources)) assert.equal(await readFile(path.join(root, spec.file), 'utf8'), originals[key], 'Controls must leave the shared source untouched');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
