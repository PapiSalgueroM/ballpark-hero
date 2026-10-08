/* Round889: real initializer, retained offline model and full normal campaign.
   Grades and contract prices are original simulation estimates, not historical statistics. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const test = 'src/lib/frontOfficeRatings.test.ts';
const model = 'scripts/lib/nflFoRatingModel.mjs', generator = 'scripts/genFrontOfficeRoster.mjs', engine = 'src/lib/frontOffice.ts';
const files = [test, model, generator, engine, 'src/data/frontOfficeDepth.ts', 'src/data/frontOfficePlayers.ts', 'src/lib/frontOfficeCuts.ts', 'src/lib/frontOfficeSave.ts', 'src/lib/foNames.ts', 'src/lib/entityIds.ts', 'scripts/data/nflFoRatingInputs2026.json', 'scripts/data/nflRosters2026.json', 'scripts/data/nflRosterSpotCheck.json', 'scripts/data/nflRosters2026LeftOut.json', 'scripts/data/nfl2025Production.json', 'scripts/data/nflFullbackRoles2026.json', 'scripts/lib/nflProduction.mjs'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const sourceOf = file => held.find(([name]) => name === file)[1].source;
const executable = source => source.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
const titles = {
  core: 'preserves the physical56356be9 no-depth league and draw sequence as an independent baseline',
  legacy: 'keeps explicit legacy depth and saved old grades unchanged as an independent baseline',
  checkpoint: 'reproduces all2163 frozen candidate grades fictional prices and years without named overrides',
  partial: 'retains dated-role partial labels and their concrete limitation reasons',
  init: 'initializes every candidate tuple while retaining32 exact untrimmed budgets membership and terms',
  generation: 'rebakes the committed depth core and left-out files exactly without writing them',
  evidence: 'saves only five original lineage fields below700KiB and reloads them without rerating',
  coverage: 'shrinks coverage on targets rather than unrelated defensive snaps',
  missing: 'keeps missing defensive features absent instead of granting zero-valued evidence',
  bounded: 'bounds the measured target before small-sample blending and requires dated normalizers',
  manifest: 'keeps source-stat observations and fitted models outside the browser data with a dated manifest',
  moves: 'carries original player evidence through real trades cuts and practice promotion',
  campaign: 'plays four actual seasons playoffs drafts and summers with bounded saves and a nonnegative normal cap',
  refusal: 'refuses stale identity or source records before the real generator CLI writes outputs',
  board: 'deals the same board league for a seed as the tree recorded before the opening files were unified',
  releaseAk: 'loads a Release AK franchise unchanged and plays its next week exactly as Release AK would',
  oneNumber: 'prints one opening number per man in the starters and depth files with no override left',
};
const ratingCases = [titles.checkpoint, titles.partial, titles.init, titles.generation];
const allModelCases = [...ratingCases, titles.coverage, titles.missing, titles.bounded];
const controls = {
  clamp: [model, 'clip(84+12*score/evidence,55,98)', '(84+12*score/evidence)', [titles.checkpoint, titles.init, titles.generation, titles.bounded]],
  datedRole: [model, 'models.defense[`${row.season}|${row.role}`]', 'models.defense[`${row.season}|${currentRole(record.sourceIdentity.depthChartPosition)}`]', [...ratingCases, titles.bounded, titles.oneNumber]],
  opportunity: [model, 'accumulated.units+=weightedExposure/f.typicalExposure;', 'accumulated.units+=row.baseExposure*recency[row.season]/f.typicalExposure;', [titles.checkpoint, titles.init, titles.generation, titles.coverage, titles.bounded]],
  missing: [model, 'const m=row.features[key],f=model.features[key];if(!m||!f)continue;', 'const m=row.features[key]??{value:0,exposure:row.baseExposure},f=model.features[key];if(!m||!f)continue;', [titles.checkpoint, titles.init, titles.generation, titles.missing]],
  partial: [model, '||!role||!datedRoles.includes(role);', ';', [titles.partial, titles.generation, titles.bounded]],
  budget: [model, 'surplus=totalTenths-floorTenths;', 'surplus=totalTenths-floorTenths+10;', [...allModelCases, titles.oneNumber]],
  /* Round 1130: the engine line this control bound (the fullOpening override) is gone with the override. What it
     guarded is now a generator step: the starters rows carry the opening estimate, not the selection seed. */
  seedrows: [generator, 'finalTeams = teams.map(t => ({ ...t, players: t.players.map(p => one(t.abbr, p)) }));', 'finalTeams = teams;', [titles.generation, titles.oneNumber]],
  evidence: [engine, 'p.openingRatingEvidence = { modelVersion, originKey, openingOvr, basis, partial };', 'void evidence;', [titles.evidence, titles.moves, titles.board]],
  compact: [engine, 'p.openingRatingEvidence = { modelVersion, originKey, openingOvr, basis, partial };', 'p.openingRatingEvidence = evidence;', [titles.evidence, titles.campaign, titles.board]],
  cut: [engine, 'if (fa) clearTag(fa);', 'if (fa) { clearTag(fa); delete fa.openingRatingEvidence; }', [titles.moves]],
  refusal: [generator, 'if (out.ratingProblem) throw new Error(out.ratingProblem);', 'void out.ratingProblem;', [titles.refusal]],
};
const control = process.env.NFL_OPENING_RATINGS_CONTROL || '';
assert.ok(!control || control in controls, 'Known NFL opening rating control');
for (const [file, anchor] of Object.values(controls)) {
  const source = sourceOf(file);
  assert.equal(executable(source).split(anchor).length - 1, 1, 'One actual executable control anchor');
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n')), raw = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'Actual control binds under CRLF');
  assert.deepEqual(crlfBytes, raw, 'Synthetic CRLF bytes remain exact');
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/nfl-rating889-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP; delete env.NFL_RATING_GENERATOR_SOURCE; delete env.NFL_RATING_MODEL_SOURCE;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  if (control) {
    const [target, anchor, replacement] = controls[control], original = sourceOf(target);
    let changed = original.replace(anchor, replacement); assert.notEqual(changed, original, 'Control changes executable source');
    if (target === engine) changed = changed.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3');
    if (target === generator) changed = changed.replace("const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');", 'const ROOT = ' + JSON.stringify(root.replaceAll('\\', '/')) + ';').replace(/from ['"]\.\/lib\/([^'"]+)['"]/g, (_all, name) => 'from ' + JSON.stringify(path.join(root, 'scripts/lib', name).replaceAll('\\', '/')));
    const copy = path.join(folder, path.basename(target)); await writeFile(copy, changed); owned.push(copy);
    const aliases = target === engine ? { '@/lib/frontOffice': copy } : target === model
      ? { '../../scripts/lib/nflFoRatingModel.mjs': copy, './lib/nflFoRatingModel.mjs': copy, [path.join(root, model).replaceAll('\\', '/')]: copy }
      : { '../../scripts/genFrontOfficeRoster.mjs': copy };
    env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
    if (target === model) env.NFL_RATING_MODEL_SOURCE = copy;
    if (target === generator) env.NFL_RATING_GENERATOR_SOURCE = copy;
  }
  const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused runner completes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 17); assert.equal(new Set(rows.map(row => row.title)).size, 17);
  assert.ok(rows.every(row => row.status === 'passed' || row.status === 'failed'), 'All seventeen outcomes execute without skips');
  for (const title of [titles.core, titles.legacy, titles.manifest]) assert.equal(rows.find(row => row.title === title)?.status, 'passed', 'Independent physical old-state/source-data baselines held');
  if (control) {
    const failed = rows.filter(row => row.status === 'failed'), expected = controls[control][3];
    /* Round 1130: say WHICH cases went red before the count is judged, so a list can be re-established from one run */
    if (failed.map(row => row.title).sort().join('|') !== [...expected].sort().join('|')) console.error(`NFL_RATING_CONTROL_MISMATCH: ${JSON.stringify({ control, failed: failed.map(row => row.title), expected, messages: failed.map(row => row.failureMessages[0].split('\n')[0].slice(0, 160)) })}`);
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 17 - expected.length);
    assert.deepEqual(failed.map(row => row.title).sort(), [...expected].sort());
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:|AssertionError \[/);
    console.log(`NFL rating ${control}: one actual executable source binding changed; ${failed.length} intended failures/${17 - failed.length} held passes.`);
    console.log(`NFL_RATING_CONTROL: ${JSON.stringify({ control, failed: failed.map(row => ({ title: row.title, message: row.failureMessages[0].split('\n')[0] })) })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 17); assert.equal(report.numFailedTests, 0);
    assert.match(output, /NFL_RATING_SAVE_SIZE/); assert.match(output, /NFL_RATING_CAMPAIGN/);
    console.log('NFL opening estimates:17/17 real-engine/checkpoint/generator cases passed, no skipped cases.');
    console.log('NFL opening estimates:2163 frozen grade/fictional-price tuples,32 exact untrimmed opening budgets and membership/terms held.');
    console.log('NFL opening estimates:physical56356be9 no-depth results and RNG held; explicit old-depth saves retain original grades without evidence or rerating.');
    console.log('NFL opening estimates:four real17-game seasons,52 playoff games,84 draft arrivals,24 actual-validator JSON resumes and nonnegative normal cap checks passed.');
    console.log('NFL opening estimates:five-field saved origin lineage survives real trades/cuts/promotion; save700KiB and lazy source-data gzip budgets held.');
    console.log('NFL opening estimates:coverage target shrinkage,missing features,dated cohorts,clipped targets and generator stale-source no-write refusal held.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) { assert.equal(path.dirname(path.resolve(folder)), path.resolve(root, '.sim-control')); assert.ok(path.basename(folder).startsWith('nfl-rating889-')); await rmdir(folder); }
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Actual engine/data/model/generator/test raw bytes held');
  }
}
console.log('NFL opening estimates:CRLF bindings,raw source holds and owned cleanup passed. Offline model and one normal campaign do not prove historical accuracy,all-seed calibration or native UI behavior.');
