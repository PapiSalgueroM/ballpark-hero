import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
const root = process.cwd(), out = process.env.NFL_TE_OUT, GAIN = 1.470637063010287;
const sha = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
assert(process.env.CI === 'true' && path.isAbsolute(out || '') && root === path.join(out, 'work'), 'NFL_TE_BALANCE_REMOTE_COPY');
const dest = path.join(out, 'adoption-balance'); assert(!fs.existsSync(dest)); fs.mkdirSync(dest);
const json = (name, value) => fs.writeFileSync(path.join(dest, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const PINS = {
  'src/lib/perfectSeasonNfl.ts': 'e7ab2d13bd5e8d59e22bf1b570c6d17a6af6c97e',
  'src/lib/perfectSeason.ts': '2acc9b8498e15b53c9eebc87ea45d3dd77ec2de6',
  'src/lib/perfectSeasonExpansion.ts': '2c681b79098f6186cc92122b215b1b137826358c',
  'src/pages/PerfectSeasonNfl.tsx': '6d62a1fd7fb58e52789dd8835ab456973bf803fa',
  'src/test/nflTeReceivingExperiment.test.ts': '08238d36e9b0711989c7667e3d0f91331efe8ded',
  'src/test/nflTeAdoption.test.tsx': 'e0ac1c4079d1abb9809b87aaee881a0113f34cc6',
  'scripts/qa/fixtures/nfl-te/legacy-outcomes.json': 'aa9175d9993a04985ce4fd39e821d82057e16ba9',
  'scripts/qa/experimentNflTeCalibration.mjs': '485251c33a54835c482e28425985d316c7f13850',
};
const members = fs.readFileSync(path.join(out, 'source-members.before'), 'utf8').split('\0').filter(Boolean);
const initial = new Map(members.map(name => [name, sha(fs.readFileSync(name))]));
function held() {
  for (const [name, digest] of initial) assert.equal(sha(fs.readFileSync(name)), digest, 'NFL_TE_BALANCE_SOURCE_HELD:' + name);
  for (const [name, digest] of Object.entries(PINS)) assert.equal(blob(fs.readFileSync(name)), digest, 'NFL_TE_BALANCE_SOURCE_PIN:' + name);
}
held();
const inputs = Object.fromEntries(['EXPERIMENT-ADMISSION.json', 'TRAINING-FIT.json', 'old-green/outcomes.json', 'candidate-green/outcomes.json']
  .map(name => [name, fs.readFileSync(path.join(out, name))]));
const admission = JSON.parse(inputs['EXPERIMENT-ADMISSION.json']), fit = JSON.parse(inputs['TRAINING-FIT.json']);
assert.equal(admission.status, 'MEASURED_EXPERIMENT_COMPLETED_NO_PRODUCT_ADOPTION');
assert.equal(admission.fitGain, GAIN); assert.equal(fit.gain, GAIN); assert.equal(fit.holdoutUsedForFitting, false);
assert.deepEqual(admission.counts, { runs: 7, casesPerRun: 4, sourceControls: 2, copiedClassifierControls: 3 });
assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'MATCHED-COPY-FINAL-HOLDS.json'))).sourceHeld, true);
const old = JSON.parse(inputs['old-green/outcomes.json']), candidate = JSON.parse(inputs['candidate-green/outcomes.json']);
assert.deepEqual(old.calls, candidate.calls); assert.deepEqual(old.squads.map(s => s.squadId), ['NE-2011', 'KC-2022']);
for (const squad of old.squads) {
  const next = candidate.squads.find(s => s.squadId === squad.squadId); assert.equal(next.players.length, squad.players.length);
  for (const player of squad.players) {
    const changed = next.players.find(p => p.playerId === player.playerId); assert(changed);
    assert.deepEqual({ ...changed, rating: player.rating }, player, 'NFL_TE_BALANCE_ONLY_RATING');
    if (!player.eligible.includes('TE')) assert.equal(changed.rating, player.rating, 'NFL_TE_BALANCE_NON_TE_EXACT');
  }
}
json('INPUT-ASSOCIATION.json', { frozenGain: GAIN, base: process.env.EXPECTED_BASE, proof: process.env.GITHUB_SHA,
  originalRun: '41014717055', originalProof: '2ee831eb247deb832ddc7bd670a486a67813fab1', currentRunArms: true,
  inputs: Object.entries(inputs).map(([file, bytes]) => ({ file, sha256: sha(bytes) })), sources: PINS, importedToProduct: false });
