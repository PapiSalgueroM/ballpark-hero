/* Actual NBA Stat Line Page, hook and original pure helpers over fictional seasons.
   Native list geometry, held-key activation and production CSS are checked separately. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.NBA_STAT_LINE_PICKER_CONTROL || '';
const independent = 'holds an independent original-helper';
const repeat = "onKeyDown={e => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }}";
const controls = {
  adloading: { file: 'page', test: 'holds manual ads off loading', anchor: "(phase === 'setup' || phase === 'playing' || phase === 'done')", replacement: 'true' },
  aderror: { file: 'page', test: 'holds manual ads off loading', anchor: "(phase === 'setup' || phase === 'playing' || phase === 'done')", replacement: "(phase !== 'boot')" },
  adready: { file: 'page', test: 'allows the original consented manual slot', anchor: "(phase === 'setup' || phase === 'playing' || phase === 'done')", replacement: 'false' },
  cap: { file: 'hook', test: 'reaches beyond20', anchor: 'const suggestions = suggestionMatches.slice(0, suggestionLimit);', replacement: 'const suggestions = suggestionMatches.slice(0, 10);' },
  more: { file: 'page', test: 'reaches beyond20', anchor: 'setSuggestionLimit(limit => limit + 10);', replacement: 'setSuggestionLimit(10);' },
  reset: { file: 'page', test: 'reaches beyond20', anchor: 'useLayoutEffect(() => { setSuggestionLimit(10); }, [g.query, phase]);', replacement: 'useLayoutEffect(() => {}, [g.query, phase]);' },
  count: { file: 'page', test: 'reaches beyond20', anchor: '`Showing ${g.suggestions.length} matching seasons', replacement: '`Showing ${10} matching seasons' },
  order: { file: 'hook', test: 'holds the original first-ten order', anchor: 'const suggestions = suggestionMatches.slice(0, suggestionLimit);', replacement: 'const suggestions = suggestionMatches.slice(0, suggestionLimit).reverse();' },
  exactkey: { file: 'page', test: 'picks an exact later season object', anchor: 'g.addPick(season);', replacement: 'g.addPick(g.suggestions[0]);' },
  focus: { file: 'page', test: 'picks an exact later season object', anchor: 'next?.focus({ preventScroll: true });', replacement: 'void next;' },
  scorefocus: { file: 'page', test: 'focuses Score on the fifth pick', anchor: 'searchRef.current ?? scoreRef.current;', replacement: 'searchRef.current;' },
  repeat: { file: 'page', test: 'blocks held Enter and Space', anchor: repeat, replacement: '', count: 4 },
  pagingrng: { file: 'page', test: 'reaches beyond20', anchor: 'setSuggestionLimit(limit => limit + 10);', replacement: 'setSuggestionLimit(limit => limit + 10); Math.random();' },
  selectionrng: { file: 'page', test: 'picks an exact later season object', anchor: 'g.addPick(season);', replacement: 'g.addPick(season); Math.random();' },
  eligibility: { file: 'hook', test: 'retains original prefix tiers and era eligibility', anchor: 'suggestSeasons(eligible, query, pickedKeys, suggestionLimit + 1)', replacement: 'suggestSeasons(pool, query, pickedKeys, suggestionLimit + 1)' },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Unknown NBA Stat Line picker control');
const pagePath = path.join(root, 'src/pages/NbaStatLine.tsx');
const hookPath = path.join(root, 'src/hooks/useNbaStatLine.ts');
const heldPaths = [pagePath, hookPath, 'src/pages/NbaStatLinePicker.module.css', 'src/lib/nbaStatLine.ts', 'src/lib/dateUtils.ts', 'src/hooks/useGameCompletion.ts', 'src/components/game/ResultScreen.tsx', 'src/components/game/ShareButtons.tsx'].map(file => path.isAbsolute(file) ? file : path.join(root, file));
const verifyBytes = [];
for (const file of heldPaths) {
  const bytes = await readFile(file);
  verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, 'Only disposable copies may change')));
}
const pageSource = (await readFile(pagePath, 'utf8')).replace(/\r\n/g, '\n');
const hookSource = (await readFile(hookPath, 'utf8')).replace(/\r\n/g, '\n');
let folder, copy;
try {
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '900' }; delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/nbaStatLinePicker.test.tsx', '--reporter=verbose', '--testTimeout=60000', '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control]; let changed = spec.file === 'page' ? pageSource : hookSource;
    assert.equal(changed.split(spec.anchor).length - 1, spec.count || 1, 'Control must bind the exact actual statements');
    const before = changed; changed = changed.replaceAll(spec.anchor, spec.replacement); assert.notEqual(changed, before, 'Control must change source bytes');
    if (spec.file === 'page') {
      const css = "import pickerStyles from './NbaStatLinePicker.module.css';"; assert.equal(changed.split(css).length - 1, 1);
      changed = changed.replace(css, "import pickerStyles from '@/pages/NbaStatLinePicker.module.css';");
    }
    await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/nba-stat-line-picker-'));
    copy = path.join(folder, spec.file === 'page' ? 'NbaStatLine.tsx' : 'useNbaStatLine.ts'); await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.file === 'page' ? '@/pages/NbaStatLine' : '@/hooks/useNbaStatLine']: copy });
    args.push('--testNamePattern', spec.test + '|' + independent);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error, String(run.error)); assert.equal(run.signal, null, 'Terminated runners earn no credit'); assert.match(output, /nbaStatLinePicker\.test\.tsx/, 'Actual Page tests must run');
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Import, collection and timeout failures earn no credit');
  if (control) {
    assert.equal(run.status, 1, 'Copied defect must fail its intended outcome with the actual test exit'); assert.match(output, /Tests\s+1 failed.*1 passed.*10 skipped/);
    assert.match(output, new RegExp('FAIL[^\n]*' + controls[control].test)); assert.match(output, /AssertionError|expected .* to|Expected element with focus:|expect\(element\)\.to/i);
    console.log(`simNbaStatLinePicker ${control}: exact copied binding changed, one intended outcome failed and one independent original-helper baseline passed.`);
  } else { assert.equal(run.status, 0, output.slice(-5000)); assert.match(output, /12 passed/); console.log('simNbaStatLinePicker: twelve actual Page/hook/helper outcomes passed.'); }
  console.log('simNbaStatLinePicker: real manual ads stay off boot/failure and retain setup/play/results eligibility plus the existing consent gate.');
  console.log('simNbaStatLinePicker: original first-ten tiers, era gates, duplicate exclusion, beyond20 exact keys and stable retained nodes exercised.');
  console.log('simNbaStatLinePicker: exact weighted/summed score, full daily keys, original share text and quiet restored once-only completion exercised.');
  console.log('simNbaStatLinePicker: quiet paging/typing/no-matches, query/run reset, focus and repeat cancellation exercised; pixel/native flow remains separate.');
  console.log('simNbaStatLinePicker: original Page, hook, CSS, engine, date, completion, result and sharing inputs remain byte-held; only owned copies are written.');
} finally {
  if (copy) await rm(copy, { force: true }); if (folder) await rmdir(folder);
  for (const verify of verifyBytes) await verify();
}
