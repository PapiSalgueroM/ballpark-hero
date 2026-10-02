/* Round895: actual NBA opening initializer, original saves and bounded offline campaigns.
   Ratings and contracts are simulation estimates. This proof makes no historical accuracy claim. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const test = 'src/lib/nbaOpeningRatings.test.ts', engine = 'src/lib/nbaFrontOffice.ts', model = 'scripts/lib/nbaFoRatingModel.mjs';
const files = [test, engine, model, 'src/data/nbaOpeningRatings.ts', 'src/data/conquestDataNba.ts', 'src/lib/nbaSeasonStats.ts', 'src/lib/nbaRotation.ts', 'src/lib/nbaLuxuryTax.ts', 'src/lib/frontOfficeCuts.ts', 'src/lib/foSchedule.ts', 'src/lib/foSeasonStats.ts', 'src/lib/entityIds.ts', 'src/lib/foNames.ts', 'scripts/data/nbaFoRatingInputs2026.json', 'scripts/genNbaOpeningRatings.mjs'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replace(/\r\n/g, '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const sourceOf = file => held.find(([name]) => name === file)[1].source;
const executable = source => source.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
const titles = {
  baseline: 'preserves the physical e8b39ccc default league full season and RNG as an independent baseline',
  legacy: 'keeps physical old-save grades and absent evidence unchanged through restore and play',
  checkpoint: 'replays all300 frozen model grades and fictional opening prices without named overrides',
  init: 'applies all300 real initializer tuples and preserves30 exact original club budgets',
  held: 'holds original terms generated ages free agents schedule tax scale and constructor RNG',
  potential: 'carries original developmental headroom onto new grades with a99 potential ceiling',
  evidence: 'copies exact five-field partial original evidence with distinct prior and unresolved bases',
  save: 'resumes progressed JSON saves without rerating or losing original lineage below400KiB',
  trade: 'retains original player evidence through an actual opening-price trade',
  waiver: 'retains waiver lineage charges actual dead money and prevents same-season return',
  generated: 'leaves generated free agents and future draft arrivals without historical opening evidence',
  stats: 'keeps actual tipoff and played box-score points consistent with opening player identities',
  finance: 'keeps hard signing refusals and increasing-salary apron trades while allowing matched over-cap trades',
  campaign: 'plays three complete real seasons drafts and summers with saved lineage and accounting identities',
  source: 'retains a dated script-only source checkpoint and excludes raw observations from the browser',
  sample: 'bounds measured targets before opportunity blending and leaves unmeasured players at a disclosed prior',
};
const evidenceAssignment = `        player.openingRatingEvidence = {
          modelVersion: evidence.modelVersion, originKey: evidence.originKey,
          openingOvr: evidence.openingOvr, basis: evidence.basis, partial: evidence.partial,
        };`;
const controls = {
  ovr: [engine, '        player.ovr = rating.ovr;', '        void rating.ovr;', [titles.init, titles.potential, titles.evidence, titles.campaign]],
  price: [engine, '        player.salary = rating.salary;', '        void rating.salary;', [titles.init]],
  headroom: [engine, '        player.pot = Math.min(99, rating.ovr + headroom);', '        player.pot = rating.ovr;', [titles.potential]],
  evidence: [engine, evidenceAssignment, '        void evidence;', [titles.evidence, titles.save, titles.trade, titles.waiver, titles.campaign]],
  copy: [engine, evidenceAssignment, '        player.openingRatingEvidence = evidence;', [titles.evidence]],
  identity: [engine, '!evidence || evidence.originKey !== `${seed.id}|${source.name}|${source.position}` ||', '!evidence || false ||', [titles.evidence]],
  basis: [engine, 'openingOvr: evidence.openingOvr, basis: evidence.basis, partial: evidence.partial,', "openingOvr: evidence.openingOvr, basis: 'box-score-proxy', partial: evidence.partial,", [titles.evidence]],
  clamp: [model, 'const target=bounded(unclipped,MODEL_CONFIG.gradeMinimum,MODEL_CONFIG.gradeMaximum);', 'const target=unclipped;', [titles.checkpoint, titles.sample]],
  sample: [model, 'const confidence=(opportunities,prior)=>opportunities/(opportunities+prior);', 'const confidence=(opportunities,prior)=>1;', [titles.checkpoint, titles.sample]],
  budget: [model, 'available=budgetTenths-minimumTenths*rows.length,', 'available=budgetTenths-minimumTenths*rows.length+10,', [titles.checkpoint]],
  cap: [engine, '  if (nbaCapRoom(t, cap) < p.salary) return false;', '  if (false && nbaCapRoom(t, cap) < p.salary) return false;', [titles.finance]],
  apron: [engine, '  if (taxScale != null && after > nbaFirstApron(cap, taxScale)) return incoming.salary <= outgoing.salary;', '  if (false && taxScale != null && after > nbaFirstApron(cap, taxScale)) return incoming.salary <= outgoing.salary;', [titles.finance]],
  return: [engine, '  if (signRefusal(t, id)) return false;', '  if (false && signRefusal(t, id)) return false;', [titles.waiver]],
};
const control = process.env.NBA_OPENING_RATINGS_CONTROL ?? '';
assert.ok(!control || control === 'original' || Object.hasOwn(controls, control), 'Known actual opening-rating control');
for (const [file, anchor] of Object.values(controls)) {
  const source = sourceOf(file), code = executable(source);
  assert.equal(source.split(anchor).length - 1, 1, 'Unique real executable binding');
  assert.equal(code.split(anchor).length - 1, 1, 'Control binds executable code, not comments');
  const crlf = source.replace(/\n/g, '\r\n');
  assert.equal(holdSource(Buffer.from(crlf)).source.split(anchor).length - 1, 1, 'Synthetic CRLF copy binds once');
}
const env = { ...process.env, VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
delete env.NO_DOUBLE_SWAP;
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/nba-opening895-'));
  assert.equal(path.dirname(path.resolve(folder)), path.resolve(root, '.sim-control')); assert.ok(path.basename(folder).startsWith('nba-opening895-'));
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  if (control) {
    let target, changed;
    if (control === 'original') {
      target = engine;
      const shown = spawnSync('git', ['show', 'e8b39ccc:' + engine], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
      assert.equal(shown.status, 0, 'Physical pre-cutover NBA source is available');
      changed = shown.stdout.toString('utf8').replace(/\r\n/g, '\n');
      assert.notEqual(changed, sourceOf(engine), 'Original source differs from integrated initializer');
    } else {
      const [file, anchor, replacement] = controls[control]; target = file;
      changed = sourceOf(file).replace(anchor, replacement); assert.notEqual(changed, sourceOf(file), 'Control actually changes source');
    }
    if (target === engine) changed = changed.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3');
    const copy = path.join(folder, path.basename(target)); await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify(target === engine ? { '@/lib/nbaFrontOffice': copy } : { '../../scripts/lib/nbaFoRatingModel.mjs': copy });
  }
  const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile];
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 90000, maxBuffer: 12 * 1024 * 1024 });
  const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  assert.ok(!run.error && !run.signal, 'Focused single-worker runner exits normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  assert.equal(rows.length, 16); assert.equal(new Set(rows.map(row => row.title)).size, 16);
  assert.ok(rows.every(row => row.status === 'passed' || row.status === 'failed'), 'All16 outcomes execute with no skipped cases');
  console.log('NBA_OPENING_OUTCOMES ' + JSON.stringify({ control: control || 'normal', outcomes: rows.map(row => ({ title: row.title, status: row.status })) }));
  for (const title of [titles.baseline, titles.legacy, titles.source]) assert.equal(rows.find(row => row.title === title)?.status, 'passed', 'Independent default/old-save/source baselines held');
  if (control) {
    const expected = control === 'original' ? [titles.init, titles.potential, titles.evidence, titles.save, titles.trade, titles.waiver, titles.campaign] : controls[control][3];
    const failed = rows.filter(row => row.status === 'failed');
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 16 - expected.length);
    assert.deepEqual(failed.map(row => row.title).sort(), [...expected].sort());
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:|AssertionError \[/);
    console.log(`NBA opening ${control}: ${failed.length} intended failures/${16 - failed.length} held passes, all16 executed.`);
    console.log('NBA_OPENING_CONTROL ' + JSON.stringify({ control, failed: failed.map(row => ({ title: row.title, message: row.failureMessages[0].split('\n')[0] })) }));
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 16); assert.equal(report.numFailedTests, 0);
    for (const marker of ['NBA_RATING_SAVE_SIZE', 'NBA_RATING_CAMPAIGN']) assert.match(output, new RegExp(marker));
    for (const measured of output.match(/NBA_RATING_(?:SAVE_SIZE|CAMPAIGN) \{[^\n]+\}/g) ?? []) console.log(measured);
    console.log('NBA opening:16/16 actual initializer/model/move/accounting outcomes passed, without skipped cases.');
    console.log('NBA opening:all300 reviewed original estimates/prices applied; all30 original budgets and constructor ages/terms/free agents/RNG/schedule/tax held.');
    console.log('NBA opening:physical e8b39ccc default whole-season and old-save grades/evidence baselines held.');
    console.log('NBA opening:three real80-game seasons,63 postseason rows,6 GM/30 AI draft arrivals and18 JSON resumes passed with bounded saved lineage.');
    console.log('NBA opening:real opening-price trades and waivers retain original provenance; cap/apron/no-return rules and script-only raw facts held.');
  }
} finally {
  for (const file of owned) { assert.equal(path.dirname(path.resolve(file)), path.resolve(folder), 'Only owned copied direct files are removed'); await rm(file, { force: true }); }
  if (folder) { assert.equal(path.dirname(path.resolve(folder)), path.resolve(root, '.sim-control')); assert.ok(path.basename(folder).startsWith('nba-opening895-')); await rmdir(folder); }
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Actual engine/model/input/data/test raw bytes held');
  }
}
console.log('NBA opening:normalized CRLF bindings, raw holds and owned-copy cleanup passed. These offline cases do not prove historical player ability, native UI, remote saves or all-seed balance.');
