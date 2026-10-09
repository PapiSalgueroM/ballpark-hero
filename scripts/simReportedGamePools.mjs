/* Offline outcome tests and effective copied controls for two reported games.
   REPORTED_POOLS_CONTROL selects one defect. Shared source bytes stay unchanged. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.env.REPORTED_POOLS_CONTROL || '';
const outcomes = {
  help: 'explains the eligible season window before play and in reopened help',
  profile: 'shows recorded seasons and franchises without claiming complete career dates',
  context: 'captures the exact random case and mode while keeping the answer out of visible play',
  variety: 'keeps the strongest three and varies five without replacement beyond the old best eight',
  eligible: 'keeps used names and wrong positions out while preserving distinct accented names',
  bonus: 'uses the same compact variety policy for bonus slots and leaves the shared legends intact',
  global: 'pages global 2026 rows past 900 and 1000 while excluding other years and unknown positions',
  country: 'pages a country beyond 120 and 1000 and keeps nationality and era in the actual choice path',
  position: 'pages the targeted position fallback beyond 12 after an unavailable country read',
  partial: 'fails closed rather than returning a partial global or country pool after a later page fails',
};
const spec = {
  'stat-span': { file: 'src/lib/statDetective.ts', alias: '@/lib/statDetective', old: "label: 'Recorded seasons'", replacement: "label: 'Career span'", outcomes: ['profile'] },
  'stat-franchises': { file: 'src/lib/statDetective.ts', alias: '@/lib/statDetective', old: "label: 'Recorded franchises'", replacement: "label: 'Career franchises'", outcomes: ['profile'] },
  'stat-scope': { file: 'src/lib/statDetective.ts', alias: '@/lib/statDetective', old: 'Short stints and other seasons can be missing.', replacement: 'These are complete career dates.', outcomes: ['help', 'profile'] },
  'stat-context': { file: 'src/pages/StatDetective.tsx', alias: '@/pages/StatDetective', old: 'puzzleId: mystery?.key ?? null, player: mystery?.player ?? null,', replacement: 'puzzleId: null, player: null,', outcomes: ['context'] },
  'dart-variety': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: 'const index = Math.floor(Math.random() * remaining.length);', replacement: 'const index = 0;', outcomes: ['variety', 'bonus', 'country', 'position'] },
  'dart-best': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: 'const picks = eligible.slice(0, 3);', replacement: 'const picks = eligible.slice(-3);', outcomes: ['variety', 'bonus'] },
  'dart-used': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: 'used.has(key) || seen.has(key)', replacement: 'false', outcomes: ['eligible', 'bonus'] },
  'dart-slot': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: '!fitsSlot(player, slot)', replacement: 'false', outcomes: ['eligible', 'bonus'] },
  'dart-global': { file: 'src/lib/dartDraft.ts', alias: '@/lib/dartDraft', old: '.range(from, to));', replacement: '.range(from, to).limit(900));', outcomes: ['global', 'partial'] },
  'dart-country': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: ".in('nationality', names)", replacement: ".in('nationality', names).limit(120)", outcomes: ['country', 'partial'] },
  'dart-position': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: ".in('position', rawPositionsFor(slot))", replacement: ".in('position', rawPositionsFor(slot)).limit(12)", outcomes: ['position'] },
  'dart-year': { file: 'src/lib/dartDraft.ts', alias: '@/lib/dartDraft', old: ".eq('year', 2026)", replacement: ".eq('year', 2025)", outcomes: ['global', 'partial'] },
  'dart-nation': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: ".in('nationality', names)", replacement: '', outcomes: ['country', 'position'] },
  'dart-partial': { file: 'src/lib/dartDraft.ts', alias: '@/lib/dartDraft', old: 'if (error || !data || data.length === 0)', replacement: 'if (!data || data.length === 0)', outcomes: ['partial'] },
};
assert.ok(!mode || mode in spec, 'Unknown copied control');
const files = ['src/lib/statDetective.ts', 'src/pages/StatDetective.tsx', 'src/lib/dartMap.ts', 'src/lib/dartDraft.ts'];
const originals = new Map(await Promise.all(files.map(async file => [file, await readFile(path.join(root, file), 'utf8')])));
let folder;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1800' };
  delete env.NO_DOUBLE_SWAP;
  if (mode) {
    const control = spec[mode]; const before = originals.get(control.file);
    assert.equal(before.split(control.old).length - 1, 1, 'Control must target one actual binding');
    let after = before.replace(control.old, control.replacement);
    assert.notEqual(after, before, 'Control must alter actual source');
    if (control.alias === '@/pages/StatDetective') after = after.replace("'./StatDetective.module.css'", "'@/pages/StatDetective.module.css'");
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/reported-pools-'));
    const copy = path.join(folder, path.basename(control.file)); await writeFile(copy, after);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [control.alias]: copy });
    console.log(`Effective copied control ${mode}: exact binding changed once.`);
  }
  const report = path.join(root, '.tmp-fx', `reported-pools-${mode || 'healthy'}.json`);
  await mkdir(path.dirname(report), { recursive: true }); await rm(report, { force: true });
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/statDetectiveScope.test.tsx', 'src/test/dartDraftPools.test.ts', '--reporter=verbose', '--reporter=json', `--outputFile.json=${report}`, '--testTimeout=60000'], { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; process.stdout.write(output);
  assert.ok(!run.error, String(run.error)); assert.equal(run.signal, null, 'Tests must finish normally');
  assert.match(output, /statDetectiveScope\.test\.tsx/); assert.match(output, /dartDraftPools\.test\.ts/);
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Setup failures earn no control credit');
  const suites = JSON.parse(await readFile(report, 'utf8')).testResults;
  assert.equal(suites?.length, 2, 'Both real test files must report their assertions');
  assert.ok(suites.every(suite => suite.assertionResults?.length), 'Import errors earn no control credit');
  const assertions = suites.flatMap(suite => suite.assertionResults);
  assert.deepEqual(assertions.map(test => test.title).sort(), Object.values(outcomes).sort(), 'All ten exact outcomes must execute once');
  assert.ok(assertions.every(test => ['passed', 'failed'].includes(test.status)), 'Skipped or pending tests earn no control credit');
  const failures = assertions.filter(test => test.status === 'failed');
  const expected = mode ? spec[mode].outcomes.map(name => outcomes[name]) : [];
  assert.deepEqual(failures.map(test => test.title).sort(), expected.slice().sort(), 'Only the exact intended outcomes may fail');
  assert.equal(assertions.filter(test => test.status === 'passed').length, 10 - expected.length, 'Every unrelated outcome must pass');
  console.log(`Assertion outcomes ${mode || 'healthy'}: ${JSON.stringify(assertions.map(({ title, status }) => ({ title, status })))}`);
  if (mode) {
    assert.equal(run.status, 1, 'Copied defect must fail its outcome normally');
    assert.ok(failures.every(test => /AssertionError|TestingLibraryElementError|expect\(element\)|expect\(received\)\.toHaveTextContent\(\)|expected .* to/i.test((test.failureMessages || []).join('\n'))), 'Each intended failure must be an assertion, not a setup error');
    console.log(`simReportedGamePools ${mode}: ${expected.length} exact intended outcomes failed, all ${10 - expected.length} unrelated outcomes passed.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000));
    console.log('simReportedGamePools: ten offline actual-page and real-pool outcomes passed.');
  }
  for (const [file, bytes] of originals) assert.equal(await readFile(path.join(root, file), 'utf8'), bytes, `Shared source preserved: ${file}`);
} finally { if (folder) await rm(folder, { recursive: true, force: true }); }