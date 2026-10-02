/* Actual NFL draft choices, owned capital, recovery and copied executable controls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/front-office/FrontOfficeBoard.tsx', engine = 'src/lib/frontOffice.ts';
const test = 'src/components/front-office/FrontOfficeDraftCapital.test.tsx';
const files = [board, engine, test, 'src/lib/frontOfficeSave.ts', 'src/lib/frontOfficeCuts.ts', 'src/data/frontOfficeDepth.ts', 'src/data/frontOfficePlayers.ts', 'src/components/front-office/FrontOfficeTagDepth.test.tsx', 'src/components/front-office/FrontOfficeFullRoster.test.tsx', 'src/test/frontOfficeSaveRecovery.test.tsx'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = new Map(await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))])));
const titles = [...held.get(test).source.matchAll(/\bit\('([^']+)'/g)].map(match => `NFL draft capital outcomes ${match[1]}`);
assert.equal(titles.length, 25, 'All twenty-five meaningful cases are bound');
const controls = {
  count: [board, '    const count = lg.teams[team].picks.length;', '    const count = 3;', [1, 2, 3, 8, 9, 12, 15]],
  human: [engine, '  team.picks.shift();', '  void team;', [4, 8, 9, 13, 14, 15, 16, 18, 19]],
  eligible: [engine, 'a !== userTeam && league.teams[a].picks.length > 0', 'a !== userTeam', [5, 11, 18, 19]],
  ai: [engine, '    consumeDraftPick(league.teams[abbr]);', '    void league.teams[abbr];', [18, 19]],
  progress: [board, 'persist({ draftClass: nextClass, picksLeft: nextPicks, draftBatchesLeft: beforeBatches - batches }, lg, myTeam);', 'persist({ draftClass: nextClass, picksLeft: nextPicks, draftBatchesLeft: 3 }, lg, myTeam);', [8, 12]],
  minimum: [board, '    const batches = Math.max(3, count);', '    const batches = count;', [8, 10, 11, 12, 16]],
  pool: [board, 'generateDraftClass(Math.random, Math.max(40, count + Math.min(rivalCapital, batches * 6)), leagueNames(lg));', 'generateDraftClass(Math.random, 40, leagueNames(lg));', [15]],
  legacy: [board, '    if (draftBatchesLeft === null && mine.picks.length > picksLeft) mine.picks = mine.picks.slice(-picksLeft);', '    void mine;', [13, 14]],
  duplicate: [board, ' || draftAction.current', '', [16], 2],
  zero: [board, '(picksLeft > 0 && league.teams[myTeam].picks.length > 0)', 'league.teams[myTeam].picks.length > 0', [20]],
  recovery: [board, '    setDraftClass(cls);\n    persist({ draftClass: cls }, league, myTeam);', '    void cls;', [14]],
  damaged: [board, '      if (s.draftBatchesLeft !== undefined && (!Number.isInteger(s.draftBatchesLeft) || s.draftBatchesLeft < 0\n        || s.draftBatchesLeft > Math.max(3, s.league.teams[s.myTeam].picks.length)\n        || (s.phase === \'draft\' && s.draftBatchesLeft === 0))) { setSaveError(true); return; }', '      void s.draftBatchesLeft;', [22, 23, 24]],
};
const control = process.env.NFL_DRAFT_CONTROL || '';
assert.ok(!control || control === 'all' || control === 'original' || control in controls, 'Known draft control');
for (const [file, anchor, replacement, , count = 1] of Object.values(controls)) {
  const source = held.get(file).source;
  assert.equal(source.split(anchor).length - 1, count, 'Each executable control binds its exact count');
  assert.notEqual(source.replaceAll(anchor, replacement), source, 'Each control changes executable source');
  const bytes = Buffer.from(source.replaceAll('\n', '\r\n'));
  assert.equal(holdSource(bytes).source.split(anchor).length - 1, count, 'The same control binds a CRLF checkout');
}
const originalBoard = holdSource(execFileSync('git', ['show', `eb6a9add:${board}`], { cwd: root }));
const originalEngine = holdSource(execFileSync('git', ['show', `eb6a9add:${engine}`], { cwd: root }));
const helper = held.get(engine).source.match(/\nexport function consumeDraftPick[\s\S]+?(?=export function prospectToPlayer)/);
assert.ok(helper, 'The current engine has the two bounded new helpers');
const documentedOriginal = originalEngine.source.replace('a three-round draft of clearly', 'a draft of clearly');
assert.notEqual(documentedOriginal, originalEngine.source, 'Only the existing header claim is corrected');
const reference = {
  commit: 'eb6a9add',
  engineSha256: createHash('sha256').update(originalEngine.bytes).digest('hex'),
  boardSha256: createHash('sha256').update(originalBoard.bytes).digest('hex'),
  capturedOriginalMatches: held.get(engine).source.replace(helper[0], '\n') === documentedOriginal,
  strictHistoricalMode: control === 'original' || control === 'all',
};
if (reference.strictHistoricalMode) {
  assert.equal(reference.engineSha256, 'a11acf15acb805cbaea61247b44120af82639a28ae7fbcef463ef1afa409da89', 'The explicit historical engine reference is held');
  assert.equal(reference.boardSha256, '313c0f61ccc85d66914c1eaca26a09843bd149e6fcb5976e31f45fc9b67b2fda', 'The explicit historical Board reference is held');
  assert.equal(reference.capturedOriginalMatches, true, 'Historical replay requires the captured original engine APIs after the bounded helper and header delta');
}
console.log(`NFL draft reference ${reference.commit}: engine ${reference.engineSha256}, Board ${reference.boardSha256}, captured-original matches ${reference.capturedOriginalMatches}, strict historical mode ${reference.strictHistoricalMode}.`);
const baselineNames = [titles[0], titles[6]];
const originalTargets = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24];
let folder;
async function run(mode) {
  const aliases = {}, copies = [];
  for (const file of [board, engine]) {
    let source = held.get(file).source;
    if (mode === 'original' && file === board) source = originalBoard.source;
    else if (mode && controls[mode]?.[0] === file) source = source.replaceAll(controls[mode][1], controls[mode][2]);
    if (file === engine) source = source.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3');
    const copy = path.join(folder, `${mode || 'normal'}-${path.basename(file)}`);
    await writeFile(copy, source); copies.push(copy); aliases['@/' + file.slice(4).replace(/\.tsx?$/, '')] = copy;
  }
  const reportFile = path.join(folder, `${mode || 'normal'}-result.json`);
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1', NO_DOUBLE_SWAP: JSON.stringify(aliases) };
  const result = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (process.env.NFL_DRAFT_RECEIPTS) {
    await mkdir(process.env.NFL_DRAFT_RECEIPTS, { recursive: true });
    const attempt = path.join(process.env.NFL_DRAFT_RECEIPTS, `attempt-${Date.now()}-${mode || 'normal'}`);
    await writeFile(`${attempt}.json`, await readFile(reportFile)); await writeFile(`${attempt}.log`, result.stdout + result.stderr);
  }
  const json = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = json.testResults.flatMap(file => file.assertionResults), failed = rows.filter(row => row.status === 'failed');
  assert.equal(json.numTotalTests, 25); assert.equal(rows.length, 25); assert.equal(json.numPendingTests, 0); assert.equal(json.numRuntimeErrorTestSuites ?? 0, 0);
  assert.equal(json.testResults.length, 1); assert.equal(json.testResults[0].status, failed.length ? 'failed' : 'passed');
  assert.ok(rows.every(row => ['passed', 'failed'].includes(row.status)), 'No excluded or skipped outcomes');
  assert.deepEqual(rows.map(row => row.fullName), titles, 'Every actual case ran');
  assert.ok(!/Unhandled|unhandled rejection|ERR_DUKB_OFFLINE|worker exited|timed out|SyntaxError|ReferenceError/.test(result.stdout + result.stderr), 'No runner or transport faults');
  for (const name of baselineNames) assert.equal(rows.find(row => row.fullName === name)?.status, 'passed', 'Independent original baselines stay green');
  const targets = mode === 'original' ? originalTargets : mode ? controls[mode][3] : [];
  const expected = targets.map(index => titles[index]).sort();
  if (mode) {
    assert.notEqual(result.status, 0); assert.deepEqual(failed.map(row => row.fullName).sort(), expected, `Exact ${mode} failure set: ${failed.map(row => titles.indexOf(row.fullName)).join(',')}`);
    assert.ok(failed.every(row => row.failureMessages.some(message => /AssertionError|TestingLibraryElementError|Error: expect\(/.test(message)) && row.failureMessages.every(message => !/SyntaxError|ReferenceError|TypeError|timed out/.test(message))), 'Controls fail on outcome assertions');
  } else { assert.equal(result.status, 0); assert.equal(failed.length, 0); }
  for (const [file, value] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, value.bytes, `${file} original bytes held`);
  }
  const receipt = { mode: mode || 'normal', total: 25, passed: json.numPassedTests, failed: failed.length, failures: failed.map(row => ({ title: row.fullName, message: row.failureMessages[0].split('\n')[0] })), independentBaselines: baselineNames, rawHolds: files, reference, originalBoardReference: mode === 'original' ? 'eb6a9add physical Board, unchanged original engine APIs with new helper exports inert' : undefined };
  if (process.env.NFL_DRAFT_RECEIPTS) {
    await mkdir(process.env.NFL_DRAFT_RECEIPTS, { recursive: true });
    await writeFile(path.join(process.env.NFL_DRAFT_RECEIPTS, `${mode || 'normal'}.json`), JSON.stringify(receipt, null, 2));
    await writeFile(path.join(process.env.NFL_DRAFT_RECEIPTS, `${mode || 'normal'}.log`), result.stdout + result.stderr);
  }
  console.log(`NFL draft capital ${mode || 'normal'}: ${json.numPassedTests} held passes, ${failed.length} exact outcome rejections, all25 ran.`);
  await Promise.all([...copies, reportFile].map(file => rm(file)));
}
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/nfl-draft904-'));
  if (!control || control === 'all') await run('');
  if (control === 'all') { await run('original'); for (const mode of Object.keys(controls)) await run(mode); }
  else if (control) await run(control);
} finally {
  if (folder) { assert.ok(path.resolve(folder).startsWith(path.join(root, '.sim-control', 'nfl-draft904-'))); await rm(folder, { recursive: true, force: true }); }
}
console.log('NFL draft capital cleanup: only owned disposable copies removed, original source bytes held.');
