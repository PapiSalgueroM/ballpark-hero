import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const BASE = 'a4d6eaa2cb0d57b8bcbb301fd35f757b60bf0a41';
const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const ORIGINAL_BLOB = '62894f3be7302ebf0ed71dbd7d4cb4ae2cfe2b33';
const FIXED_BLOB = '3cb96db1e53a9211d2dc3dfd3cdb19a6e27b1f76';
const TEST = 'src/test/frontOfficeMarketAccess.test.tsx';
const TEST_BLOB = '1e67c20f6e3951f258672fe082d6e66f5087b895';
const ROOT = process.cwd(), out = path.resolve(process.argv[2] || ''), phase = process.argv[3];
assert(process.argv[2] && ['baseline', 'fixed'].includes(phase), 'Explicit output and phase');
assert(out !== ROOT && !out.startsWith(ROOT + path.sep), 'Evidence outside source');
assert(!fs.existsSync(out), 'Fresh evidence directory');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline Node runtime');
assert(process.env.NODE_OPTIONS?.includes(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')), 'Existing offline preload');
const git = (...args) => execFileSync('git', args, { maxBuffer: 16 * 1024 * 1024 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '', 'Initially clean source');
assert.equal(git('hash-object', TEST).toString().trim(), TEST_BLOB, 'Exact frozen test');
const paths = git('ls-files', '-z').toString().split('\0').filter(Boolean).sort();
const inventory = () => Object.fromEntries(paths.map(file => [file, sha(fs.readFileSync(file))]));
const sourceBefore = inventory(), saved = fs.readFileSync(BOARD), old = git('show', BASE + ':' + BOARD);
assert.equal(blob(old), ORIGINAL_BLOB, 'Pinned original application');
assert.equal(blob(saved), phase === 'baseline' ? ORIGINAL_BLOB : FIXED_BLOB, 'Pinned phase application');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'source.txt'), git('rev-parse', 'HEAD', 'HEAD^{tree}'));
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(sourceBefore, null, 2) + '\n');

const spans = [
  {
    key: 'row-truncation',
    original: '            {[...league.freeAgents].sort((a, b) => b.ovr - a.ovr).slice(0, 24).map(p => {',
    fixed: '            {[...league.freeAgents].sort((a, b) => b.ovr - a.ovr).map(p => {',
  },
  {
    key: 'legend-truncation',
    original: '          {draftLegend([...league.freeAgents].sort((a, b) => b.ovr - a.ovr).slice(0, 24))}',
    fixed: '          {draftLegend([...league.freeAgents].sort((a, b) => b.ovr - a.ovr))}',
  },
];
function replaceOnce(source, before, after, label) {
  assert.equal(source.split(before).length - 1, 1, label + ' unique source span');
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, label + ' changes actual source');
  return changed;
}
let expectedFixed = old.toString('utf8');
for (const span of spans) expectedFixed = replaceOnce(expectedFixed, span.original, span.fixed, span.key + ' forward');
let inverse = expectedFixed;
for (const span of spans) inverse = replaceOnce(inverse, span.fixed, span.original, span.key + ' inverse');
assert.equal(inverse, old.toString('utf8'), 'Full exact original inverse');
assert.equal(blob(Buffer.from(expectedFixed)), FIXED_BLOB, 'Only the two admitted removals make the fixed blob');
assert(saved.equals(phase === 'baseline' ? old : Buffer.from(expectedFixed)), 'Exact phase application source');

