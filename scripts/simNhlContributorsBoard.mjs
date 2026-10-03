/* Actual NHL Board with fictional saved teams, original selection/strength helpers and
   original completion hook. Copied controls change one asserted UI binding only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.NHL_CONTRIBUTORS_BOARD_CONTROL || '';
const independent = 'holds the independent original helper';
const controls = {
  apply: { test: 'applies exact IDs once', edits: [['nhlSetContributors(lg.teams[myTeam], value)', 'true']] },
  auto: { test: 'restores manual choices quietly', edits: [['nhlResetContributors(lg.teams[myTeam])', 'true']] },
  save: { test: 'applies exact IDs once', edits: [['setLeague(lg); persist({}, lg, myTeam);\n    return true;', 'setLeague(lg);\n    return true;']] },
  preview: { test: 'opens automatic contributors quietly', edits: [['nhlStrength({ ...team, contributors: draft })', '0']] },
  incomplete: { test: 'stages replacements without saving', edits: [['disabled={!complete || !changed}', 'disabled={!changed}']] },
  cue: { test: 'applies exact IDs once', edits: [['className={contributorsStyles.committed}', 'className={undefined}']] },
  clear: { test: 'applies exact IDs once', edits: [['setTimeout(() => setReceipt(null), 500)', 'setTimeout(() => setReceipt(null), 500000)']] },
  focus: { test: 'applies exact IDs once', edits: [['if (receipt) notice.current?.focus({ preventScroll: true });', 'void receipt;']] },
  back: { test: 'stages replacements without saving', edits: [['contributorsOpener.current?.focus({ preventScroll: true });', 'void contributorsOpener;']] },
  duplicate: { test: 'refuses same-frame duplicate Apply', edits: [[' || contributorCommit.current === league', '']] },
  restore: { test: 'repairs existing restored overrides', edits: [['if (s.league.teams[s.myTeam]) repairNhlContributors(s.league.teams[s.myTeam]);', 'void s.myTeam;']] },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Unknown NHL contributors Board control');
const boardPath = path.join(root, 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx');
const preservedPaths = [boardPath, path.join(root, 'src/components/nhl-front-office/NhlContributors.module.css'), path.join(root, 'src/lib/nhlFrontOffice.ts'), path.join(root, 'src/hooks/useGameCompletion.ts'), path.join(root, 'src/lib/frontOfficeCuts.ts'), path.join(root, 'src/data/nhlFoPlayers.ts')];
const verifyBytes = [];
for (const file of preservedPaths) {
  const bytes = await readFile(file);
  verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, 'Only disposable copies may change during the Board wrapper')));
}
const originalSource = (await readFile(boardPath, 'utf8')).replace(/\r\n/g, '\n');
let folder, copy;
try {
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '900' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/nhlContributorsBoard.test.tsx', '--reporter=verbose', '--testTimeout=60000', '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    let changed = originalSource;
    for (const [anchor, replacement] of [...controls[control].edits, ["import contributorsStyles from './NhlContributors.module.css';", "import contributorsStyles from '@/components/nhl-front-office/NhlContributors.module.css';"]]) {
      assert.equal(changed.split(anchor).length - 1, 1, 'Each control anchor must bind one actual statement');
      const before = changed; changed = changed.replace(anchor, replacement); assert.notEqual(changed, before);
    }
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/nhl-contributors-board-'));
    copy = path.join(folder, 'NhlFrontOfficeBoard.tsx'); await writeFile(copy, changed.replace("from './NhlWaiverReceipt'", "from '@/components/nhl-front-office/NhlWaiverReceipt'"));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/nhl-front-office/NhlFrontOfficeBoard': copy });
    args.push('--testNamePattern', controls[control].test + '|' + independent);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /nhlContributorsBoard\.test\.tsx/, 'Actual Board test file must execute');
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Collection, resolver and timeout failures earn no credit');
  if (control) {
    assert.notEqual(run.status, 0, 'Copied defect must fail its intended outcome');
    assert.match(output, /Tests\s+1 failed.*1 passed.*7 skipped/);
    assert.match(output, new RegExp('FAIL[^\\n]*' + controls[control].test));
    assert.match(output, /AssertionError|expected .* to|Expected element with focus:|expect\(element\)\.to(?:BeDisabled|BeEmptyDOMElement|HaveFocus|HaveClass|HaveTextContent)\(/i);
    console.log('simNhlContributorsBoard ' + control + ': changed unique copied binding, one intended assertion failed and one independent baseline passed.');
  } else {
    assert.equal(run.status, 0, output.slice(-6000)); assert.match(output, /9 passed/);
    console.log('simNhlContributorsBoard: nine actual Board and original helper outcomes passed.');
  }
  console.log('simNhlContributorsBoard: staged IDs, exact strength, save/Auto, quiet restores, duplicate suppression and original waive/dead-cap behavior exercised.');
  console.log('simNhlContributorsBoard: stable nodes, finite cue binding and focus are unit checked; native pixel/reduced-motion and full-season engine acceptance are separate.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
  await Promise.all(verifyBytes.map(verify => verify()));
}
