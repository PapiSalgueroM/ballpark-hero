/* Test-only remote reproduction of two I1344 edge paths. No source substitution. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI required');
const BASE = '6341f29bb1ce69d6df0f1b3d77fefffa93cdb265';
const TEST = 'src/test/managerTransferEdgeCases.test.ts';
const OUT = process.env.MTE_OUT;
assert(OUT && path.isAbsolute(OUT), 'Absolute MTE_OUT evidence directory required');
const FAULTS = [
  ['sale-hijack', 'prior human sale hijack cannot announce an ownership-refused transfer', 'MTE_SALE_HIJACK'],
  ['sale-walk', 'prior human sale walk-away cannot announce an ownership-refused transfer', 'MTE_SALE_WALK'],
  ['job-talk', 'carried current-season AI signing keeps its Talk lock after job move and reload', 'MTE_JOB_TALK'],
  ['job-buy', 'carried current-season AI signing keeps its buy lock after job move and reload', 'MTE_JOB_BUY'],
];
const PRESERVES = [
  ['preserve-sale-rule', 'human-sale rule 3 keeps the full owned payload and takes no RNG'],
  ['preserve-ai-closes', 'ordinary AI rival closes still record both actual purchases'],
  ['preserve-original-lock', 'original current-season AI signing refuses actual Talk and buy before the job move'],
  ['preserve-job-identity', 'job move and actual January save retain the departed full player identity'],
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024 });
  assert(!result.error && !result.signal && result.status === 0, result.stderr || result.error?.message || 'git failed');
  return result.stdout;
}
fs.mkdirSync(OUT, { recursive: true });
const reportFile = path.join(OUT, 'unit.json'), rawFile = path.join(OUT, 'raw-states.json');
assert(!fs.existsSync(reportFile) && !fs.existsSync(rawFile), 'Do not overwrite previous proof');
const appFiles = ['src/lib/clubManager.ts', 'src/lib/clubManagerCalendar.ts', 'src/lib/clubManagerWorldRoster.ts',
  'src/lib/clubManagerJobHunt.ts', 'src/lib/saveFence.ts'];
for (const file of appFiles) assert.equal(fs.readFileSync(file, 'utf8'), git(['show', `${BASE}:${file}`]), 'Exact I6341 application: ' + file);
git(['diff', '--exit-code', BASE, '--', 'src', ':!' + TEST]);
const held = [...appFiles, TEST, 'scripts/qa/proveManagerTransferEdges.mjs', 'package.json', 'package-lock.json', 'bun.lock']
  .map(file => ({ file, bytes: fs.readFileSync(file) }));
const receipt = { base: BASE, head: git(['rev-parse', 'HEAD']).trim(), status: 'running',
  purpose: 'Current bug reproduction only. No product edit, fixed result, build, browser or live claim.',
  sources: held.map(row => ({ file: row.file, bytes: row.bytes.length, sha256: sha(row.bytes) })) };
const retain = () => fs.writeFileSync(path.join(OUT, 'receipt.json'), JSON.stringify(receipt, null, 2));
retain();
try {
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST,
    '--maxWorkers=1', '--minWorkers=1', '--testTimeout=120000', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile],
  { encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, MTE_OUT: OUT, FORCE_COLOR: '0', NO_COLOR: '1' } });
  const stdout = child.stdout || '', stderr = child.stderr || '', output = stdout + stderr;
  fs.writeFileSync(path.join(OUT, 'stdout.log'), stdout); fs.writeFileSync(path.join(OUT, 'stderr.log'), stderr);
  fs.writeFileSync(path.join(OUT, 'exit.json'), JSON.stringify({ exit: child.status, signal: child.signal, error: child.error?.message || null }));
  process.stdout.write(stdout); process.stderr.write(stderr);
  assert(!child.error && !child.signal && child.status !== null, 'Actual unit runner must complete');
  assert(!/TypeError:|ReferenceError:|SyntaxError:|ERR_MODULE_NOT_FOUND|Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|SIM_OFFLINE_BLOCK|MTE_SETUP|MTE_PRESERVATION/i.test(output),
    'Setup, preservation and runtime errors cannot qualify as semantic faults');
  const report = JSON.parse(fs.readFileSync(reportFile));
  assert.equal(report.testResults.length, 1); assert.equal(report.numTotalTests, 8);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  const suite = report.testResults[0], cases = suite.assertionResults;
  assert(suite.name.replaceAll('\\', '/').endsWith('/' + TEST) && !suite.message, 'Actual target unit file only');
  assert.equal(cases.length, 8); assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
  assert.deepEqual(cases.map(row => row.title).sort(), [...FAULTS, ...PRESERVES].map(row => row[1]).sort());
  const failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title).sort(), FAULTS.map(row => row[1]).sort());
  for (const row of failed) {
    const cause = FAULTS.find(fault => fault[1] === row.title)[2];
    assert.equal(row.failureMessages.length, 1);
    assert(row.failureMessages[0].startsWith('AssertionError: ' + cause + ':')
      && row.failureMessages[0].includes('expected false to be true'), 'Exact Boolean semantic assertion only');
  }
  assert.equal(child.status, 1); assert.equal(report.success, false);
  assert.equal(report.numFailedTests, 4); assert.equal(report.numPassedTests, 4);
  const raw = JSON.parse(fs.readFileSync(rawFile));
  assert(!raw.fixtures.setupError, 'No fixture setup error');
  assert.deepEqual(Object.keys(raw.cases).sort(), [...FAULTS, ...PRESERVES].map(row => row[0]).sort());
  for (const [id] of [...FAULTS, ...PRESERVES]) {
    const row = raw.cases[id]; assert(!row.error, id + ': complete actual observation');
    assert.equal(row.correct, !FAULTS.some(fault => fault[0] === id), id + ': exact baseline classification');
    if (row.inputBefore) assert.deepEqual(row.inputBefore, row.inputAfter, id + ': retained whole action input');
  }
  const sale = raw.fixtures.sale.attempts.filter(row => row.selected === true);
  const job = raw.fixtures.job.attempts.filter(row => row.selected && typeof row.selected === 'object');
  assert.equal(sale.length, 1); assert.equal(job.length, 1);
  const sold = sale[0], joined = job[0];
  assert(sold.initializer && sold.listed && sold.generatedBids && sold.sold && sold.seasonEnded
    && sold.finished?.state && sold.rollover && sold.rolloverReload?.loaded && sold.war?.state, 'Complete natural sale journey');
  assert.equal(sold.preparation, 'none'); assert.equal(joined.preparation, 'none');
  assert.equal(sold.seasonEnded.week, sold.seasonEnded.calendar.length);
  assert.equal(sold.rollover.season, sold.initializer.season + 1);
  assert(sold.originalPlayer.contractYears >= 3 && sold.actualBid.playerId === sold.originalPlayer.id && !sold.actualBid.loan);
  assert(joined.initializer && joined.applied && joined.accepted && joined.joined && joined.january
    && joined.januaryReload?.loaded && joined.selected?.line, 'Complete real application and job journey');
  assert.equal(joined.accepted.jobHunt.open.status, 'accepted'); assert.equal(joined.applied.jobHunt.open.roll, 0);
  assert.equal(joined.january.transferWindow, 'january'); assert.equal(joined.january.windowWeeksLeft, 3);
  for (const fixture of [sold, joined]) {
    assert(fixture.calls.some(call => call.label === 'startCareer' && call.draws.length > 0));
    assert(fixture.calls.some(call => call.kind === 'match' && call.report && call.draws.length > 0));
    for (const entry of Object.values(fixture)) if (entry?.inputBefore && entry?.inputAfter) {
      assert.deepEqual(entry.inputBefore, entry.inputAfter, 'Retained fixture query/save input');
      if ('raw' in entry) { assert(entry.saved && entry.loaded && entry.raw); assert.equal(entry.raw, entry.rawAfterRead); assert.equal(entry.draws.length, 0); }
    }
  }
  for (const id of ['sale-hijack', 'sale-walk']) {
    const row = raw.cases[id]; assert(row.published); assert.deepEqual(row.beforeRecord, row.afterRecord);
    assert.equal(row.beforeRecord.key, sold.key); assert(row.beforeRecord.player.wage !== undefined && row.beforeRecord.player.contractYears >= 2);
    assert.equal(row.draws.length, 1); assert.equal(row.afterRecord.owner, sold.actualBid.club);
  }
  for (const id of ['job-talk', 'job-buy']) {
    const row = raw.cases[id]; assert.equal(row.door.value, null); assert(row.actual);
    assert.equal(row.card.worldRosterKey, joined.selected.key); assert.equal(row.card.joinedThisSeason, true);
    assert.equal(row.inputBefore.transferWindow, 'january');
    assert(!row.inputBefore.transferLog.some(line => line.name === row.card.name && line.to === row.card.club && line.season === row.inputBefore.season && !line.loan));
    const saved = row[id === 'job-talk' ? 'talkResultReload' : 'buyResultReload'];
    assert(saved.saved && saved.raw && saved.loaded); assert.equal(saved.raw, saved.rawAfterRead);
    assert.deepEqual(saved.inputBefore, saved.inputAfter); assert.equal(saved.draws.length, 0);
  }
  assert.equal(raw.cases['job-talk'].actual.negotiation.status, 'open'); assert.equal(raw.cases['job-talk'].draws.length, 3);
  const purchase = raw.cases['job-buy'];
  assert(purchase.actual.squad.some(player => player.name === purchase.card.name && player.worldRosterKey === purchase.card.worldRosterKey));
  assert.equal(purchase.actual.budget, Math.round((purchase.inputBefore.budget - purchase.card.price) * 10) / 10);
  assert(purchase.buyResultReload.loaded.squad.some(player => player.name === purchase.card.name && player.worldRosterKey === purchase.card.worldRosterKey));
  assert.deepEqual(raw.cases['preserve-job-identity'].sourceRecord, raw.cases['preserve-job-identity'].carriedRecord);
  assert.deepEqual(raw.cases['preserve-job-identity'].sourceRecord, raw.cases['preserve-job-identity'].loadedRecord);
  receipt.classification = { total: 8, preciseFaults: FAULTS.map(row => row[0]), preserves: PRESERVES.map(row => row[0]) };
  receipt.raw = { file: 'raw-states.json', bytes: fs.statSync(rawFile).size, sha256: sha(fs.readFileSync(rawFile)) };
  receipt.status = 'qualified-current-bug';
} catch (error) {
  receipt.status = 'failed'; receipt.error = String(error); throw error;
} finally {
  for (const row of held) assert.deepEqual(fs.readFileSync(row.file), row.bytes, 'Held complete source/dependency: ' + row.file);
  git(['diff', '--exit-code', BASE, '--', 'src', ':!' + TEST]);
  receipt.sourceHeld = true; retain();
}
console.log('Manager transfer edge baseline: exactly four semantic faults and four preservation passes, actual natural sale/season and application/job/January journeys, source held.');