const entry = path.join(dest, 'actual-engine-entry.mjs'), target = path.join(dest, 'actual-engine.mjs');
fs.writeFileSync(entry, 'export { teamOverall } from ' + JSON.stringify(path.join(root, 'src/lib/perfectSeason.ts')) +
  ';\nexport { simulateSeasonFair, expectedWins } from ' + JSON.stringify(path.join(root, 'src/lib/perfectSeasonExpansion.ts')) + ';\n', { flag: 'wx' });
const built = await build({ entryPoints: [entry], outfile: target, bundle: true, platform: 'node', format: 'esm',
  alias: { '@': path.join(root, 'src') }, absWorkingDir: root, metafile: true });
json('actual-engine-metafile.json', built.metafile);
const engine = await import(pathToFileURL(target).href);
const slots = [{ key: 'QB', weight: 1.8 }, { key: 'RB', weight: 1 }, { key: 'WR', weight: 1 }, { key: 'WR2', weight: 1 },
  { key: 'TE', weight: 1 }, { key: 'FLEX', weight: 1 }, { key: 'DEF', weight: 1.3 }, { key: 'HC', weight: 0.7 }];
const weight = slots.reduce((sum, slot) => sum + slot.weight, 0); assert(Math.abs(weight - 8.8) < 1e-12);
const all = old.squads.flatMap(s => s.players.map(player => ({ squad: s.squadId, year: s.year, player })));
const tightEnds = all.filter(row => row.player.eligible.includes('TE')); assert.equal(tightEnds.length, 4);
const key = row => row.squad + '/' + row.player.playerId;
const counterpart = row => candidate.squads.find(s => s.squadId === row.squad).players.find(p => p.playerId === row.player.playerId);
function top(pool, slot, used) {
  const rows = pool.filter(row => row.player.eligible.includes(slot) && !row.player.eligible.includes('TE') && !used.has(row.player.name))
    .sort((a, b) => b.player.rating - a.player.rating || key(a).localeCompare(key(b)));
  assert(rows.length, 'NFL_TE_BALANCE_REAL_SLOT:' + slot); return rows[0];
}
function draft(id, te, flexTe, ownerForSlot) {
  const picks = { TE: te }, used = new Set([te.player.name]);
  if (flexTe) { assert(!used.has(flexTe.player.name)); picks.FLEX = flexTe; used.add(flexTe.player.name); }
  for (const slot of slots.filter(s => !picks[s.key])) {
    const owner = ownerForSlot(slot.key), pool = owner ? all.filter(row => row.squad === owner) : all;
    picks[slot.key] = top(pool, slot.key, used); used.add(picks[slot.key].player.name);
  }
  assert.equal(Object.keys(picks).length, 8); assert.equal(used.size, 8);
  for (const slot of slots) assert(picks[slot.key].player.eligible.includes(slot.key));
  return { id, picks };
}
const drafts = [];
for (const squad of old.squads) {
  const pair = tightEnds.filter(row => row.squad === squad.squadId).sort((a, b) => b.player.rating - a.player.rating);
  assert.equal(pair.length, 2); drafts.push(draft(squad.squadId + '-two-te', pair[0], pair[1], () => squad.squadId));
}
const owners = ['NE-2011', 'KC-2022'], supportSlots = ['QB', 'RB', 'WR', 'WR2', 'DEF', 'HC'];
for (const start of [0, 1]) {
  const ownerFor = slot => slot === 'FLEX' ? null : owners[(supportSlots.indexOf(slot) + start) % 2];
  for (const te of tightEnds) drafts.push(draft('mixed-' + start + '-single-' + key(te), te, null, ownerFor));
  for (let i = 0; i < tightEnds.length; i++) for (let j = i + 1; j < tightEnds.length; j++) {
    drafts.push(draft('mixed-' + start + '-double-' + key(tightEnds[i]) + '-' + key(tightEnds[j]), tightEnds[i], tightEnds[j], ownerFor));
  }
}
assert.equal(drafts.length, 22); assert.equal(new Set(drafts.map(d => d.id)).size, 22);
const quantile = (values, p) => {
  const s = [...values].sort((a, b) => a - b), i = (s.length - 1) * p, a = Math.floor(i), b = Math.ceil(i);
  return s[a] + (s[b] - s[a]) * (i - a);
};
const describe = values => ({ mean: values.reduce((n, v) => n + v, 0) / values.length, p10: quantile(values, .1),
  median: quantile(values, .5), p90: quantile(values, .9), atLeast12: values.filter(v => v >= 12).length, perfect: values.filter(v => v === 17).length });
