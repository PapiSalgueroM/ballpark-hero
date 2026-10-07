/* The actual recorded career card, with independent saved totals and retained faults. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(self), '..');
const page = 'src/pages/SoccerCareer.tsx', testFile = 'src/test/careerRecordedStats.test.tsx';
const cases = {
  keeper: 'shows only the keepers saved appearances clean sheets and actual trophies',
  defender: 'shows the defenders saved appearances goals clean sheets and trophies without invented defensive actions',
  midfielder: 'shows midfielders saved goals and assists without estimating key passes',
  forward: 'shows forwards saved goals and assists without inferring hat tricks from total goals',
  unknown: 'keeps an incomplete old defender clean sheet history unknown instead of claiming a lifetime zero or partial total',
  known: 'preserves recorded zero positive legacy and no appearance clean sheets under the existing reader convention',
  update: 'updates the actual card from new saved rows without changing its earned derby record or writing a save',
  independent: 'retains the independent saved totals and unknown season baseline without the career card',
};
const controls = {
  saves: { from: 'if (pos === "GK") return [', to: 'if (pos === "GK") return [{ l: "Saves", v: totals.cleanSheets * 4 + Math.round(totals.apps * 2.5) },', test: cases.keeper },
  penalties: { from: 'if (pos === "GK") return [', to: 'if (pos === "GK") return [{ l: "Pens Saved", v: Math.floor(totals.cleanSheets / 5) },', test: cases.keeper },
  tackles: { from: 'if (backLine) return [', to: 'if (backLine) return [{ l: "Tackles", v: Math.round(totals.apps * 2.8) },', test: cases.defender },
  interceptions: { from: 'if (backLine) return [', to: 'if (backLine) return [{ l: "Interceptions", v: Math.round(totals.apps * 1.6) },', test: cases.defender },
  keyPasses: { from: '\n    { l: "Assists", v: totals.assists },', to: '\n    { l: "Assists", v: totals.assists }, { l: "Key Passes", v: Math.round(totals.assists * 3.2 + totals.apps * .8) },', test: cases.midfielder },
  hatTricks: { from: '  return [\n    { l: "Apps", v: totals.apps },', to: '  return [{ l: "Hat Tricks", v: Math.floor(totals.goals / 15) },\n    { l: "Apps", v: totals.apps },', test: cases.forward },
  apps: { from: 'if (pos === "GK") return [\n    { l: "Apps", v: totals.apps },', to: 'if (pos === "GK") return [\n    { l: "Apps", v: totals.apps + 1 },', test: cases.keeper },
  assists: { from: '\n    { l: "Assists", v: totals.assists },', to: '\n    { l: "Assists", v: totals.assists + 1 },', test: cases.midfielder },
  trophies: { from: 'const trophies = totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.worldCups + totals.continentalCups + totals.clubCups;', to: 'const trophies = totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.continentalCups + totals.clubCups;', test: cases.keeper },
  individualAward: { from: 'const trophies = totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.worldCups + totals.continentalCups + totals.clubCups;', to: 'const trophies = totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.worldCups + totals.continentalCups + totals.clubCups + totals.ballonDors;', test: cases.keeper },
  unknown: { from: 'missingSheets ? null : totals.cleanSheets', to: 'totals.cleanSheets', test: cases.unknown },
  known: { from: 'missingSheets ? null : totals.cleanSheets', to: 'null', test: cases.known },
  zeroFallback: { from: 'title="May not have been counted in every season">-</span>', to: 'title="May not have been counted in every season">0</span>', test: cases.unknown },
  caption: { from: 'Only stats kept in your season records are shown.', to: 'Career estimates.', test: cases.keeper },
  derby: { from: '<CareerDerbyTotals seasons={career.seasons} />', to: '{null}', test: cases.update },
  mutation: { from: 'const stats = getPositionCareerStats(career.position, totals, career.seasons);', to: 'const stats = getPositionCareerStats(career.position, totals, career.seasons); career.seasons[0].goals += 1;', test: cases.keeper },
  random: { from: 'const stats = getPositionCareerStats(career.position, totals, career.seasons);', to: 'const stats = getPositionCareerStats(career.position, totals, career.seasons); Math.random();', test: cases.keeper },
};
const control = process.env.CAREER_RECORDED_STATS_CONTROL || '', count = Object.keys(cases).length;
assert(!control || control === 'all' || control in controls, 'Known recorded career stats fault');
const out = path.resolve(process.env.CAREER_RECORDED_STATS_ARTIFACTS || path.join(root, 'career-practice-lifecycle-artifacts/recorded-stats'));
await mkdir(out, { recursive: true });
if (control === 'all') {
  const results = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAREER_RECORDED_STATS_CONTROL: name, CAREER_RECORDED_STATS_ARTIFACTS: out }, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(out, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} recorded career stats ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCareerRecordedStats')).join('\n') + '\n' : output.slice(-14000));
  }
  await writeFile(path.join(out, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(row => row.passed), 'All recorded card outcomes and effective faults pass');
  console.log(`simCareerRecordedStats all: ${count} actual outcomes and ${Object.keys(controls).length} effective faults passed.`);
  process.exit(0);
}
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const held = [page, 'src/lib/soccerCareerEngine.ts', 'src/lib/careerSeasonRatings.ts', 'src/lib/soccerCareerSave.ts', 'src/lib/soccerCareerDerby.ts', 'src/components/soccer-career/DerbyLines.tsx', testFile, 'scripts/simCareerRecordedStats.mjs'];
const before = {};
for (const file of held) { const bytes = await readFile(path.join(root, file)); before[file] = digest(bytes); }
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(out, `${control || 'normal'}-report.json`);
let folder, copy;
try {
  if (control) {
    const spec = controls[control], original = (await readFile(path.join(root, page), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(original.split(spec.from).length - 1, 1, 'Fault binds exactly one executable source anchor');
    const changed = original.replace(spec.from, spec.to); assert.notEqual(changed, original, 'The copied fault changes actual source');
    await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/career-recorded-stats-'));
    copy = path.join(folder, 'SoccerCareer.tsx'); await writeFile(copy, changed);
    await writeFile(path.join(out, `${control}-SoccerCareer.tsx.txt`), changed);
    await writeFile(path.join(out, `${control}-mutation.json`), JSON.stringify({ control, file: page, from: spec.from, to: spec.to, anchorCount: 1, originalSha256: digest(original), changedSha256: digest(changed), test: spec.test }, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/SoccerCareer': copy });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, cases.independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); await writeFile(path.join(out, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Actual recorded card runner completed');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runtime failures earn no fault credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, count); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, count - 2);
    const intended = rows.find(row => row.title === controls[control].test); assert.equal(intended?.status, 'failed');
    assert.match(intended.failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g, ''), /AssertionError:|Error: expect\((?:element|received)\)/, 'The mapped outcome fails an actual assertion');
    assert.equal(rows.find(row => row.title === cases.independent)?.status, 'passed');
    console.log(`simCareerRecordedStats ${control}: mapped card outcome rejected changed source; independent saved totals passed.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, count); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log(`simCareerRecordedStats: ${count} actual outcomes passed.`);
  }
} finally {
  if (copy) await rm(copy, { force: true }); if (folder) await rmdir(folder);
  const after = {};
  for (const file of held) { const bytes = await readFile(path.join(root, file)); after[file] = digest(bytes); }
  await writeFile(path.join(out, `${control || 'normal'}-integrity.json`), JSON.stringify({ before, after, held: JSON.stringify(before) === JSON.stringify(after) }, null, 2));
  assert.deepEqual(after, before, `All ${held.length} source files remain unchanged`);
}
