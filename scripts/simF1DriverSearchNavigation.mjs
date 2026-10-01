/* Actual F1 driver search and unchanged smart helpers over fictional names.
   Pixel geometry and trusted native key behavior are measured separately. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.F1_DRIVER_SEARCH_CONTROL || '';
const independent = 'holds an independent original-helper';
const inputRepeat = "if (disabled || (e.repeat && (e.key === 'Enter' || e.key === ' '))) { e.preventDefault(); return; }";
const optionRepeat = "onKeyDown={e => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }}";
const scroll = '    if (row.top < box.top + 1) list.scrollTop -= box.top + 1 - row.top;\n    if (row.bottom > box.bottom - 1) list.scrollTop += row.bottom - box.bottom + 1;';
const controls = {
  unstable: { test: 'selects the third original match', edits: [['const allDrivers = useMemo(() => getAllF1DriverNames(currentPuzzle), [currentPuzzle]);', 'const allDrivers = getAllF1DriverNames(currentPuzzle);']] },
  scroll: { test: 'keeps later highlight visible', edits: [[scroll, '    void row; void box;']] },
  order: { test: 'holds first-ten helper order', edits: [['.slice(0, 10);', '.slice(0, 10).reverse();']] },
  guesses: { test: 'holds first-ten helper order', edits: [['.filter(d => !guesses.some(g => g.toLowerCase() === d.name.toLowerCase()))', '.filter(() => true)']] },
  fallback: { test: 'preserves exact trimmed free-text', edits: [['else if (input.trim()) submit(input.trim());', 'else if (input.trim()) submit(input);']] },
  focus: { test: 'returns accepted option focus', edits: [['inputRef.current.focus({ preventScroll: true });', 'void inputRef.current;']] },
  repeat: { test: 'blocks held Enter and Space', edits: [[inputRepeat, 'if (disabled) { e.preventDefault(); return; }'], [optionRepeat, '']] },
  disabled: { test: 'adopts the current puzzle answer', edits: [[inputRepeat, "if (e.repeat && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return; }"], ['    if (disabled) return;', '']] },
  puzzle: { test: 'adopts the current puzzle answer', edits: [['const allDrivers = useMemo(() => getAllF1DriverNames(currentPuzzle), [currentPuzzle]);', 'const allDrivers = useMemo(() => getAllF1DriverNames(currentPuzzle), []);']] },
  semantics: { test: 'describes the current option', edits: [['aria-activedescendant={!disabled && showSuggestions && filtered[highlightIndex] ? `${listId}-${filtered[highlightIndex].id}` : undefined}', 'aria-activedescendant={undefined}']] },
  callback: { test: 'returns accepted option focus', edits: [['onClick={() => submit(d.name)}', 'onClick={() => submit(filtered[0].name)}']] },
  arrowrng: { test: 'keeps later highlight visible', edits: [['setHighlightIndex(i => Math.max(0, Math.min(i + 1, filtered.length - 1)));', 'Math.random(); setHighlightIndex(i => Math.max(0, Math.min(i + 1, filtered.length - 1)));']] },
  placement: { test: 'opens within available viewport space', edits: [["style={{ maxHeight: popup.height, ...(popup.above ? { bottom: '100%', marginTop: 0, marginBottom: 4 } : { top: '100%' }) }}", '']] },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Unknown F1 driver search control');
const sourcePath = path.join(root, 'src/components/f1-driver/F1DriverSearch.tsx');
const heldPaths = ['src/components/f1-driver/F1DriverSearch.tsx', 'src/components/f1-driver/F1DriverSearchNavigation.module.css', 'src/lib/smartSearch.ts', 'src/data/f1Drivers.ts', 'src/hooks/useF1Driver.ts', 'src/components/f1-driver/F1DriverBoard.tsx'].map(file => path.join(root, file));
const verifyBytes = [];
for (const file of heldPaths) { const bytes = await readFile(file); verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, 'Only disposable copies may change'))); }
const source = (await readFile(sourcePath, 'utf8')).replace(/\r\n/g, '\n');
let folder, copy;
try {
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '900' }; delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/f1DriverSearchNavigation.test.tsx', '--reporter=verbose', '--testTimeout=60000', '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control]; let changed = source;
    for (const [anchor, replacement] of spec.edits) { assert.equal(changed.split(anchor).length - 1, 1, 'Control must bind the unique actual statement'); const before = changed; changed = changed.replace(anchor, replacement); assert.notEqual(changed, before); }
    const css = "import navigation from './F1DriverSearchNavigation.module.css';"; assert.equal(changed.split(css).length - 1, 1); changed = changed.replace(css, "import navigation from '@/components/f1-driver/F1DriverSearchNavigation.module.css';");
    await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/f1-driver-search-')); copy = path.join(folder, 'F1DriverSearch.tsx'); await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/f1-driver/F1DriverSearch': copy }); args.push('--testNamePattern', spec.test + '|' + independent);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 }), output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error, String(run.error)); assert.equal(run.signal, null, 'Terminated runners earn no credit'); assert.match(output, /f1DriverSearchNavigation\.test\.tsx/);
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Collection and timeout failures earn no control credit');
  if (control) { assert.equal(run.status, 1); assert.match(output, /Tests\s+1 failed.*1 passed.*9 skipped/); assert.match(output, new RegExp('FAIL[^\n]*' + controls[control].test)); assert.match(output, /AssertionError|expected .* to|Expected element with focus:|expect\(element\)\.to/i); console.log(`simF1DriverSearchNavigation ${control}: actual copied defect fails its named outcome; independent original helper/callback baseline passes.`); }
  else { assert.equal(run.status, 0, output.slice(-5000)); assert.match(output, /11 passed/); console.log('simF1DriverSearchNavigation: eleven actual component/helper outcomes passed.'); }
  console.log('simF1DriverSearchNavigation: third/later keyboard choices, local scrolling, stable nodes and combobox option identity exercised.');
  console.log('simF1DriverSearchNavigation: original one-letter matching, smart tiers, top-ten order, guessed exclusion and trimmed raw fallback exercised.');
  console.log('simF1DriverSearchNavigation: exact callbacks, quiet RNG/storage, disabled/held-key guards and preventScroll focus exercised; native pixels remain a separate gate.');
  console.log('simF1DriverSearchNavigation: original Search/CSS/helpers/data/hook/Board bytes held, only owned temporary source copies changed.');
} finally { if (copy) await rm(copy, { force: true }); if (folder) await rmdir(folder); for (const verify of verifyBytes) await verify(); }