const summaries = [], raw = [];
for (const draft of drafts) {
  const before = Object.fromEntries(slots.map(s => [s.key, draft.picks[s.key].player]));
  const after = Object.fromEntries(slots.map(s => [s.key, counterpart(draft.picks[s.key])]));
  const changedSlots = slots.filter(s => before[s.key].rating !== after[s.key].rating).map(s => s.key);
  assert(changedSlots.every(slot => slot === 'TE' || slot === 'FLEX'));
  for (const slot of slots) assert.deepEqual({ ...after[slot.key], rating: before[slot.key].rating }, before[slot.key]);
  const oldOverall = engine.teamOverall(slots, before), candidateOverall = engine.teamOverall(slots, after);
  const ratingDelta = slots.reduce((sum, s) => sum + (after[s.key].rating - before[s.key].rating) * s.weight, 0);
  assert(Math.abs(candidateOverall - oldOverall - ratingDelta / weight) < 1e-10, 'NFL_TE_BALANCE_WEIGHTED_SHIFT');
  const oldWins = [], nextWins = [];
  for (let seed = 1; seed <= 2400; seed++) {
    const a = engine.simulateSeasonFair('nfl', oldOverall, 17, seed), b = engine.simulateSeasonFair('nfl', candidateOverall, 17, seed);
    assert(b.wins >= a.wins, 'NFL_TE_BALANCE_PAIRED_MONOTONIC'); oldWins.push(a.wins); nextWins.push(b.wins);
    raw.push({ id: draft.id, seed, oldWins: a.wins, candidateWins: b.wins, oldPerfect: a.perfect, candidatePerfect: b.perfect });
  }
  const baseline = describe(oldWins), proposed = describe(nextWins);
  summaries.push({ id: draft.id, mixedEra: new Set(Object.values(draft.picks).map(row => row.year)).size > 1,
    twoTe: before.FLEX.eligible.includes('TE'),
    picks: Object.fromEntries(slots.map(s => [s.key, { squad: draft.picks[s.key].squad, year: draft.picks[s.key].year,
      ...before[s.key], candidateRating: after[s.key].rating }])),
    changedSlots, seeds: 2400, oldOverall, candidateOverall, overallDelta: candidateOverall - oldOverall,
    oldExpectedWins: engine.expectedWins('nfl', oldOverall), candidateExpectedWins: engine.expectedWins('nfl', candidateOverall),
    old: baseline, candidate: proposed, meanWinDelta: proposed.mean - baseline.mean,
    headroom: { candidateOverallTo99: 99 - candidateOverall, candidateExpectedWinsToCurveCeiling: engine.expectedWins('nfl', 99) - engine.expectedWins('nfl', candidateOverall),
      candidateMeanWinsTo17: 17 - proposed.mean }, balanceAcceptanceMargin: null });
}
assert.equal(raw.length, 52800); held();
json('PAIRED-RAW.json', raw);
json('MEASUREMENTS.json', { schema: 1, status: 'MEASURED_ONLY_ROOT_BALANCE_REVIEW_REQUIRED', frozenGain: GAIN,
  squads: old.squads.map(s => s.squadId), cases: 22, pairsPerCase: 2400, totalPairs: raw.length,
  sourceControlsPreviouslyQualified: 2, addedSourceControlOrFit: false, coefficientRetuned: false, summaries,
  acceptanceMarginInvented: false, wrParityIsExternalPlayerQuality: false, productGo: false, dailyActivation: false });