const names = [
  'NFL Front Office complete free agent market shows the complete sorted saved pool and explains opening or legacy ratings beyond the first 24',
  'NFL Front Office complete free agent market signs a player beyond the first 24 through the unchanged model and reloads the complete saved result',
  'NFL Front Office complete free agent market preserves the existing head signing result and cap full roster and released player refusals',
];
const markers = ['FO_MARKET_COMPLETE_POOL', 'FO_MARKET_TAIL_SIGN'];
const rawNames = ['complete-pool.json', 'legacy-guards.json', 'tail-sign.json'];
const allIds = Array.from({ length: 33 }, (_, i) => 'market-access-fa-' + (i + 1));
const arms = [];
function run(name, rowCut, legendCut) {
  const dir = path.join(out, name), rawDir = path.join(dir, 'raw'), receipt = path.join(dir, 'transport.log');
  fs.mkdirSync(rawDir, { recursive: true }); fs.writeFileSync(receipt, '');
  const p = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST,
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json',
    '--outputFile=' + path.join(dir, 'units.json')], {
    env: { ...process.env, FO_MARKET_ACCESS_RAW: rawDir, SIM_OFFLINE_RECEIPT: receipt },
    encoding: 'utf8', timeout: 600000, maxBuffer: 24 * 1024 * 1024,
  });
  const log = (p.stdout || '') + '\n' + (p.stderr || '');
  fs.writeFileSync(path.join(dir, 'units.log'), log);
  fs.writeFileSync(path.join(dir, 'native-exit.json'), JSON.stringify({
    status: p.status, signal: p.signal, error: p.error ? String(p.error) : null,
  }, null, 2) + '\n');
  const failures = rowCut ? [0, 1] : legendCut ? [0] : [];
  assert(!p.error && p.signal === null, name + ' native completion');
  assert.equal(p.status, failures.length ? 1 : 0, name + ' native exit');
  assert.equal(fs.statSync(receipt).size, 0, name + ' silent transport receipt');
  assert(!/Unhandled\s+(?:Error|Rejection)|Vitest caught [1-9]|uncaughtException|unhandledRejection/i.test(log), name + ' no unhandled runtime errors');
  const units = JSON.parse(fs.readFileSync(path.join(dir, 'units.json'), 'utf8'));
  assert.equal(units.testResults.length, 1, name + ' exact file census');
  assert.equal(units.numTotalTests, 3); assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0);
  if (typeof units.numRuntimeErrors === 'number') assert.equal(units.numRuntimeErrors, 0);
  assert.equal(units.numFailedTests, failures.length); assert.equal(units.numPassedTests, 3 - failures.length);
  const rows = units.testResults.flatMap(file => file.assertionResults);
  assert.deepEqual(rows.map(row => row.fullName).sort(), [...names].sort(), name + ' exact three-case census');
  for (let i = 0; i < names.length; i++) {
    const row = rows.find(item => item.fullName === names[i]);
    assert.equal(row.status, failures.includes(i) ? 'failed' : 'passed', name + ' exact owned/held status ' + names[i]);
    if (failures.includes(i)) {
      const message = row.failureMessages.join('\n');
      assert(message.includes('AssertionError') && message.includes(markers[i]), name + ' exact owned assertion');
      assert(!/TypeError|SyntaxError|ReferenceError|Cannot find module|is not a function/.test(message), name + ' no setup failure credit');
    }
  }
  assert.deepEqual(fs.readdirSync(rawDir).sort(), rawNames, name + ' complete RAW census');
  const bytes = Object.fromEntries(rawNames.map(file => [file, fs.readFileSync(path.join(rawDir, file))]));
  const raw = Object.fromEntries(rawNames.map(file => [file, JSON.parse(bytes[file].toString('utf8'))]));
  for (const file of rawNames) {
    assert.equal(raw[file].case, file.slice(0, -5), name + ' RAW case identity');
    assert(Array.isArray(raw[file].moduleDraws) && raw[file].moduleDraws.length >= 2, name + ' explicit import draw tape');
  }
  assert.deepEqual(raw['complete-pool.json'].moduleDraws, raw['tail-sign.json'].moduleDraws);
  assert.deepEqual(raw['complete-pool.json'].moduleDraws, raw['legacy-guards.json'].moduleDraws);
  const pool = raw['complete-pool.json'].observations.observations;
  assert.deepEqual(pool.map(row => row.kind), ['opening', 'legacy'], name + ' both lineage fixtures');
  for (const row of pool) {
    assert.equal(row.validInput, true); assert.equal(row.inputHeld, true); assert.equal(row.unrelated, 'held');
    assert.equal(row.afterBytes, row.initialBytes); assert.deepEqual(row.writes, []); assert.deepEqual(row.draws, []);
    assert.equal(row.initial.league.freeAgents.length, 33, name + ' actual saved pool size');
    assert.deepEqual(row.ids, rowCut ? allIds.slice(0, 24) : allIds, name + ' actual sorted rendered rows');
    assert.equal(row.openingMark, row.kind === 'opening' && !rowCut, name + ' tail opening marker');
    assert.equal(row.legacyMark, row.kind === 'legacy' && !rowCut, name + ' tail legacy marker');
    assert.equal(row.openingLegend, row.kind === 'opening' && !legendCut, name + ' actual opening legend');
    assert.equal(row.legacyLegend, row.kind === 'legacy' && !legendCut, name + ' actual legacy legend');
  }
  const tail = raw['tail-sign.json'].observations;
  assert.equal(tail.reference.accepted, true); assert.deepEqual(tail.reference.draws, []);
  assert.equal(tail.reference.frame.league.teams.KC.players.length, 8);
  assert.equal(tail.reference.frame.league.freeAgents.length, 32);
  assert.equal(tail.reference.bytes, JSON.stringify(tail.reference.frame));
  assert.equal(tail.actual.rowPresent, !rowCut, name + ' actual tail row change');
  assert.equal(tail.actual.buttonEnabled, !rowCut, name + ' actual tail signing availability');
  assert.equal(tail.actual.frame.league.teams.KC.players.some(player => player.id === 'market-access-fa-29'), !rowCut);
  assert.equal(tail.inputHeld, true); assert.equal(tail.unrelated, 'held');
  const summary = {
    name, nativeExit: p.status, passed: 3 - failures.length, ownedFailures: failures.length,
    rowCount: rowCut ? 24 : 33, legends: !legendCut,
    raw: rawNames.map(file => ({ file, bytes: bytes[file].length, sha256: sha(bytes[file]) })),
  };
  fs.writeFileSync(path.join(dir, 'admission.json'), JSON.stringify(summary, null, 2) + '\n');
  const result = { name, summary, bytes, raw };
  arms.push(result); return result;
}
let primary;
const bindings = [];
try {
  if (phase === 'baseline') primary = run('baseline', true, true);
  else {
    primary = run('fixed', false, false);
    assert(!saved.equals(old), 'Whole original control changes application bytes');
    bindings.push({ name: 'whole-original', fixed: sha(saved), control: sha(old) });
    fs.writeFileSync(BOARD, old);
    try { run('whole-original', true, true); }
    finally { fs.writeFileSync(BOARD, saved); assert(fs.readFileSync(BOARD).equals(saved)); }
    for (const span of spans) {
      const changed = Buffer.from(replaceOnce(saved.toString('utf8'), span.fixed, span.original, span.key + ' physical fault'));
      assert(!changed.equals(saved), span.key + ' changes full product bytes');
      bindings.push({ name: span.key, fixed: sha(saved), control: sha(changed) });
      fs.writeFileSync(BOARD, changed);
      try { run(span.key, span.key === 'row-truncation', span.key === 'legend-truncation'); }
      finally { fs.writeFileSync(BOARD, saved); assert(fs.readFileSync(BOARD).equals(saved)); }
    }
    const restored = run('restored', false, false);
    for (const arm of arms) {
      assert(arm.bytes['legacy-guards.json'].equals(primary.bytes['legacy-guards.json']), arm.name + ' entire held RAW byte parity');
      assert.deepEqual(arm.raw['tail-sign.json'].observations.reference, primary.raw['tail-sign.json'].observations.reference, arm.name + ' entire tail reference child');
      assert.equal(JSON.stringify(arm.raw['tail-sign.json'].observations.reference), JSON.stringify(primary.raw['tail-sign.json'].observations.reference), arm.name + ' exact tail reference serialization');
      for (const file of rawNames) assert.deepEqual(arm.raw[file].moduleDraws, primary.raw[file].moduleDraws, arm.name + ' import draw parity ' + file);
    }
    for (const file of rawNames) assert(restored.bytes[file].equals(primary.bytes[file]), file + ' fixed/restored full RAW byte equality');
    const rowFault = arms.find(arm => arm.name === 'row-truncation'), legendFault = arms.find(arm => arm.name === 'legend-truncation');
    assert.notDeepEqual(rowFault.raw['complete-pool.json'].observations.observations.map(row => row.ids), primary.raw['complete-pool.json'].observations.observations.map(row => row.ids), 'Row control changed actual rendered outcomes');
    assert.deepEqual(legendFault.raw['complete-pool.json'].observations.observations.map(row => row.ids), primary.raw['complete-pool.json'].observations.observations.map(row => row.ids), 'Legend control holds every rendered row');
    assert.notDeepEqual(legendFault.raw['complete-pool.json'].observations.observations.map(row => [row.openingLegend, row.legacyLegend]), primary.raw['complete-pool.json'].observations.observations.map(row => [row.openingLegend, row.legacyLegend]), 'Legend control changed actual explanations');
  }
} finally {
  fs.writeFileSync(BOARD, saved);
  assert(fs.readFileSync(BOARD).equals(saved), 'Finally restored full application source');
}
const sourceAfter = inventory();
fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(sourceAfter, null, 2) + '\n');
assert.deepEqual(sourceAfter, sourceBefore, 'Entire tracked source inventory held');
const status = git('status', '--porcelain=v1', '--untracked-files=all');
fs.writeFileSync(path.join(out, 'status-after.txt'), status); assert.equal(status.length, 0);
git('diff', '--exit-code', 'HEAD');
fs.writeFileSync(path.join(out, 'product-bindings.json'), JSON.stringify({ base: BASE, board: BOARD, originalBlob: blob(old), fixedBlob: blob(saved), bindings }, null, 2) + '\n');
const admission = {
  status: 'qualified', phase, base: BASE, testBlob: TEST_BLOB,
  arms: arms.map(arm => arm.summary), sourceHeld: true,
  scope: phase === 'baseline'
    ? 'Original source: exactly two owned assertion failures and one held pass, with all three RAW outcomes. No product, build, browser or release credit.'
    : 'Selected three-case outcomes only. Exact whole-original, independent row/legend faults and fixed/restored parity. No build, layout, browser, full-fleet or public credit.',
};
fs.writeFileSync(path.join(out, 'admission.json'), JSON.stringify(admission, null, 2) + '\n');
console.log(JSON.stringify(admission));
