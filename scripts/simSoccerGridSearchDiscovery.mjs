/* Round 1429 original diagnostic: actual search and actual parent pool arrival. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
const MODE = process.env.SOCCER_GRID_SEARCH_MODE || 'fixed';
assert(['baseline', 'fixed'].includes(MODE), 'SOCCER_GRID_SEARCH_MODE must be baseline or fixed');
const evidenceRoot = process.env.SOCCER_GRID_SEARCH_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-grid-search-evidence-'));
assert(path.isAbsolute(evidenceRoot) && path.relative(ROOT, evidenceRoot).split(path.sep).includes('..'), 'Evidence root is absolute and outside checkout');
const OUT = path.join(evidenceRoot, 'unit'); assert(!fs.existsSync(OUT), 'Fresh unit evidence directory'); fs.mkdirSync(OUT, { recursive: true });
const BASE = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const productFile = 'src/components/soccer-grid/SoccerGridSearch.tsx', testFile = 'src/test/soccerGridSearchDiscovery.test.tsx';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const tracked = git(['ls-files', '-z']);
const source = Object.fromEntries(tracked.toString('utf8').split('\0').filter(Boolean).map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
const testHash = hash(fs.readFileSync(path.join(ROOT, testFile)));
assert.equal(testHash, '410176fc8d41f755a63b6d6bdc0c310e3056e8c50ad50bb5f7f8ff5599ccdb52', 'Frozen sixteen-case original test');
const heldFiles = [productFile, 'src/pages/SoccerGrid.tsx', 'src/hooks/useSoccerGrid.ts', 'src/hooks/useDailyPuzzle.ts',
  'src/lib/fetchCareerPlayers.ts', 'src/lib/fetchAllRows.ts', 'src/lib/fetchSoccerGridPuzzles.ts', 'src/lib/soccerGridDifficulty.ts',
  'src/types/soccerGrid.ts', 'src/lib/playerSearch.ts', 'src/lib/nameFold.ts', 'vitest.config.ts'];
const boundSource = [];
for (const file of heldFiles) {
  const original = git(['show', BASE + ':' + file]);
  assert(fs.readFileSync(path.join(ROOT, file)).equals(original), 'Original main775 source held: ' + file);
  boundSource.push({ file, sha256: hash(original) });
  if (file === productFile) { assert.equal(hash(original), 'b466739d757ac2f3b15578e18e072d45baab87ed81d276c5ee12bf9ff624095d'); fs.writeFileSync(path.join(OUT, 'original-SoccerGridSearch.tsx'), original); }
}
const names = ['Fixture Álex One', 'Fixture Øren Two', 'Fixture Plain Three', 'Fixture Late Four'];
const titles = [
  ...['fixture alex one', 'fixture oren two', '  fixture   plain three  '].map(query => 'shows the canonical name for ' + JSON.stringify(query)),
  'shows a matching pool arriving under an unchanged focused query',
  'shows the actual parent career pool arriving after its focused query',
  'selects canonical accented spelling and retains visible-menu Escape recovery',
  'keeps ordinary case-insensitive canonical selection',
  'keeps the eight-result cap and bounded arrow selection',
  'keeps trimmed title-cased manual entry when no suggestion exists',
  'keeps disabled input and form submission inert',
  'keeps further query editing as recovery after late pool delivery',
  'keeps actual parent unverified selection free of a counted guess',
  'keeps the raw one-character query gate',
  'keeps all-whitespace queries empty and unable to submit',
  'keeps Escape before held pool delivery closed',
  'keeps completed150ms blur before held pool delivery closed',
];
const declared = titles.map(title => 'Soccer Grid search discovery ' + title);
const aliases = { 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'), 'react/jsx-runtime': require.resolve('react/jsx-runtime'), react: require.resolve('react') };
const summary = { version: 1, mode: MODE, productQualified: false, status: 'failed',
  scope: 'Original actual Search plus actual main775 parent/hook/Daily/career loader. Fictional IO and unrelated outer UI only. No adoption of sealed324/329/330, data, edge, parser or live behavior.',
  expected: { cases: 16, originalFaults: 5, healthyCases: 11 }, testSha256: testHash, boundSource, arms: [] };

function run(name, bare) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir);
  const rawFile = path.join(dir, 'vitest.json'), receipt = path.join(dir, 'transport.transport');
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: receipt, SOCCER_GRID_SEARCH_TRACE_DIR: dir };
  if (bare) delete env.NO_DOUBLE_SWAP; else env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + rawFile],
    { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
  fs.writeFileSync(path.join(dir, 'exit-code.json'), JSON.stringify({ status: child.status, signal: child.signal, error: child.error ? String(child.error) : null }) + '\n');
  assert.ifError(child.error); assert.equal(child.signal, null, name + ': no signal'); assert.equal(child.status, 1, name + ': original five purpose faults');
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((child.stdout || '') + (child.stderr || '')), name + ': no unhandled output credit');
  const result = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  assert.equal(result.success, false); assert.equal(result.testResults.length, 1); assert.equal(result.numTotalTests, 16); assert.equal(result.numPassedTests, 11); assert.equal(result.numFailedTests, 5);
  assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests, 0); assert.equal(result.numRuntimeErrorTestSuites || 0, 0);
  if (result.numUnhandledErrors !== undefined) assert.equal(result.numUnhandledErrors, 0);
  if (result.unhandledErrors !== undefined) assert.deepEqual(result.unhandledErrors, []);
  const cases = result.testResults.flatMap(file => file.assertionResults);
  assert.deepEqual(cases.map(row => row.fullName).sort(), [...declared].sort(), name + ': exact sixteen finished cases');
  const failures = cases.filter(row => row.status === 'failed'); assert.deepEqual(failures.map(row => row.fullName).sort(), declared.slice(0, 5).sort());
  for (const row of cases) {
    assert(['passed', 'failed'].includes(row.status), name + ': no unfinished case');
    if (row.status === 'passed') { assert.deepEqual(row.failureMessages, []); continue; }
    const index = declared.indexOf(row.fullName);
    const purpose = index < 3 ? 'Normalized queries must show the matching canonical name' : index === 3 ? 'Matching names must appear when the focused pool arrives' : 'The actual page must show its delivered pool for the focused query';
    assert.equal(row.failureMessages.length, 1, name + ': one precise purpose assertion');
    assert(row.failureMessages[0].startsWith('AssertionError: ' + purpose + ':'), name + ': exact leading original fault');
    assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(row.failureMessages[0]), name + ': no lookup or setup failure credit');
  }
  const trace = JSON.parse(fs.readFileSync(path.join(dir, 'trace.json'), 'utf8'));
  assert.equal(trace.version, 1); assert.deepEqual(trace.cases.map(row => row.name).sort(), [...titles].sort(), name + ': complete actual traces');
  for (let index = 0; index < titles.length; index++) {
    const rows = trace.cases.filter(row => row.name === titles[index]); assert.equal(rows.length, 1); const row = rows[0];
    assert.equal(row.pendingBeforeCleanup, 0); assert.equal(row.pendingAfterCleanup, 0);
    const expectedQueries = ['fixture alex one', 'fixture oren two', '  fixture   plain three  ', 'Fixture Late', 'Fixture Late', '', '', '', '', names[2], 'Fixture Late F', null, 'F', '   ', 'Fixture Late', 'Fixture Late'];
    assert.equal(row.query, expectedQueries[index], name + ': exact final query ' + index);
    const selected = index === 5 ? [names[0]] : index === 6 ? [names[2]] : index === 7 ? ['Fixture Cap 6'] : index === 8 ? ['Fixture Missing Entry'] : [];
    assert.deepEqual(row.selected, selected, name + ': exact canonical/manual callback ' + index);
    assert.deepEqual(row.visibleNames, index === 9 ? [names[2]] : index === 10 ? [names[3]] : [], name + ': exact final visible names ' + index);
    const tableNames = row.tables.map(entry => entry.table);
    assert.deepEqual(tableNames, [4, 11].includes(index) ? ['soccer_grid_puzzles', 'career_players', 'career_seasons'] : [], name + ': actual parent loader calls ' + index);
    assert.deepEqual(row.invoked, index === 11 ? [['soccer-grid-validate', { body: { playerName: names[2], rowAttribute: 'Fixture Club 1', colAttribute: 'Fixture Position 1' } }]] : [], name + ': actual validator IO ' + index);
  }
  assert.equal(fs.existsSync(receipt) ? fs.readFileSync(receipt, 'utf8') : '', '', name + ': empty child offline receipt');
  summary.arms.push({ name, bare, passed: 11, failed: 5, pending: 0, failures: failures.map(row => ({ name: row.fullName, messages: row.failureMessages })), traceSha256: hash(JSON.stringify(trace)) });
  console.log(name + ':16 finished,5 expected original search faults,11 healthy,0 held IO.'); return trace;
}

try {
  assert.equal(MODE, 'baseline', 'Fixed qualification awaits admitted original and an authorized Search edit');
  const normal = run('normal', false), bare = run('bare', true); assert.deepEqual(normal, bare, 'Normal and bare actual traces match'); summary.status = 'passed';
} finally {
  assert(tracked.equals(git(['ls-files', '-z'])), 'Tracked membership held');
  for (const [file, sha256] of Object.entries(source)) assert.equal(hash(fs.readFileSync(path.join(ROOT, file))), sha256, 'Tracked source held: ' + file);
  assert.equal(hash(fs.readFileSync(path.join(ROOT, testFile))), testHash, 'Original test bytes held');
  assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])), 'Tracked and untracked status held');
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
}
