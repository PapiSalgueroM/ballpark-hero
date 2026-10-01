/* Actual shared search and autocomplete over local GET-only fictional REST replies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.PLAYER_SEARCH_FAILURE_CONTROL || '';
const independent = 'holds the independent original ranking';
const libraryPath = path.join(root, 'src/lib/playerSearch.ts');
const componentPath = path.join(root, 'src/components/game/PlayerAutocomplete.tsx');
const controls = {
  error: { file: 'library', test: 'reports each failed empty request leg', edits: [["error: results.length === 0 && error ? error.message || 'Search failed' : null", 'error: null']] },
  partial: { file: 'library', test: 'keeps useful partial request results', edits: [['if (ilikeRes.error && prominenceRes.error)', 'if (ilikeRes.error || prominenceRes.error)']] },
  message: { file: 'component', test: 'shows a generic retry message', edits: [["{searchFailed ? 'Could not load players. Try searching again.' : 'No players found'}", "{'No players found'}"]] },
  local: { file: 'component', test: 'keeps useful local matches selectable', edits: [['{!loading && suggestions.length === 0 && (', '{!loading && (']] },
  stale: { file: 'component', test: 'ignores an old failure after a newer request', edits: [['if (thisRequestId !== requestIdRef.current) return;', '', 2]] },
  cleanup: { file: 'component', test: 'keeps a cleared in-flight search quiet', edits: [['      ++requestIdRef.current;\n      abortRef.current?.abort();', '']] },
  abort: { file: 'library', test: 'suppresses an intentionally aborted request', edits: [['    if (signal?.aborted) return { results: [], error: null };', '']] },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Unknown player-search failure control');
const verifyBytes = [];
for (const file of [libraryPath, componentPath, path.join(root, 'src/lib/nameFold.ts'), path.join(root, 'src/integrations/supabase/client.ts')]) {
  const bytes = await readFile(file);
  verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, 'Only disposable copies may change')));
}
const library = (await readFile(libraryPath, 'utf8')).replace(/\r\n/g, '\n');
const component = (await readFile(componentPath, 'utf8')).replace(/\r\n/g, '\n');
let folder, copy;
try {
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '900' }; delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/playerSearchFailure.test.tsx', '--reporter=verbose', '--testTimeout=60000', '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control]; let changed = spec.file === 'library' ? library : component;
    for (const [anchor, replacement, count = 1] of spec.edits) {
      assert.equal(changed.split(anchor).length - 1, count, 'Control must bind the expected actual statement count');
      const before = changed; changed = changed.replaceAll(anchor, replacement); assert.notEqual(changed, before);
    }
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/player-search-failure-'));
    copy = path.join(folder, spec.file === 'library' ? 'playerSearch.ts' : 'PlayerAutocomplete.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.file === 'library' ? '@/lib/playerSearch' : '@/components/game/PlayerAutocomplete']: copy });
    args.push('--testNamePattern', spec.test + '|' + independent);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error, String(run.error)); assert.equal(run.signal, null, 'Terminated runners earn no credit');
  assert.match(output, /playerSearchFailure\.test\.tsx/);
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Collection and timeout failures earn no control credit');
  if (control) {
    assert.equal(run.status, 1); assert.match(output, /Tests\s+1 failed.*1 passed.*9 skipped/);
    assert.match(output, new RegExp('FAIL[^\n]*' + controls[control].test));
    assert.match(output, /AssertionError|expected .* to|expect\(element\)\.to/i);
    console.log(`simPlayerSearchFailure ${control}: changed copied statement fails its named outcome; independent original ranking/selection baseline passes.`);
  } else {
    assert.equal(run.status, 0, output.slice(-5000)); assert.match(output, /11 passed/);
    console.log('simPlayerSearchFailure: eleven actual helper and component outcomes passed.');
  }
  console.log('simPlayerSearchFailure: empty direct/fallback/both failures and the skipped long-query fallback are distinguished from successful empty search.');
  console.log('simPlayerSearchFailure: useful partial/local matches, exact original ranking/filters and native selection callbacks are retained.');
  console.log('simPlayerSearchFailure: success clearing, stale/cleared requests, explicit abort and free-text paths exercised without RNG/storage or outward writes.');
  console.log('simPlayerSearchFailure: original source/client/folding bytes held; only owned copied controls change, native pixels remain separate.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
  for (const verify of verifyBytes) await verify();
}
