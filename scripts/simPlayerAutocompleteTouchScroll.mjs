/* Remote-only actual autocomplete activation. Source, compiled copies and raw
   outcomes are retained before a baseline or copied fault can qualify. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Use remote offline CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARENT = '36cc9ffe7e13ed1c1e5f994b6a3998c8e3206e2c';
const TEST = 'src/test/playerAutocompleteTouchScroll.test.tsx';
const COMPONENT = path.join(ROOT, 'src/components/game/PlayerAutocomplete.tsx');
const OLD_STALE = path.join(ROOT, 'src/test/playerAutocompleteStale.test.tsx');
const OLD_SIM = path.join(ROOT, 'scripts/simPlayerAutocompleteInteraction.mjs');
const CONTROL = process.env.AUTOCOMPLETE_TOUCH_CONTROL || '';
const RED = process.env.AUTOCOMPLETE_TOUCH_EXPECT_RED === '1';
const PHASE = process.env.AUTOCOMPLETE_TOUCH_PHASE || (RED ? 'baseline' : 'fixed');
assert(['baseline', 'fixed'].includes(PHASE) && RED === (PHASE === 'baseline'), 'Phase must match baseline or fixed');
assert(['', 'pointerdown'].includes(CONTROL) && !(RED && CONTROL), 'Only the separate fixed pointerdown control is allowed');
const NAMES = [
  'touch scroll missing: touch pointerdown leaves the current suggestion uncommitted',
  'touch scroll missing: pen pointerdown leaves the current suggestion uncommitted',
  'touch scroll missing: touch pointercancel leaves the current suggestion uncommitted',
  'touch scroll missing: pen pointercancel leaves the current suggestion uncommitted',
  'touch scroll missing: touch drag without a native click leaves the current suggestion uncommitted',
  'touch scroll missing: pen drag without a native click leaves the current suggestion uncommitted',
  'touch scroll preservation: touch completed click commits the current identity once',
  'touch scroll preservation: pen completed click commits the current identity once',
  'touch scroll preservation: mouse pointerdown keeps its original before-blur selection',
  'touch scroll preservation: unspecified pointerdown keeps its original selection',
  'touch scroll preservation: keyboard or assistive click commits once',
  'touch scroll preservation: ArrowDown and Enter keep input focus',
  'touch scroll preservation: ArrowUp and Tab keep input focus',
  'touch scroll preservation: disabled touch activation commits nothing',
  'touch scroll preservation: disabled pen activation commits nothing',
  'touch scroll preservation: changed text removes prior suggestions before activation',
  'touch scroll preservation: changed filters remove prior suggestions before activation',
  'touch scroll preservation: outside focus removes prior suggestions before activation',
  'touch scroll preservation: namesakes keep exact chosen identity and caller filters',
  'touch scroll preservation: free text keeps its enabled and disabled Enter contract',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const app = [COMPONENT, ...['src/lib/playerSearch.ts', 'src/lib/nameFold.ts', 'src/lib/utils.ts',
  'src/pages/LineupBuilder.tsx', 'src/App.tsx'].map(file => path.join(ROOT, file))];
const prior = ['src/test/playerAutocompleteInteraction.test.tsx', 'src/test/playerAutocompleteStale.test.tsx',
  'src/test/playerAutocompleteEmptyText.test.tsx', 'scripts/simPlayerAutocompleteInteraction.mjs'].map(file => path.join(ROOT, file));
const files = [...app, ...prior, path.join(ROOT, TEST), fileURLToPath(import.meta.url),
  path.join(ROOT, 'scripts/playPlayerAutocompleteTouchScroll.mjs'), path.join(ROOT, '.github/workflows/player-autocomplete-touch-scroll.yml')];
const sources = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const OUT = process.env.AUTOCOMPLETE_TOUCH_OUT ? path.resolve(process.env.AUTOCOMPLETE_TOUCH_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'player-autocomplete-touch-scroll-'));
const arm = CONTROL || PHASE, retained = path.join(OUT, arm);
fs.mkdirSync(retained, { recursive: true });
assert(!fs.existsSync(path.join(retained, 'source.json')), 'Refuse to replace an existing proof arm');
for (const [file, contents] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), contents);
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/player-autocomplete-touch-scroll-'));
let candidate = sources.get(COMPONENT), outcome = {};
const edits = [];
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Actual source Git receipt must finish'); return result.stdout;
}
const sourceHead = git(['rev-parse', 'HEAD']).trim();
const parentComponent = git(['show', `${PARENT}:src/components/game/PlayerAutocomplete.tsx`]);
fs.writeFileSync(path.join(retained, 'PlayerAutocomplete.parent.tsx'), parentComponent);
const parentHashes = [...app, ...prior].map(file => {
  const name = path.relative(ROOT, file).replaceAll('\\', '/'), before = git(['show', `${PARENT}:${name}`]);
  const row = { file: name, parentSha256: sha(before), candidateSha256: sha(sources.get(file)),
    kind: app.includes(file) ? 'app' : 'prior-proof' };
  // Only the fixed gesture and the separately owned old timing proof may differ.
  if (RED || ![COMPONENT, OLD_STALE, OLD_SIM].includes(file)) assert.equal(row.candidateSha256, row.parentSha256, 'Unowned parent source must stay held');
  return row;
});
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  const sourceReceipts = [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
    beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file, 'utf8')) }));
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ arm, sourceHead, parentAppRef: PARENT,
    parentHashes, parentComponentSha256: sha(parentComponent), sourceReceipts, actualSourceEdits: edits,
    limits: ['Actual component with fictional player-search replies; no game-rule or real-data result is mocked.',
      'DOM pointer cancellation and movement cover pre-activation state only. Native scroll and click suppression belong to the browser proof.',
      'The copied control removes one fixed early-return guard. It restores premature commitment, not every other parent instruction.'], ...outcome }, null, 2) + '\n');
}
try {
  if (CONTROL) {
    const anchor = "                  if (e.pointerType === 'touch' || e.pointerType === 'pen') return;\n";
    assert.equal(candidate.split(anchor).length - 1, 1, 'One actual touch and pen guard must exist before the control');
    const before = candidate;
    candidate = before.replace(anchor, '');
    assert.notEqual(candidate, before, 'Premature pointerdown source control must be effective');
    assert.equal(candidate.split(anchor).length - 1, 0, 'Only the fixed early return is removed');
    const insertion = '                  e.preventDefault();\n                  commitSelection(entity);';
    assert.equal(candidate.split(insertion).length - 1, 1, 'Copied guard inverse needs one original mouse commit');
    assert.equal(candidate.replace(insertion, anchor + insertion), before, 'Reinsertion must restore the whole current fixed component');
    edits.push({ kind: CONTROL, file: 'src/components/game/PlayerAutocomplete.tsx', anchor, replacement: '',
      inverseAnchor: insertion, beforeSha256: sha(before), afterSha256: sha(candidate) });
    fs.writeFileSync(path.join(retained, 'PlayerAutocomplete.tsx.control'), candidate);
  }
  receipt();
  const esbuild = await import('esbuild'), compiled = [];
  for (const [file, contents, sourcefile] of [['component.mjs', candidate, 'src/components/game/PlayerAutocomplete.tsx'],
    ['parent-component.mjs', parentComponent, 'PlayerAutocomplete.parent.tsx']]) {
    // External imports keep React and the actual search module in Vitest's existing registry.
    const result = await esbuild.transform(contents, { loader: 'tsx', format: 'esm', jsx: 'automatic', sourcefile, sourcemap: 'inline' });
    fs.writeFileSync(path.join(tmp, file), result.code); fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
    compiled.push({ file, sourceSha256: sha(contents), sha256: sha(result.code), bytes: Buffer.byteLength(result.code) });
  }
  receipt({ compiled, compiler: { name: 'esbuild', version: esbuild.version, mode: 'complete-tsx-transform-external-imports' } });
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1',
    AUTOCOMPLETE_TOUCH_COMPONENT: path.join(tmp, 'component.mjs').replaceAll('\\', '/') };
  const reportFile = path.join(tmp, 'unit.json'), runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs');
  assert(fs.existsSync(runner), 'Locked remote unit runner must be installed');
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose',
    '--reporter=json', `--outputFile.json=${reportFile}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(retained, 'output.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  receipt({ exitCode: result.status, processSignal: result.signal, processError: result.error?.message || null });
  assert(!result.error && result.status !== null && !result.signal, 'The actual unit child must finish inside its bound');
  assert(!SETUP.test(output), 'Setup and unhandled errors cannot earn outcome credit');
  assert(fs.existsSync(reportFile), 'Complete actual unit report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1);
  const file = report.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'The exact unit file must load without a file error');
  const cases = file.assertionResults;
  assert.deepEqual(cases.map(row => row.title).sort(), [...NAMES].sort(), 'All twenty exact outcome names must complete');
  assert.equal(report.numTotalTests, 20); assert.equal(report.numPendingTests, 0);
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)), 'Skipped and todo cases cannot earn credit');
  const expected = RED || CONTROL ? NAMES.slice(0, 6) : [], failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title).sort(), [...expected].sort(), 'Only exact intended premature-commit failures may qualify');
  for (const row of failed) assert(row.failureMessages.length > 0 && row.failureMessages.every(message =>
    /^AssertionError:.*autocomplete pointerdown committed a scrollable suggestion before activation.*expected false to be true/s.test(message)),
    'Every intended failure must have the exact Boolean premature-commit cause');
  assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 20 - expected.length);
  assert.equal(result.status, expected.length ? 1 : 0, 'Actual child exit must match the complete outcome count');
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual app and proof source bytes must stay held');
  assert.equal(edits.length, CONTROL ? 1 : 0);
  receipt({ completedNames: cases.map(row => row.title), passed: report.numPassedTests, intendedFailures: expected.length });
  console.log(`Touch scroll: one actual component unit file, all20 named outcomes, ${report.numPassedTests} passes and ${expected.length} exact intended faults; childexit${result.status}.`);
  console.log(`Complete raw outcomes, logs and process receipt retained; ${files.length} unchanged source copies and ${parentHashes.length} parent bindings.`);
  console.log('Two complete physical TSX compilations retained with source hashes, output hashes and actual compiler version.');
  console.log(`Actual application mutation: none; effective copied source faults${edits.length}; no file, setup or pending credit.`);
  if (CONTROL) console.log(`Effective pointerdown control: ${edits[0].beforeSha256} -> ${edits[0].afterSha256}; whole fixed-source inverse held.`);
  console.log(`simPlayerAutocompleteTouchScroll ${RED ? 'expected baseline red' : CONTROL || 'normal'}: green.`);
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
