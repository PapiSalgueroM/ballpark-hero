/* Actual CBB Program Board, unchanged hook/save/completion/share over fictional deals.
   Native timing, geometry and real production boot are separate acceptance checks. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.CBB_PROGRAM_FEEDBACK_CONTROL || '';
const independent = 'holds independent original six-clue';
const staleAnchor = '  const previous = useRef(gameState);';
const staleCallback = `
  const handleGuess = (name: string) => {
    const captured = gameState;
    makeGuess(name);
    window.setTimeout(() => {
      if (captured?.gameStatus === 'playing') {
        setFeedback({ kind: 'wrong', turn: captured.guesses.length + 1, status: captured.gameStatus });
        window.setTimeout(() => setFeedback(null), 500);
      }
    }, 50);
  };`;
const controls = {
  stale: { test: 'never calls a committed first-clue win wrong', edits: [[staleAnchor, staleAnchor + staleCallback], ['onGuess={makeGuess}', 'onGuess={handleGuess}'], ['const shownFeedback = feedback && feedback.turn === guesses.length && feedback.status === gameStatus ? feedback : null;', 'const shownFeedback = feedback;']] },
  silent: { test: 'cues each actual repeated wrong append', edits: [["prior.gameStatus === 'playing' && gameState.guesses.length === prior.guesses.length + 1", 'false']] },
  cleanup: { test: 'clears reset and unmount timers', edits: [['return () => window.clearTimeout(timer);', 'return () => {};']] },
  settle: { test: 'keeps unchanged clones and empty initial state quiet', edits: [['window.setTimeout(() => setFeedback(null), 600);', 'window.setTimeout(() => setFeedback(null), 6000);']] },
  exhausted: { test: 'reports the exhausted last miss truthfully', edits: [["isOver ? 'Wrong guess. The answer is below.' : 'Wrong guess! Try again...'", "'Wrong guess! Try again...'"]] },
  finite: { test: 'binds finite once-only cues', css: true, edits: [['programReply 420ms ease-out 1;', 'programReply 420ms ease-out infinite;'], ['programWon 420ms ease-out 1;', 'programWon 420ms ease-out infinite;'], ['programLost 420ms ease-out 1;', 'programLost 420ms ease-out infinite;']] },
  reduced: { test: 'binds finite once-only cues', css: true, edits: [['.reply, .won, .lost { animation: none; }', '.reply, .won, .lost { animation: programReply 420ms ease-out 1; }']] },
  names: { test: 'binds complete previous-guess text', edits: [['${feedbackStyles.guessName} px-3 py-1', 'px-3 py-1']] },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Unknown CBB program feedback control');
const pageFile = 'src/components/cbb-program/CbbProgramBoard.tsx';
const cssFile = 'src/components/cbb-program/CbbProgramFeedback.module.css';
const held = [pageFile, cssFile, 'src/hooks/useCbbProgram.ts', 'src/lib/cbbPrograms.ts', 'src/types/cbbProgram.ts', 'src/components/cbb-program/CbbProgramSearch.tsx', 'src/components/cbb-program/CbbProgramHowToPlay.tsx', 'src/lib/dailyRecord.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts', 'src/components/game/ShareButtons.tsx'];
const verifyBytes = [];
for (const file of held) { const bytes = await readFile(path.join(root, file)); verifyBytes.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, bytes, 'Only owned disposable copies may change'))); }
const page = (await readFile(path.join(root, pageFile), 'utf8')).replace(/\r\n/g, '\n');
const css = (await readFile(path.join(root, cssFile), 'utf8')).replace(/\r\n/g, '\n');
let folder;
const created = [];
try {
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' }; delete env.NO_DOUBLE_SWAP; delete env.CBB_PROGRAM_FEEDBACK_CSS;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/cbbProgramFeedback.test.tsx', '--reporter=verbose', '--testTimeout=60000', '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control]; let changed = spec.css ? css : page;
    for (const [anchor, replacement] of spec.edits) { assert.equal(changed.split(anchor).length - 1, 1, 'Control changes one unique actual binding'); const before = changed; changed = changed.replace(anchor, replacement); assert.notEqual(changed, before); }
    await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/cbb-program-feedback-'));
    const copy = path.join(folder, spec.css ? 'CbbProgramFeedback.module.css' : 'CbbProgramBoard.tsx');
    if (spec.css) {
      env.CBB_PROGRAM_FEEDBACK_CSS = copy;
      let boundPage = page;
      for (const name of ['CbbProgramSearch', 'CbbProgramHowToPlay', 'CbbProgramFeedback.module.css']) { const anchor = `from './${name}'`; assert.equal(boundPage.split(anchor).length - 1, 1); boundPage = boundPage.replace(anchor, `from '@/components/cbb-program/${name}'`); }
      const pageCopy = path.join(folder, 'CbbProgramBoard.tsx'); created.push(pageCopy); await writeFile(pageCopy, boundPage);
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/cbb-program/CbbProgramBoard': pageCopy, '@/components/cbb-program/CbbProgramFeedback.module.css': copy });
    } else {
      for (const name of ['CbbProgramSearch', 'CbbProgramHowToPlay']) { const anchor = `from './${name}'`; assert.equal(changed.split(anchor).length - 1, 1); changed = changed.replace(anchor, `from '@/components/cbb-program/${name}'`); }
      const anchor = "from './CbbProgramFeedback.module.css'"; assert.equal(changed.split(anchor).length - 1, 1); changed = changed.replace(anchor, "from '@/components/cbb-program/CbbProgramFeedback.module.css'");
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/cbb-program/CbbProgramBoard': copy });
    }
    created.push(copy); await writeFile(copy, changed); args.push('--testNamePattern', spec.test + '|' + independent);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error, String(run.error)); assert.equal(run.signal, null, 'Terminated runners earn no credit');
  assert.match(output, /cbbProgramFeedback\.test\.tsx/);
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Collection and timeout errors earn no control credit');
  if (control) {
    assert.equal(run.status, 1); assert.match(output, /Tests\s+1 failed.*1 passed.*8 skipped/);
    assert.match(output, new RegExp('FAIL[^\n]*' + controls[control].test)); assert.match(output, /AssertionError|expected .* to|expect\((?:element|received)\)\.to/i);
    console.log(`simCbbProgramFeedback ${control}: unique copied binding changed, one intended assertion fails and independent original six-clue outcome passes.`);
  } else { assert.equal(run.status, 0, output.slice(-5000)); assert.match(output, /10 passed/); console.log('simCbbProgramFeedback: ten actual Board and unchanged-hook outcomes passed.'); }
  console.log('simCbbProgramFeedback: original 1000/800/600/400/200/100, exact daily fields, full shares and once completion exercised.');
  console.log('simCbbProgramFeedback: repeated wrong inputs still advance clues; immediate give-up, clones and restored finishes stay truthful.');
  console.log('simCbbProgramFeedback: finite committed cue, reduced static rule, 600ms settlement and owned reset/unmount cleanup exercised.');
  console.log('simCbbProgramFeedback: Board/CSS/Search/hooks/data/types/save/completion/share bytes held; no production input changed.');
} finally { for (const file of created) await rm(file, { force: true }); if (folder) await rmdir(folder); for (const verify of verifyBytes) await verify(); }
