/* Round 773: actual Soccer Classic targeting, reachability and picker focus.
   SOCCER_LINEUP_PICKER_CONTROL changes asserted temporary Board copies only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.SOCCER_LINEUP_PICKER_CONTROL || '';
const specs = {
  unfilter: {
    anchor: '(!league || p.league === league) && (!country || p.nationality === country)', replacement: 'true',
    failed: 3, passed: 8, test: 'combines League, Country and trimmed name search, preserves value order, and resets', signal: 'Showing 40 of 56 matching players',
  },
  cap: {
    anchor: 'options.slice(0, visibleLimit)', replacement: 'options.slice(0, 40)',
    failed: 1, passed: 10, test: 'loads every eligible player, keeps earlier nodes, and picks the exact later object', signal: 'Fixture ST 45',
  },
  unfocus: {
    anchor: 'target.focus({ preventScroll: true })', replacement: 'void target',
    failed: 4, passed: 7, test: 'returns Close to the exact opening Pick control in slot 9', signal: 'toHaveFocus',
  },
};
assert.ok(!control || specs[control], 'Unknown Soccer Classic picker control');
const sourcePath = path.join(root, 'src/components/perfect-lineup/PerfectLineupBoard.tsx');
const original = await readFile(sourcePath, 'utf8');
const source = original.replace(/\r\n/g, '\n');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1600' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const spec = specs[control];
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Actual picker control anchor must occur exactly once');
    const changed = source.replace(spec.anchor, spec.replacement);
    assert.notEqual(changed, source, 'Control must change the actual Board binding');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/soccer-lineup-picker-'));
    copy = path.join(folder, 'PerfectLineupBoard.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/perfect-lineup/PerfectLineupBoard': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/soccerLineupPicker.test.tsx', '--reporter=verbose'], {
    cwd: root, env, encoding: 'utf8', timeout: 120000,
  });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  if (control) {
    process.stdout.write(output.split('\n').filter(line => /[✓×]|FAIL |Tests\s|Test Files|Duration/.test(line)).join('\n') + '\n');
    process.stdout.write(diagnostic + '\n');
  } else process.stdout.write(output);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /soccerLineupPicker\.test\.tsx/, 'Actual Soccer Classic tests must execute');
  if (control) {
    const spec = specs[control];
    assert.notEqual(run.status, 0, 'Changed behavior must fail the actual rendered outcomes');
    assert.match(output, new RegExp(`Tests\\s+${spec.failed} failed.*${spec.passed} passed`), diagnostic);
    assert.ok(output.split('\n').some(line => line.includes('FAIL ') && line.includes(spec.test)), `Expected outcome failure missing: ${spec.test}\n${diagnostic}`);
    assert.ok(output.includes(spec.signal), `Expected real outcome diagnostic missing: ${spec.signal}\n${diagnostic}`);
    console.log(`simSoccerLineupPicker ${control}: ${spec.failed} intended rendered failures and ${spec.passed} unaffected passes.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+11 passed/, diagnostic);
    console.log('simSoccerLineupPicker: eleven actual Board/hook/engine checks passed for targeting, counts, older choices, exact objects, original constraints, scores, focus and no writes.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Production Board bytes must remain unchanged');
  console.log('simSoccerLineupPicker: production source unchanged; owned temporary control copies are cleaned.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
