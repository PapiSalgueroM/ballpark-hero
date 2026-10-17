// Remote-only proof of optional press-room failure containment and unchanged healthy play.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = '8293c758f4284d21baaa2320383cfd5cb5bd4944';
const PAGE = 'src/components/soccer-career/PressRoomTile.tsx';
const TEST = 'src/test/soccerPressRoomFailure.test.tsx';
const SELF = 'scripts/qa/proveSoccerPressRoomFailure.mjs';
const WORKFLOW = '.github/workflows/soccer-press-room-failure.yml';
const BROWSER = 'scripts/qa/playSoccerPressRoomFailure.mjs';
const TEST_SHA = '07035c66d43f53ce5802260dd90097bb687ee392ddf102342056ad95db7de6ae';
const ORIGINAL_SHA = 'f1c214f65d09d80352cc081f02199f2dd9cbe2310b609bcae389344fd190fd21';
const CANDIDATE_SHA = '39b584d461e6a242973f55749652c09bb829dd92184ccba1a3f2e8b5632b54f9';
const COPY_PAGE = 'src/components/soccer-career/__PressRoomTile1411.tsx';
const COPY_TEST = 'src/test/__soccerPressRoomFailure1411.test.tsx';
const TITLES = [
  'a rejected press-room import keeps the career and its pending save mounted',
  'closing and reopening the failed press room preserves the career save and focus',
  'cancelling a pending import leaves the career ready for the actual room',
  'the actual healthy press room applies one calm answer and keeps its recorded history',
  'an ineligible career keeps the tile absent without importing or changing anything',
];
const CAUSES = ['PRESS_ROOM_GUARD_parent_and_pending_save', 'PRESS_ROOM_GUARD_failure_back_focus_reopen'];
const SPANS = [
  ["import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';", "import { Component, lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';"],
  ["import { pressRoomView } from '@/lib/soccerCareerPress';", "import { pressRoomView } from '@/lib/soccerCareerPress';\nimport { escapeCloses, focusDialogOnMount } from '@/lib/dialogA11y';"],
  ['export default function PressRoomTile', `class PressRoomBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="press-room-failure-title" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(this.props.onClose)} className="w-full max-w-md rounded-2xl border border-border bg-card p-4">
        <h2 id="press-room-failure-title" className="text-sm font-bold">Press room unavailable</h2>
        <p className="mt-2 text-sm">The press room could not open. You can carry on with your career.</p>
        <button type="button" onClick={this.props.onClose} className="mt-3 min-h-[44px] w-full rounded-xl border border-border px-4 text-sm">Back to your career</button>
      </div>
    </div>;
  }
}

export default function PressRoomTile`],
  ['{open && <Suspense fallback=', '{open && <PressRoomBoundary onClose={close}><Suspense fallback='],
  ['</Suspense>}', '</Suspense></PressRoomBoundary>}'],
];
const mode = process.argv[2], out = process.env.PRESS_ROOM_FAILURE_OUT;
const sha = body => createHash('sha256').update(body).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sourceMap = names => Object.fromEntries(names.map(file => [file, sha(fs.readFileSync(file))]));
function once(body, from, to) {
  assert.equal(body.split(from).length, 2, `Unique source anchor: ${from}`);
  const changed = body.replace(from, to); assert.notEqual(changed, body);
  assert.equal(changed.split(to).length, 2, 'Unique changed operand'); return changed;
}
const require = createRequire(import.meta.url);
assert(['baseline', 'fixed'].includes(mode), 'Use baseline or fixed');
assert(out && path.isAbsolute(out), 'PRESS_ROOM_FAILURE_OUT is absolute');
assert(process.env.CI === '1' || process.env.CI === 'true', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Offline preload inherited');
assert(require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Actual offline preload loaded');
fs.mkdirSync(out, { recursive: true });
assert(!fs.existsSync(path.join(out, 'report.json')), 'Fresh owned report path');
const report = { version: 1, mode, base: BASE, status: 'running', qualified: false, arms: [],
  limits: 'Real optional panel, route boundary and pending-save registry. Only dynamic import IO is deferred. No browser chunk, global reload, storage backend failure or focus-trap runtime claim.' };
let names, before;
function wholeSource() {
  assert.deepEqual(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort(), names, 'Whole tracked source membership held');
  return sourceMap(names);
}
try {
  git(['merge-base', '--is-ancestor', BASE, 'HEAD']);
  const allowed = new Set([PAGE, TEST, SELF, WORKFLOW, BROWSER]);
  const changed = git(['diff', '--name-only', BASE, 'HEAD', '--', '.', ':!docs']).toString().trim().split('\n').filter(Boolean);
  assert(changed.every(file => allowed.has(file)), `Only declared leaves: ${changed}`);
  assert.equal(git(['status', '--porcelain', '--untracked-files=normal', '--', '.', ':!docs']).toString(), '', 'Clean committed source');
  for (const file of [TEST, SELF, WORKFLOW]) assert(fs.readFileSync(file).equals(git(['show', `HEAD:${file}`])), `Committed whole source: ${file}`);
  const test = fs.readFileSync(TEST); assert.equal(sha(test), TEST_SHA, 'Frozen whole five-case test');
  const original = git(['show', `${BASE}:${PAGE}`]).toString(); assert.equal(sha(original), ORIGINAL_SHA);
  const candidate = SPANS.reduce((body, [from, to]) => once(body, from, to), original);
  assert.equal(sha(candidate), CANDIDATE_SHA, 'Exact reviewed candidate');
  assert.equal([...SPANS].reverse().reduce((body, [from, to]) => once(body, to, from), candidate), original, 'Whole five-span inverse');
  const removalSpans = SPANS.slice(3).map(([from, to]) => [to, from]);
  const removed = removalSpans.reduce((body, [from, to]) => once(body, from, to), candidate);
  assert.notEqual(removed, candidate, 'Effective boundary-removal source changes');
  assert.equal([...removalSpans].reverse().reduce((body, [from, to]) => once(body, to, from), removed), candidate, 'Whole boundary-removal inverse');
  assert.equal(fs.readFileSync(PAGE, 'utf8'), mode === 'baseline' ? original : candidate, 'Exact whole application arm');
  for (const [label, body] of [['original', original], ['candidate', candidate], ['boundary-removed', removed]]) fs.writeFileSync(path.join(out, `${label}-PressRoomTile.tsx`), body, { flag: 'wx' });
  fs.copyFileSync(TEST, path.join(out, 'frozen-test.tsx'), fs.constants.COPYFILE_EXCL);
  const alias = "'@/components/soccer-career/PressRoomTile'", copyAlias = "'@/components/soccer-career/__PressRoomTile1411'";
  assert.equal(test.toString().split(alias).length, 3, 'Only type and actual tile imports redirected');
  const copiedTest = test.toString().replaceAll(alias, copyAlias);
  for (const file of [COPY_TEST, COPY_PAGE]) assert(!fs.existsSync(file), `No existing owned copy: ${file}`);
  json(path.join(out, 'source-bindings.json'), { base: BASE, head: git(['rev-parse', 'HEAD']).toString().trim(), changed,
    test: { file: TEST, sha256: TEST_SHA }, page: PAGE, originalSHA256: ORIGINAL_SHA, candidateSHA256: CANDIDATE_SHA,
    spans: SPANS, removalSpans, removedSHA256: sha(removed), copyTest: { file: COPY_TEST, sha256: sha(copiedTest) }, copyPage: COPY_PAGE });
  names = git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort(); before = sourceMap(names);
  json(path.join(out, 'source-before.json'), before);
  function arm(label, body, faults) {
    assert.deepEqual(wholeSource(), before, `${label} whole source before`);
    const dir = path.join(out, label); fs.mkdirSync(dir);
    const expectedCopies = { [COPY_TEST]: sha(copiedTest), [COPY_PAGE]: sha(body) };
    let run;
    try {
      fs.writeFileSync(COPY_TEST, copiedTest, { flag: 'wx' }); fs.writeFileSync(COPY_PAGE, body, { flag: 'wx' });
      assert.deepEqual(sourceMap([COPY_TEST, COPY_PAGE]), expectedCopies, 'Declared copies before child');
      fs.copyFileSync(COPY_TEST, path.join(dir, 'actual-test.tsx'), fs.constants.COPYFILE_EXCL);
      fs.copyFileSync(COPY_PAGE, path.join(dir, 'actual-PressRoomTile.tsx'), fs.constants.COPYFILE_EXCL);
      const args = ['node_modules/vitest/vitest.mjs', 'run', COPY_TEST, '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile=${path.join(dir, 'vitest.json')}`];
      const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, PRESS_ROOM_FAILURE_RAW: path.join(dir, 'observations.json'), SIM_OFFLINE_RECEIPT: path.join(dir, 'units.transport') } });
      fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '', { flag: 'wx' });
      const record = { label, status: 'unqualified', exit: result.status, signal: result.signal, error: result.error?.message || null, args, expectedCopies };
      report.arms.push(record); json(path.join(dir, 'process.json'), record);
      json(path.join(dir, 'source-after.json'), wholeSource()); json(path.join(dir, 'copies-after.json'), sourceMap([COPY_TEST, COPY_PAGE]));
      assert.deepEqual(wholeSource(), before, `${label} whole source after`); assert.deepEqual(sourceMap([COPY_TEST, COPY_PAGE]), expectedCopies, `${label} held copies`);
      assert(!result.error && !result.signal, `${label} completed child`);
      const output = (result.stdout || '') + (result.stderr || '');
      assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|No test files found|Cannot find module|Failed to resolve import|Transform failed|SIM_OFFLINE_BLOCK/i.test(output), `${label} no unhandled, setup or transport fault`);
      const transport = path.join(dir, 'units.transport'); assert(!fs.existsSync(transport) || fs.statSync(transport).size === 0, `${label} zero ordinary transport blocks`);
      const units = JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'))), cases = units.testResults.flatMap(suite => suite.assertionResults);
      assert.equal(units.testResults.length, 1); assert(units.testResults[0].name.replaceAll('\\', '/').endsWith('/' + COPY_TEST));
      assert.equal(result.status, faults ? 1 : 0); assert.equal(units.success, !faults);
      assert.equal(units.numTotalTests, 5); assert.equal(units.numPassedTests, faults ? 3 : 5); assert.equal(units.numFailedTests, faults ? 2 : 0);
      assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0); assert.equal(cases.length, 5); assert.deepEqual(cases.map(row => row.title), TITLES);
      if (units.unhandledErrors !== undefined) assert.deepEqual(units.unhandledErrors, []);
      for (const [i, row] of cases.entries()) {
        assert.equal(row.status, faults && i < 2 ? 'failed' : 'passed');
        if (row.status === 'failed') { assert.equal(row.failureMessages.length, 1); assert(row.failureMessages[0].includes(CAUSES[i])); assert(/expected false to be true/i.test(row.failureMessages[0])); }
        else assert.deepEqual(row.failureMessages, []);
      }
      const rawBytes = fs.readFileSync(path.join(dir, 'observations.json')), raw = JSON.parse(rawBytes);
      assert.equal(raw.version, 1); assert.deepEqual(raw.titles, TITLES); assert.deepEqual(raw.cases.map(row => row.title), TITLES);
      for (const [i, row] of raw.cases.entries()) {
        const lost = faults && i < 2, final = row.snapshots.at(-1), rejected = row.snapshots.find(snapshot => snapshot.label === 'import-rejected');
        assert.equal(row.mounts, 1); assert.equal(row.unmounts, lost ? 1 : 0); assert.equal(row.cleanupStarted, true); assert.equal(row.cleanupUnmounts, lost ? 0 : 1);
        assert.equal(row.importCalls, i === 4 ? 0 : 1); assert.equal(row.gate, i < 2 ? 'rejected' : 'resolved'); assert.deepEqual(row.draws, []);
        assert.deepEqual(row.persistedBefore, { ...row.initial, events: ['Earlier fictional career save'] });
        assert.equal(final.label, 'final-before-cleanup'); assert.equal(final.parentMounted, !lost); assert.equal(final.parentUnmounts, lost ? 1 : 0);
        for (const snapshot of row.snapshots) { assert.deepEqual(snapshot.draws, []); assert.equal(typeof snapshot.html, 'string'); assert(snapshot.state && snapshot.persisted); }
        if (i !== 3) { assert.deepEqual(row.latest, row.initial); assert.deepEqual(row.patches, []); }
        if (i < 2) {
          assert.equal(rejected.parentMounted, !lost); assert.equal(rejected.pending, !lost); assert.equal(row.releases.length, lost ? 1 : 0);
          assert.equal(rejected.html.includes(lost ? 'This page broke' : 'Press room unavailable'), true);
          if (lost) assert(row.console.some(args => args[0] === 'A page failed to render:'));
          else assert(!row.console.some(args => args[0] === 'A page failed to render:'));
        } else { assert.deepEqual(row.releases, []); assert.equal(final.pending, i !== 4); }
        if (i === 0) {
          assert.deepEqual(row.settlements, [{ label: 'before-rejection', before: true, result: false, after: true },
            { label: 'after-rejection', before: !lost, result: lost, after: !lost }, { label: 'after-storage-recovery', before: !lost, result: true, after: false }]);
          assert.equal(row.retries.length, lost ? 1 : 3); assert.equal(row.allowPersist, true); assert.equal(final.pending, false);
          assert.deepEqual(final.persisted, lost ? row.persistedBefore : row.initial);
          if (!lost) assert.deepEqual(row.retries.at(-1), { state: row.initial, allowed: true, wrote: true });
        } else assert.deepEqual(final.persisted, row.persistedBefore);
        if (i === 1) { assert.equal(row.failureBackFound, !lost); if (!lost) { assert.equal(row.failureCloseFocus, true); assert.equal(row.failureReopened, true); } }
        if (i === 2) assert(row.snapshots.some(snapshot => snapshot.label === 'cancel-then-real-room' && snapshot.html.includes('Say it, then back it up')));
        if (i === 3) { assert.equal(row.patches.length, 1); assert.deepEqual(row.patches[0].before, row.initial); assert.deepEqual(row.patches[0].after, row.latest);
          assert.equal(row.latest.morale, 53); assert.equal(row.latest.popularity, 48); assert(final.html.includes('data-press-history=')); }
        if (i === 4) assert.deepEqual(row.retries, []);
      }
      Object.assign(record, { status: 'qualified', passed: units.numPassedTests, failed: units.numFailedTests, rawBytes: rawBytes.length, rawSha256: sha(rawBytes) });
      json(path.join(dir, 'qualification.json'), record); run = { raw, rawBytes };
    } finally { for (const file of [COPY_TEST, COPY_PAGE]) if (fs.existsSync(file)) fs.unlinkSync(file); assert.deepEqual(wholeSource(), before, `${label} all source held after copy cleanup`); }
    return run;
  }
  if (mode === 'baseline') arm('baseline', original, true);
  else {
    const baselineRaw = process.env.PRESS_ROOM_FAILURE_BASELINE_RAW_SHA256;
    assert(/^[a-f0-9]{64}$/.test(baselineRaw || ''), 'Separately qualified actual baseline raw SHA is mandatory');
    const normal = arm('normal', candidate, false), control = arm('original', original, true);
    assert.equal(sha(control.rawBytes), baselineRaw, 'Whole original raw equals separately qualified baseline');
    const removal = arm('boundary-removed', removed, true);
    for (const i of [2, 3, 4]) { assert.deepEqual(normal.raw.cases[i], control.raw.cases[i], `Whole original healthy row ${i}`); assert.deepEqual(normal.raw.cases[i], removal.raw.cases[i], `Whole removal healthy row ${i}`); }
    const restored = arm('restored', candidate, false); assert(restored.rawBytes.equals(normal.rawBytes), 'Whole restored raw bytes equal normal');
  }
  report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  if (before) {
    for (const file of [COPY_TEST, COPY_PAGE]) if (fs.existsSync(file)) fs.unlinkSync(file);
    try { const after = wholeSource(); json(path.join(out, 'source-after.json'), after); assert.deepEqual(after, before, 'Whole final source held'); report.sourceHeld = true; }
    catch (error) { report.status = 'failed'; report.qualified = false; report.sourceHeld = false; report.sourceError = error.message; process.exitCode = 1; }
  }
  json(path.join(out, 'report.json'), report); console.log(`Press-room isolation ${mode}: ${report.status}; ${report.arms.length} arm receipt(s), qualified=${report.qualified}`);
}
