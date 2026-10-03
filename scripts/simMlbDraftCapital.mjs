/* Round 966: real current draft rights, exact ordinary outcome and safe saved progress, offline. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = 'src/lib/mlbFrontOffice.ts', board = 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx';
const test = 'src/components/mlb-front-office/MlbDraftCapital.test.tsx';
const files = [engine, board, test, 'src/data/mlbFoRosters2026.ts', 'src/lib/foNames.ts', 'src/lib/entityIds.ts', 'src/lib/foSchedule.ts', 'src/lib/frontOfficeCuts.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const sources = new Map(held.map(([file, value]) => [file, value.source]));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const titles = [
  'validates dense current round tokens and shifts each right once without mutation on refusal',
  'AI takes at most five distinct eligible rivals using real rookie terms and no RNG for refusals',
  'ordinary two choices keep the original two five-rival batches full offseason salaries and RNG',
  ...[0, 1, 4].map(n => `actual traded ${n} rights determine the newly opened draft without a fixed two`),
  'one actual pick consumes exactly once through a same-frame duplicate and refresh',
  'four acquired rights add four real players but only the two ordinary CPU batches',
  'zero traded rights wait for explicit finish and run the actual offseason only once',
  'legacy one-left progress trims the old unconsumed first right only on a real selection',
  'legacy two-left with one actual right closes and drains the ordinary CPU quota after that choice',
  'legacy stored choices without owned rights cannot draft and finish without inventing capital',
  'old zero-left at the final round runs summer without replaying any prior AI batch',
  'old completed zero-left at round one returns to the hub without another summer or RNG',
  'an exhausted legacy prospect board can be replaced without losing earlier players or rights',
  'malformed pick progress retains exact raw bytes until explicit own-key discard',
  'the final human choice runs one actual offseason on repeated same-frame input',
  'healthy legacy hub restores the exact save with no draft or random work',
];
const controls = {
  count: [board, 'const count = mlbDraftCapital(lg.teams[team]);', 'const count = 2;', [3, 4, 5]],
  consume: [engine, '  t.picks.shift();', '  void t.picks[0];', [0, 1, 6, 7, 10]],
  rivals: [engine, '    if (!mlbConsumeDraftPick(team)) continue;', '    if (false) continue;', [1]],
  batches: [board, 'const batches = nextPicks <= 0 ? beforeBatches : Math.min(1, beforeBatches);', 'const batches = 1;', [7, 10]],
  duplicate: [board, 'if (!league || !draftClass || picksLeft <= 0 || draftAction.current || draftCompleted) return;', 'if (!league || !draftClass || picksLeft <= 0 || draftCompleted) return;', [6, 16]],
  zeroDuplicate: [board, 'if (!league || !draftClass || draftCompleted || draftAction.current\n', 'if (!league || !draftClass || draftCompleted\n', [8]],
  ownedLimit: [board, 'const nextPicks = Math.min(picksLeft - 1, mlbDraftCapital(mine) ?? 0);', 'const nextPicks = picksLeft - 1;', [10]],
  display: [board, 'const availablePicks = Math.min(picksLeft, ownedPicks);', 'const availablePicks = picksLeft;', [10, 11]],
  restore: [board, 'setDraftCompleted(Boolean(oldFinished));', 'setDraftCompleted(false);', [13]],
  replace: [board, 'if (!league || !draftClass || draftClass.length > 0 || picksLeft <= 0 || draftAction.current || draftCompleted) return;', 'if (true) return;', [14]],
  ownKey: [board, 'localStorage.removeItem(SAVE_KEY);', 'localStorage.clear();', [15]],
  phase: [board, "        || (s.phase === 'draft' && !oldFinished && (s.league.round !== MLB_ROUNDS || (s.draftBatchesLeft === 0 && (s.picksLeft ?? 0) <= 0)))\n", '', [15]],
  activeLeft: [board, "        || (s.phase === 'draft' && !Number.isInteger(s.picksLeft))\n", '', [15]],
  batchOrder: [board, '    for (let i = 0; i < batches; i++) {\n      const order = mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam);', '    const order = mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam);\n    for (let i = 0; i < batches; i++) {', [10]],
  zeroOrder: [board, '    for (let i = 0; i < (draftBatchesLeft ?? Math.min(2, picksLeft)); i++) {\n      const order = mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam);', '    const order = mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam);\n    for (let i = 0; i < (draftBatchesLeft ?? Math.min(2, picksLeft)); i++) {', [8]],
};
const control = process.env.MLB_DRAFT_CONTROL || '';
assert.ok(!control || control === 'before' || Object.hasOwn(controls, control), 'Known MLB draft control');
const bind = (source, anchor, replacement) => {
  assert.equal(source.split(anchor).length - 1, 1, 'One real executable anchor');
  assert.equal(holdSource(Buffer.from(source.replaceAll('\n', '\r\n'))).source.split(anchor).length - 1, 1, 'Same CRLF anchor');
  const changed = source.replace(anchor, replacement); assert.notEqual(changed, source); return changed;
};
for (const [file, anchor, replacement] of Object.values(controls)) bind(sources.get(file), anchor, replacement);
const receipts = await mkdtemp(path.join(os.tmpdir(), 'dukb-mlb966-proof-'));
let folder, report, rows, output, summary; const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/mlb966-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  const aliases = {};
  const copy = async (file, source) => {
    const prefix = file === engine ? '@/lib/' : '@/components/mlb-front-office/';
    const filePath = path.join(folder, path.basename(file)); owned.push(filePath);
    await writeFile(filePath, source.replace(/(from\s+['"])\.\//g, '$1' + prefix));
    aliases[file === engine ? '@/lib/mlbFrontOffice' : '@/components/mlb-front-office/MlbFrontOfficeBoard'] = filePath;
  };
  if (control === 'before') {
    assert.ok(process.env.MLB_DRAFT_ORIGINAL_DIR, 'Physical before replay requires an explicit captured source directory');
    const originalHashes = { [engine]: 'd8992be175cf4a52ef0eec588cc54f4177cfb3e2f9d90a8886ffb0d78f0021c6', [board]: '6df965b216671e1b4784b206b3a5a5ad7f72931baa74c8293f52e06c3f9016a6' };
    for (const file of [engine, board]) {
      const original = holdSource(await readFile(path.join(process.env.MLB_DRAFT_ORIGINAL_DIR, path.basename(file)))).source;
      assert.equal(sha(original), originalHashes[file], 'Exact captured pre966 source'); await copy(file, original);
    }
  } else if (control) {
    const [file, anchor, replacement] = controls[control]; await copy(file, bind(sources.get(file), anchor, replacement));
  }
  if (Object.keys(aliases).length) env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  const jsonPath = path.join(receipts, 'vitest.json');
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + jsonPath, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024 });
  output = `${run.stdout || ''}\n${run.stderr || ''}`;
  await writeFile(path.join(receipts, 'child.log'), output);
  assert.ok(!run.error && !run.signal, 'Focused suite finishes normally');
  assert.doesNotMatch(output, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  report = JSON.parse(await readFile(jsonPath, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  rows = report.testResults.flatMap(file => file.assertionResults); assert.equal(rows.length, 18);
  const intended = control === 'before' ? titles.filter((_, i) => ![2, 9, 17].includes(i)) : control ? controls[control][3].map(i => titles[i]) : [];
  await writeFile(path.join(receipts, 'observed.json'), JSON.stringify({ control, exit: run.status, passed: report.numPassedTests, failed: report.numFailedTests, rows: rows.map(row => ({ title: row.title, status: row.status, failure: row.failureMessages[0]?.split('\n')[0] })) }, null, 2));
  assert.equal(run.status, intended.length ? 1 : 0);
  assert.equal(report.numFailedTests, intended.length); assert.equal(report.numPassedTests, 18 - intended.length);
  for (const row of rows) {
    assert.ok(titles.includes(row.title), 'Known exact outcome');
    assert.equal(row.status, intended.includes(row.title) ? 'failed' : 'passed', row.title);
    if (row.status === 'failed') assert.match(row.failureMessages.join('\n'), /AssertionError|expected|Unable to find|Error: expect\(/, 'Control fails a real outcome assertion');
  }
  summary = { control: control || 'normal', passed: report.numPassedTests, failed: report.numFailedTests, cases: 18, pending: 0, unhandled: 0, receipts, failures: intended, sourceHashes: Object.fromEntries(held.map(([file, { bytes }]) => [file, sha(bytes)])), physicalOriginal: control === 'before', native: false, historicalDataValidation: false };
  console.log(`simMlbDraftCapital ${control || 'normal'}: all 18 actual engine/Board outcomes ran, ${summary.passed} passed and ${summary.failed} intended rejects.`);
  console.log('simMlbDraftCapital: fictional names and actual constructor, trades, rookie terms, CPU selection and offseason; completion/activity and ShareButtons seams are mocked.');
  console.log('simMlbDraftCapital: ordinary two-choice copied-original algorithm holds whole final league and RNG; saved one/zero/four paths use real tokens.');
  console.log('simMlbDraftCapital: exact progress, duplicate actions, legacy summer, empty-board replacement and own-key recovery are measured; no browser or whole-season claim.');
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Actual source bytes held');
  }
  await writeFile(path.join(receipts, 'verified-summary.json'), JSON.stringify({ ...summary, sourceHeld: true, ownedCopies: 0, cleanup: true }, null, 2));
  console.log(`simMlbDraftCapital: CRLF executable anchors and ${held.length} raw sources held; owned copies cleaned; receipts ${receipts}`);
}
