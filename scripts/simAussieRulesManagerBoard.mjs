/* Actual fictional-manager Board, real reducer, saves, choices and completion.
   AUSSIE_RULES_BOARD_CONTROL changes one asserted disposable source binding. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'src/components/aussie-rules-manager/AussieRulesManagerBoard.tsx');
const control = process.env.AUSSIE_RULES_BOARD_CONTROL || '';
const independent = 'shows real shared rules and the worked example before any season starts, with reusable help';
const lineup = 'targets only eligible original starter candidates and commits an exact bench exchange with stable slot focus';
const choice = 'passes exact training and non-first tactic choices through the real reducer and displays event-derived points';
const feedback = 'cues only a committed quarter, retains its node on clones, clears finite feedback and resumes exact break state';
const controls = {
  lineup: { anchor: '      starters[picker.index] = player.id;', replacement: '      starters[picker.index] = outgoingId;', test: lineup },
  candidates: { anchor: 'player.role === currentPlayer!.role', replacement: 'true', test: lineup },
  prepare: { anchor: "act({ type: 'prepare', choice: choice.id })", replacement: "act({ type: 'prepare', choice: 'rest' })", test: choice },
  tactic: { anchor: "act({ type: 'play', tactic: tactic.id })", replacement: "act({ type: 'play', tactic: 'control' })", test: choice },
  score: { anchor: '${value.total}', replacement: '${value.total + 1}', test: choice },
  swap: { anchor: "act({ type: 'swap', outId: selectedOut, inId: selectedIn })", replacement: "act({ type: 'swap', outId: selectedIn, inId: selectedIn })", test: 'offers only same-role break swaps, commits original IDs and stops at the five-change game limit' },
  cue: { anchor: 'className={styles.committed} data-arm-feedback', replacement: 'className={undefined} data-arm-feedback', test: feedback },
  restore: { anchor: '    const request = intent.current;', replacement: "    const request = intent.current ?? { previous: null, action: { type: 'next' } as ManagerAction };", test: feedback },
  reset: { anchor: 'onClick={() => setConfirmReset(true)}', replacement: 'onClick={() => game.reset()}', test: 'requires confirmation before replacing a season and restores focus on both cancel and the new club menu' },
  focus: { anchor: "      (state ? status.current : document.querySelector<HTMLElement>('[data-arm-club]'))?.focus({ preventScroll: true });", replacement: '      void state;', test: 'starts the exact generated squad and focuses the surviving round heading without scoring' },
};
assert.ok(!control || control in controls, 'Unknown fictional-manager Board control');
const original = await readFile(sourcePath, 'utf8'), source = original.replace(/\r\n/g, '\n');
let folder, copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/aussieRulesManagerBoard.test.tsx', '--reporter=verbose'];
  if (control) {
    const spec = controls[control];
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Copied control must bind exactly one real statement');
    const changed = source.replace(spec.anchor, spec.replacement).replace("'./AussieRulesManagerBoard.module.css'", "'@/components/aussie-rules-manager/AussieRulesManagerBoard.module.css'");
    assert.notEqual(changed, source, 'Control must change the actual Board');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/aussie-rules-board-'));
    copy = path.join(folder, 'AussieRulesManagerBoard.tsx'); await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/aussie-rules-manager/AussieRulesManagerBoard': copy });
    args.push('-t', `${spec.test}|${independent}`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`, diagnostic = output.slice(-2500);
  process.stdout.write(output);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /aussieRulesManagerBoard\.test\.tsx/, 'Actual Board suite must execute');
  assert.doesNotMatch(output, /Failed to resolve|Cannot find module|Unhandled Errors/, 'Resolver failures cannot earn control credit');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+1 failed.*1 passed.*8 skipped/, diagnostic);
    assert.ok(output.split('\n').some(line => line.includes('FAIL ') && line.includes(controls[control].test)), 'The named actual outcome must fail');
    assert.match(output, /AssertionError|expect\(element\)/, 'A real rendered outcome assertion must fail');
    console.log(`simAussieRulesManagerBoard ${control}: the changed binding fails its intended rendered outcome; the independent pre-play rules check passes and eight tests are skipped.`);
  } else {
    assert.equal(run.status, 0, diagnostic); assert.match(output, /Tests\s+10 passed/, diagnostic);
    console.log('simAussieRulesManagerBoard: ten actual Board/Page checks passed with the real manager hook, generated clubs and reducer.');
  }
  console.log('simAussieRulesManagerBoard: original eligible player IDs, role filters, preparation, tactics and five-change limits execute.');
  console.log('simAussieRulesManagerBoard: event totals, thirty league results, ten-round ladder and one undefined-score completion execute.');
  console.log('simAussieRulesManagerBoard: saved replay, refused storage, quiet restores, finite cue binding and native focus targets execute.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Production source must remain byte-identical, including failed controls');
}