function inspectFocusedBaseline(actual, runtime, processResult) {
  assert.equal(processResult.status, 1, 'NFL_TE_ADOPTION_BASELINE_RAW');
  assert.equal(processResult.signal, null); assert.equal(processResult.error, null);
  assert.equal(runtime.arrayReceived, true); assert.equal(runtime.count, 0, 'NFL_TE_ADOPTION_BASELINE_RUNTIME');
  assert.deepEqual(runtime.errors, []); assert.deepEqual(runtime.fileErrors, []);
  assert.equal(actual.testResults.length, 1); assert.equal(actual.testResults[0].message, '');
  assert.equal(path.relative(root, actual.testResults[0].name).split(path.sep).join('/'), 'src/test/nflTeAdoption.test.tsx');
  const expected = [
    ['NFL tight-end adoption adapter', 'explicit legacy loading preserves original squads, statistics and queries', null],
    ['NFL tight-end adoption adapter', 'calibrates only tight-end ratings through the real default adapter', 'NFL_TE_ADOPTION_CURVE_MISSING'],
    ['NFL Daily tight-end activation', 'keeps Daily legacy before the activation ET date', null],
    ['NFL Daily tight-end activation', 'activates the calibrated curve at the first eligible ET date', 'NFL_TE_DAILY_BOUNDARY'],
    ['NFL Daily tight-end activation', 'uses the calibrated Classic curve before the Daily cutoff', 'NFL_TE_CLASSIC_CURVE'],
    ['NFL Daily tight-end activation', 'keeps a mounted Daily legacy across ET midnight', null],
    ['NFL Daily tight-end activation', 'saves a Daily finished after midnight under its pinned ET date', null],
    ['NFL Daily tight-end activation', 'pins draws, simulation seed and date when Daily is entered after ET midnight', 'NFL_TE_DAILY_ENTRY_DATE_PIN'],
    ['NFL Daily tight-end activation', 'reopens the 2026-11-01 saved result without fetching or recomputing', null],
    ['NFL Daily tight-end activation', 'reopens the 2026-11-02 saved result without fetching or recomputing', null],
  ];
  const rows = actual.testResults[0].assertionResults;
  assert.equal(rows.length, 10, 'NFL_TE_ADOPTION_BASELINE_IDENTITY'); assert.equal(new Set(rows.map(r => r.fullName)).size, 10);
  for (const [describe, title, marker] of expected) {
    const row = rows.find(r => r.fullName === describe + ' ' + title); assert(row, 'NFL_TE_ADOPTION_BASELINE_IDENTITY');
    assert.deepEqual(row.ancestorTitles, [describe]); assert.equal(row.title, title);
    assert.equal(row.status, marker ? 'failed' : 'passed', 'NFL_TE_ADOPTION_BASELINE_OWNED_OUTCOME');
    if (marker) {
      assert.equal(row.failureMessages.length, 1);
      const first = row.failureMessages[0].split('\n')[0];
      assert.match(first, /^AssertionError(?:\s|\[|:)/); assert(first.includes(marker), 'NFL_TE_ADOPTION_BASELINE_OWNED_MARKER');
    } else assert.deepEqual(row.failureMessages, []);
  }
  for (const [key, value] of Object.entries({ numTotalTests: 10, numPassedTests: 6, numFailedTests: 4, numPendingTests: 0, numTodoTests: 0 })) assert.equal(actual[key], value);
  assert.equal(actual.success, false);
  return expected;
}
function focusedBaseline() {
  const dir = path.join(out, 'adoption-focused-baseline'); fs.mkdirSync(dir);
  const leaf = 'src/test/nflTeAdoption.test.tsx', reporter = path.join(out, 'runtime-reporter.mjs');
  const args = ['test', '--', leaf, '--no-cache', '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism',
    '--reporter=default', '--reporter=' + reporter, '--outputFile.json=' + path.join(dir, 'vitest.json')];
  const result = spawnSync('npm', args, { encoding: 'utf8', timeout: 180000,
    env: { ...process.env, NFL_TE_RUNTIME: path.join(dir, 'runtime.json') } });
  fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '');
  fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '');
  fs.writeFileSync(path.join(dir, 'raw.exit'), String(result.status) + '\n');
  fs.writeFileSync(path.join(dir, 'process.json'), JSON.stringify({ executable: 'npm', args,
    status: result.status, signal: result.signal, error: result.error ? String(result.error) : null }, null, 2) + '\n');
  const actual = JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json')));
  const runtime = JSON.parse(fs.readFileSync(path.join(dir, 'runtime.json')));
  const processResult = { status: result.status, signal: result.signal, error: result.error ? String(result.error) : null };
  const identities = inspectFocusedBaseline(actual, runtime, processResult);
  const body = Buffer.from(JSON.stringify({ report: actual, runtime, process: processResult }, null, 2) + '\n');
  const working = path.join(dir, 'classifier-working.json'), receipts = [];
  fs.writeFileSync(working, body, { flag: 'wx' });
  for (const [id, marker, mutate] of [
    ['raw', 'NFL_TE_ADOPTION_BASELINE_RAW', x => { x.process.status = 0; }],
    ['identity', 'NFL_TE_ADOPTION_BASELINE_IDENTITY', x => { x.report.testResults[0].assertionResults.pop(); }],
    ['runtime', 'NFL_TE_ADOPTION_BASELINE_RUNTIME', x => { x.runtime.count = 1; }],
  ]) {
    const changed = JSON.parse(body); mutate(changed);
    const bytes = Buffer.from(JSON.stringify(changed, null, 2) + '\n'); assert.notDeepEqual(bytes, body);
    fs.writeFileSync(path.join(dir, 'classifier-' + id + '.changed.json'), bytes, { flag: 'wx' }); fs.writeFileSync(working, bytes);
    let refusal;
    try { const x = JSON.parse(fs.readFileSync(working)); inspectFocusedBaseline(x.report, x.runtime, x.process); }
    catch (error) { refusal = error; } finally { fs.writeFileSync(working, body); }
    assert(refusal instanceof assert.AssertionError && refusal.message.includes(marker), 'NFL_TE_ADOPTION_CLASSIFIER_CONTROL');
    assert.deepEqual(fs.readFileSync(working), body);
    const restored = JSON.parse(fs.readFileSync(working)); inspectFocusedBaseline(restored.report, restored.runtime, restored.process);
    receipts.push({ id, marker, before: sha(body), changed: sha(bytes), restored: sha(fs.readFileSync(working)), featureCredit: false });
  }
  json('BASELINE-CLASSIFIER-CONTROLS.json', receipts);
  json('FOCUSED-BASELINE-ADMISSION.json', { raw: 1, total: 10, passed: 6, causalAssertionErrors: 4, runtimeErrors: 0,
    fileErrors: 0, identities, copiedClassifierControls: 3, credit: 'Original-source causal baseline only; not fixed or adopted' });
}

focusedBaseline(); held();
json('FINAL-HOLDS.json', { trackedSourceBodiesHeld: members.length, originalNflSourceRestored: true, focusedOriginalBaselineQualified: true, noDatabaseOrProductWrite: true });
console.log('NFL_TE_ADOPTION_BALANCE_MEASURED ' + JSON.stringify({ cases: summaries.length, rawPairs: raw.length, frozenGain: GAIN, productGo: false }));
