import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = path.resolve(process.env.WALL_PRACTICE_OUT || path.join(root, 'tmp/wall-practice-artifacts'));
assert(base.startsWith(path.join(root, 'tmp') + path.sep), 'Owned evidence inside ignored workspace tmp');
fs.mkdirSync(base, { recursive: true });
const out = fs.mkdtempSync(path.join(base, 'wall-practice-'));
const sha = value => createHash('sha256').update(value).digest('hex');
const gitBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const sourceFiles = ['src/lib/careerDrills.ts', 'src/lib/freeKick.ts', 'src/lib/arcade.ts',
  'src/components/soccer-career/DrillBoard.tsx', 'src/components/soccer-career/DrillPlayers.tsx',
  'scripts/simCareerDrills.mjs', 'scripts/qa/measureWallPractice.mjs',
  'scripts/lib/offlineTransport.cjs', 'package.json', 'package-lock.json'];
const held = new Map(sourceFiles.map(file => [file, fs.readFileSync(path.join(root, file))]));
const expected = new Map([
  ['src/lib/careerDrills.ts', '6125570ccdf2f037a7debeaa7ad14815e9ed860e'],
  ['src/lib/freeKick.ts', '7320c7d87029d6805d808eabb3d02b0f8e32cb4e'],
  ['src/lib/arcade.ts', '218a3bf3b415164920411273923b094172999618'],
  ['src/components/soccer-career/DrillBoard.tsx', 'c3c6500b976bce912d3626643269fb1b5388234b'],
  ['src/components/soccer-career/DrillPlayers.tsx', '2556cfa8ce62cd09b36a99969e9ace515198c6b9'],
  ['scripts/simCareerDrills.mjs', '584f4b6d02219efcb9a745adcba2ba2eb50a91a7'],
]);
const receipts = files => [...files].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes), gitBlob: gitBlob(bytes) }));
const writeJson = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n');
const append = (name, value) => fs.appendFileSync(path.join(out, name), JSON.stringify(value) + '\n');
writeJson('source-before.json', receipts(held));
for (const [file, bytes] of held) {
  const target = path.join(out, 'source', file);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
}
const imported = new Map();
const holds = () => {
  for (const [file, bytes] of [...held, ...imported]) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, 'Source held: ' + file);
};
let primaryError = null;
try {
  for (const [file, blob] of expected) assert.equal(gitBlob(held.get(file)), blob, 'Exact PR450 source: ' + file);
  const entry = [
    'const store = new Map();',
    'globalThis.localStorage = { getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size;},clear:()=>store.clear() };',
    'const mod = await import(' + JSON.stringify(path.join(root, 'src/lib/careerDrills.ts').replaceAll('\\', '/')) + ');',
    'export const laws = mod;',
  ].join('\n');
  const bundleFile = path.join(out, 'actual-laws.mjs');
  const bundled = await build({ absWorkingDir: root, stdin: { contents: entry, resolveDir: root, sourcefile: 'wall-practice-entry.mjs' },
    outfile: bundleFile, bundle: true, write: false, format: 'esm', platform: 'node',
    alias: { '@': path.join(root, 'src') }, metafile: true, logLevel: 'silent' });
  assert.equal(bundled.outputFiles.length, 1);
  const compiled = Buffer.from(bundled.outputFiles[0].contents);
  fs.writeFileSync(bundleFile, compiled); fs.writeFileSync(path.join(out, 'entry.mjs'), entry);
  for (const file of Object.keys(bundled.metafile.inputs)) {
    if (file === 'wall-practice-entry.mjs') continue;
    const absolute = path.resolve(root, file);
    assert(absolute.startsWith(root + path.sep), 'Actual engine input inside checkout');
    const relative = path.relative(root, absolute);
    imported.set(relative, fs.readFileSync(absolute));
  }
  writeJson('engine-inputs.json', { entry, bundle: { bytes: compiled.length, sha256: sha(compiled) }, inputs: receipts(imported), metafile: bundled.metafile });
  const { laws } = await import(pathToFileURL(bundleFile).href);
  const { lehmer, drillSeed, buildWallShotRun, takeWallShot, wallNextPeak, wallTravel, wallOpenAt, ROUNDS_PER_RUN } = laws;
  assert.equal(ROUNDS_PER_RUN, 10);
  const dates = Array.from({ length: 32 }, (_, index) => new Date(Date.UTC(2026, 8, 30 + index)).toISOString().slice(0, 10));
  assert.equal(dates[0], '2026-09-30'); assert.equal(dates.at(-1), '2026-10-31');
  assert.equal(new Set(dates).size, 32);
  const rounds = [];
  for (const date of dates) {
    const seed = drillSeed('wallshot', date), setups = buildWallShotRun(seed), daily = lehmer(seed ^ 0x5eed1234);
    for (const [index, setup] of setups.entries()) {
      const draws = [], input = { x: 0, y: 0.5, power: 0.65, press: 0 }, prior = JSON.stringify(setup);
      const probe = takeWallShot(input, setup, () => { const value = daily(); draws.push(value); return value; });
      const noiseSeed = (((seed ^ Math.imul(index + 1, 0x194311)) >>> 0) % 2147483646) + 1;
      const noiseRng = lehmer(noiseSeed), noise = Array.from({ length: 5 }, () => noiseRng());
      const row = { date, seed, round: index + 1, setup, draws, drawCount: draws.length, drawSha256: sha(JSON.stringify(draws)),
        probe: { input, result: probe }, independentPolicyJitter: { seed: noiseSeed, draws: noise } };
      append('daily-tapes.jsonl', row);
      assert.equal(draws.length, 4, 'Four actual daily draws per round');
      assert.equal(JSON.stringify(setup), prior, 'Tape capture holds setup');
      rounds.push(row);
    }
  }
  assert.equal(rounds.length, 320);
  const firstHint = setup => {
    for (let tick = 18; tick <= 18 + Math.ceil(setup.period * 120); tick++) {
      const press = tick / 60;
      if (wallOpenAt(setup, press + wallTravel(0.65)) >= 0.75) return press;
    }
    throw new Error('No visible good-window sample within two full cycles');
  };
  const instruction = row => ({ x: row.setup.gapCentre, y: 0.85, power: 0.65, press: firstHint(row.setup) });
  const policies = [
    { id: 'existing-gap-aware-policy-independent-jitter', meaning: 'Historical setup-aware policy formula and conditional retry draw order, now separated from engine randomness. Five values are available; actual consumption is recorded as four or five.', input: row => {
      const setup = row.setup; let cursor = 0;
      const rng = () => row.independentPolicyJitter.draws[cursor++];
      const power = 0.62 + (setup.distance - 16) * 0.02 + rng() * 0.06;
      let peak = wallNextPeak(setup, 0.3), press = peak - wallTravel(power) + (rng() - 0.5) * 0.08;
      if (press < 0) { peak = wallNextPeak(setup, peak + 0.1); press = peak - wallTravel(power) + (rng() - 0.5) * 0.08; }
      return { x: setup.gapCentre + (rng() - 0.5) * 0.06, y: 0.8 + rng() * 0.15, power, press, historicalPolicyJitterConsumed: cursor };
    } },
    { id: 'visible-instruction-medium-high', meaning: 'Gap centre, height0.85, power0.65, first hint>=0.75 sampled at60Hz after0.3s. Synthetic visible-information policy.', input: instruction },
    { id: 'default-aim-same-visible-window', meaning: 'Default x0/y0.8 and power0.65, same hint release. Synthetic failure to aim through the gap.', input: row => ({ ...instruction(row), x: 0, y: 0.8 }) },
    { id: 'instruction-timing-plus-minus40ms', meaning: 'Same instruction aim with independent uniform timing error in[-0.040,+0.040]seconds.', input: row => ({ ...instruction(row), press: Math.max(0, firstHint(row.setup) + (row.independentPolicyJitter.draws[1] * 2 - 1) * 0.040) }) },
    { id: 'instruction-timing-plus-minus125ms', meaning: 'Same instruction aim with independent uniform timing error in[-0.125,+0.125]seconds. This is synthetic, not measured user latency.', input: row => ({ ...instruction(row), press: Math.max(0, firstHint(row.setup) + (row.independentPolicyJitter.draws[1] * 2 - 1) * 0.125) }) },
    { id: 'instruction-normalized-aim-error', meaning: 'Independent uniform x/y error in[-0.03,+0.03]goal coordinates. CSS conversion and human thumb precision are unmeasured.', input: row => ({ ...instruction(row), x: row.setup.gapCentre + (row.independentPolicyJitter.draws[2] * 2 - 1) * 0.03, y: 0.85 + (row.independentPolicyJitter.draws[3] * 2 - 1) * 0.03 }) },
    { id: 'instruction125ms-and-normalized-aim-error', meaning: 'The same declared125ms timing and0.03 normalized aim errors together, with shared independent noise values.', input: row => ({ ...instruction(row), x: row.setup.gapCentre + (row.independentPolicyJitter.draws[2] * 2 - 1) * 0.03, y: 0.85 + (row.independentPolicyJitter.draws[3] * 2 - 1) * 0.03, press: Math.max(0, firstHint(row.setup) + (row.independentPolicyJitter.draws[1] * 2 - 1) * 0.125) }) },
  ];
  writeJson('experiment-declaration.json', { source: 'PR450 d230682b593e0c6d4c87ea861bdb8b1ae2758176', dates,
    datesAre: 'Fixed Eastern daily labels. No claim about the unknown original random-practice seed.', policies: policies.map(({ id, meaning }) => ({ id, meaning })),
    hintSampling: 'Declared synthetic60Hz hint reading, not browser timing or reduced-motion measurement.',
    independentPolicyJitter: 'Five pre-recorded values per daily round. Historical policy uses four or five in its original conditional order; error variants use declared indexes1(time),2(x),3(y). These never consume the four engine draws.',
    pixelPrecision: 'No actual board geometry was measured. Aim error is normalized goal-coordinate error only. No CSS-pixel or physical-phone accuracy claim.',
    thresholds: 'No new balance threshold or coefficient adoption. Only data-integrity checks and the separate unchanged historical law checks.',
    reportDateGrid: 'The existing simCareerDrills finite wall-shot input grid, replaying each report-day round exact daily tape. A finite grid witness, not a continuous optimum.' });
  const verdicts = new Map([
    ['Into the wall. It was shut.', 'wall'], ['Into the wall. Off the gap.', 'wall'],
    ['Through the gap, off the post.', 'post'], ['Never had the legs.', 'weak'],
    ['Through the gap and wide of everything.', 'off-target'], ['Through the gap. Keeper got there.', 'keeper-save'],
    ['Through the wall and in.', 'goal'],
  ]);
  const observed = [];
  function evaluate(row, input, name, retainPath = true, historicalPolicyJitterConsumed = null) {
    const setupBefore = JSON.stringify(row.setup), inputBefore = JSON.stringify(input), tapeBefore = JSON.stringify(row.draws);
    let consumed = 0;
    const result = takeWallShot(input, row.setup, () => {
      assert(consumed < row.draws.length, 'No extra engine draw');
      return row.draws[consumed++];
    });
    const bucket = verdicts.get(result.verdict), record = { policy: name, historicalPolicyJitterConsumed, date: row.date, seed: row.seed, round: row.round,
      setupId: row.date + ':' + row.round, drawSha256: row.drawSha256, drawCount: consumed, input,
      result: retainPath ? result : Object.fromEntries(Object.entries(result).filter(([key]) => key !== 'path')), bucket: bucket ?? null };
    append(retainPath ? 'policy-outcomes.jsonl' : 'report-date-grid.jsonl', record);
    assert.equal(consumed, 4); assert.equal(JSON.stringify(row.setup), setupBefore); assert.equal(JSON.stringify(input), inputBefore);
    assert.equal(JSON.stringify(row.draws), tapeBefore); assert(verdicts.has(result.verdict), 'Known mutually exclusive actual verdict');
    assert.equal(result.saved, bucket === 'keeper-save'); assert.equal(result.won, bucket === 'goal');
    assert.equal(result.onTarget, result.saved || result.won);
    assert(input.x >= -1.15 && input.x <= 1.15 && input.y >= 0 && input.y <= 1.1 && input.power >= 0.3 && input.power <= 1 && input.press >= 0, 'Legal declared input');
    return record;
  }
  for (const policy of policies) for (const row of rounds) {
    const { historicalPolicyJitterConsumed = null, ...input } = policy.input(row);
    const record = evaluate(row, input, policy.id, true, historicalPolicyJitterConsumed);
    if (policy.id === 'existing-gap-aware-policy-independent-jitter') assert([4, 5].includes(historicalPolicyJitterConsumed), 'Actual historical policy consumes four or five independent jitter values');
    observed.push(record);
  }
  const buckets = ['wall', 'post', 'weak', 'off-target', 'keeper-save', 'goal'];
  function summarize(rows) {
    const counts = Object.fromEntries(buckets.map(key => [key, rows.filter(row => row.bucket === key).length]));
    const byDay = dates.map(date => ({ date, goals: rows.filter(row => row.date === date && row.result.won).length }));
    const onTarget = rows.filter(row => row.result.onTarget).length, saved = rows.filter(row => row.result.saved).length;
    return { attempts: rows.length, verdicts: counts, onTarget, keeperSaved: saved, keeperSaveGivenOnTarget: onTarget ? saved / onTarget : null,
      goals: counts.goal, goalRate: rows.length ? counts.goal / rows.length : null, byDay,
      dailyGoalHistogram: Array.from({ length: 11 }, (_, count) => ({ goals: count, days: byDay.filter(row => row.goals === count).length })),
      daysAtLeastFiveGoals: byDay.filter(row => row.goals >= 5).length, daysAtLeastEightGoals: byDay.filter(row => row.goals >= 8).length };
  }
  const summaries = policies.map(policy => ({ policy: policy.id, ...summarize(observed.filter(row => row.policy === policy.id)) }));
  writeJson('policy-measurements.json', summaries);
  const reference = observed.filter(row => row.policy === 'visible-instruction-medium-high');
  const paired = policies.filter(policy => policy.id !== 'visible-instruction-medium-high').map(policy => {
    const rows = observed.filter(row => row.policy === policy.id);
    const changes = rows.map((row, index) => ({ date: row.date, round: row.round, drawSha256: row.drawSha256,
      reference: reference[index].bucket, alternative: row.bucket, goalDelta: Number(row.result.won) - Number(reference[index].result.won) }));
    assert(changes.every((row, index) => row.drawSha256 === reference[index].drawSha256));
    return { policy: policy.id, changedVerdicts: changes.filter(row => row.reference !== row.alternative).length,
      netGoals: changes.reduce((sum, row) => sum + row.goalDelta, 0), changes };
  });
  writeJson('paired-outcomes.json', paired);
  const grid = [];
  for (const row of rounds.filter(row => row.date === '2026-10-31')) {
    const inputs = [];
    for (let xi = -9; xi <= 9; xi += 2) for (let yi = 1; yi <= 9; yi += 2) for (const power of [0.5, 0.75, 1]) for (let p = 0; p <= 2.4; p += 0.2) inputs.push({ x: xi / 10, y: yi / 10, power, press: p });
    for (let xi = -8; xi <= 8; xi += 1) for (let yi = 4; yi <= 19; yi += 1) for (let pi = 8; pi <= 20; pi += 1) {
      const power = pi / 20, peak = wallNextPeak(row.setup, wallTravel(power));
      inputs.push({ x: row.setup.gapCentre + xi / 40, y: yi / 20, power, press: peak - wallTravel(power) });
    }
    const records = inputs.map(input => evaluate(row, input, 'existing-report-date-finite-grid', false));
    const wins = records.filter(record => record.result.won);
    grid.push({ date: row.date, round: row.round, drawSha256: row.drawSha256, inputs: records.length, scoringInputs: wins.length,
      witnessedMake: wins[0] ?? null, witnessedMiss: records.find(record => !record.result.won) ?? null });
  }
  writeJson('report-date-grid-summary.json', { definitionSource: 'scripts/simCareerDrills.mjs wallshot.sweep at pinned blob584f4b6d',
    scope: 'Finite input grid only. Zero makes would be a measured finding, not proof about all continuous inputs.', rounds: grid });
  holds();
  const simSource = held.get('scripts/simCareerDrills.mjs').toString('utf8').replaceAll('\r\n', '\n');
  const simEdits = [];
  let sim = simSource;
  function seam(before, after) {
    assert.equal(sim.split(before).length - 1, 1, 'Unique executed diagnostic seam');
    const offset = sim.indexOf(before); sim = sim.slice(0, offset) + after + sim.slice(offset + before.length);
    simEdits.push({ offset, before, after });
  }
  seam("const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');", 'const ROOT = ' + JSON.stringify(root) + ';');
  const relocation = sim.split('\n').filter(line => line.trim().startsWith('.replace("from \'./soccerCareerEngine\'",'));
  assert.equal(relocation.length, 1); assert(relocation[0].endsWith(';'));
  seam(relocation[0], relocation[0].slice(0, -1) + '\n    .replace("from \'./season/momentsSave\'", "from \'" + ROOT_URL + "/src/lib/season/momentsSave\'");');
  const tail = 'if (CONTROL) {\n  const missingSections = CONTROLS[CONTROL].sections.filter(section => !failuresBySection.has(section));';
  seam(tail, "fs.writeFileSync(process.env.WALL_PRACTICE_LAW_RECEIPT, JSON.stringify({ control: CONTROL, failures, failuresBySection: [...failuresBySection], skilledCounts }, null, 2) + '\\n');\n" + tail);
  let simInverse = sim;
  for (const { offset, before, after } of simEdits.slice().reverse()) {
    assert.equal(simInverse.slice(offset, offset + after.length), after);
    simInverse = simInverse.slice(0, offset) + before + simInverse.slice(offset + after.length);
  }
  assert.equal(simInverse, simSource); assert.notEqual(sim, simSource);
  const diagnostic = path.join(out, 'simCareerDrills.location-diagnostic.mjs');
  fs.writeFileSync(diagnostic, sim);
  writeJson('existing-laws-diagnostic.json', { sourceGitBlob: expected.get('scripts/simCareerDrills.mjs'), sourceSha256: sha(simSource),
    diagnosticSha256: sha(sim), edits: simEdits, inverseSha256: sha(simInverse),
    scope: 'Only ROOT location, existing copied-module momentsSave relative import relocation, and raw failure-section receipt. All existing laws, policies, floors, controls and exit semantics held.' });
  const lawsRuns = [];
  for (const name of ['current', 'sighted', 'alwaysopen', 'restored']) {
    const folder = path.join(out, 'existing-laws', name); fs.mkdirSync(folder, { recursive: true });
    const transport = path.join(folder, 'transport.log'), receipt = path.join(folder, 'law-results.json');
    fs.writeFileSync(transport, '');
    const env = { ...process.env, NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'), SIM_NETWORK: 'offline',
      SIM_OFFLINE_RECEIPT: transport, TMPDIR: folder, TEMP: folder, TMP: folder, WALL_PRACTICE_LAW_RECEIPT: receipt, FORCE_COLOR: '0', NO_COLOR: '1' };
    delete env.SIM_CAREER_DRILLS_CONTROL;
    if (name === 'sighted' || name === 'alwaysopen') env.SIM_CAREER_DRILLS_CONTROL = name;
    fs.writeFileSync(path.join(folder, 'argv.json'), JSON.stringify({ executable: process.execPath, args: [diagnostic], control: env.SIM_CAREER_DRILLS_CONTROL ?? null }, null, 2));
    const child = spawnSync(process.execPath, [diagnostic], { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(path.join(folder, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(folder, 'stderr.log'), child.stderr || '');
    writeJson('existing-laws-' + name + '-process.json', { status: child.status, signal: child.signal, error: child.error ? { name: child.error.name, message: child.error.message } : null });
    const raw = (child.stdout || '') + '\n' + (child.stderr || '');
    const lawReceipt = fs.existsSync(receipt) ? JSON.parse(fs.readFileSync(receipt, 'utf8')) : null;
    writeJson('existing-laws-' + name + '-observed.json', { process: { status: child.status, signal: child.signal }, receipt: lawReceipt, transportBytes: fs.statSync(transport).size });
    assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0);
    assert(lawReceipt, 'Existing law receipt was reached after all six sections');
    assert.equal(fs.statSync(transport).size, 0);
    assert(!/(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Failed to resolve|Cannot find (?:module|package)|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK)/i.test(raw), 'No setup/import/runtime failure credited');
    const controlled = name === 'sighted' || name === 'alwaysopen';
    if (controlled) {
      const sections = name === 'sighted' ? [2, 4, 6] : [5];
      assert.equal(lawReceipt.control, name); assert(lawReceipt.failures > 0);
      for (const section of sections) assert(lawReceipt.failuresBySection.some(([number, count]) => number === section && count > 0), 'Owned existing law section fired');
      assert(raw.includes('control "' + name + '":') && raw.includes('the check works'));
      const actualCopy = fs.readFileSync(path.join(folder, 'careerDrills.control.ts'), 'utf8');
      const before = name === 'sighted' ? 'export const WALL_UNSIGHTED = 0.45;' : '  return Math.max(0, Math.sin(2 * Math.PI * (t / setup.period + setup.phase)));';
      const after = name === 'sighted' ? 'export const WALL_UNSIGHTED = 1;' : '  return 1;';
      const original = held.get('src/lib/careerDrills.ts').toString('utf8').replaceAll('\r\n', '\n');
      assert.equal(original.split(before).length - 1, 1);
      let changed = original.replace(before, after);
      for (const file of ['arcade', 'freeKick', 'soccerCareerEngine', 'season/momentsSave']) changed = changed.replace("from './" + file + "'", "from '" + root.replaceAll('\\', '/') + '/src/lib/' + file + "'");
      assert.equal(actualCopy, changed); assert.notEqual(actualCopy, original);
      let inverse = actualCopy;
      for (const file of ['arcade', 'freeKick', 'soccerCareerEngine', 'season/momentsSave']) inverse = inverse.replace("from '" + root.replaceAll('\\', '/') + '/src/lib/' + file + "'", "from './" + file + "'");
      const lawOffset = original.indexOf(before);
      assert.equal(inverse.slice(lawOffset, lawOffset + after.length), after);
      inverse = inverse.slice(0, lawOffset) + before + inverse.slice(lawOffset + after.length);
      assert.equal(inverse, original);
      fs.writeFileSync(path.join(folder, 'control-inverse.json'), JSON.stringify({ before, after, originalSha256: sha(original), changedSha256: sha(actualCopy), inverseSha256: sha(inverse), actualExistingLawSections: sections }, null, 2));
    } else {
      assert.equal(lawReceipt.control, ''); assert.equal(lawReceipt.failures, 0); assert.deepEqual(lawReceipt.failuresBySection, []);
      assert(raw.includes('simCareerDrills: green.'));
    }
    holds();
    lawsRuns.push({ name, rawExit: child.status, existingInternalFailures: lawReceipt.failures, failuresBySection: lawReceipt.failuresBySection,
      transportBytes: fs.statSync(transport).size, runtimeCounters: null, runtimeCounterCompleteness: 'UNKNOWN', detectedRuntimeError: false });
  }
  let restored = 0;
  for (const row of observed) {
    const tape = rounds.find(value => value.date === row.date && value.round === row.round);
    let cursor = 0;
    const result = takeWallShot(row.input, tape.setup, () => tape.draws[cursor++]);
    append('restored-policy-replay.jsonl', { policy: row.policy, date: row.date, round: row.round, drawSha256: tape.drawSha256,
      drawCount: cursor, originalResultSha256: sha(JSON.stringify(row.result)), restoredResultSha256: sha(JSON.stringify(result)) });
    assert.equal(cursor, 4); assert.deepEqual(result, row.result); restored++;
  }
  holds();
  assert.equal(observed.length, 2240); assert.equal(restored, 2240); assert.equal(grid.length, 10);
  writeJson('summary.json', { status: 'MEASURED, no balance decision or product adoption', source: 'd230682b593e0c6d4c87ea861bdb8b1ae2758176',
    dailyDates: dates.length, dailyRounds: rounds.length, engineDrawsPerRound: 4, dailyDraws: rounds.length * 4, policies: summaries,
    policyEvaluations: observed.length, restoredExactReplays: restored, reportDate: '2026-10-31', reportDateGrid: grid, existingLaws: lawsRuns,
    scope: 'Fixed daily engine cohort and synthetic policies only. No original user/practice seed, native phone precision, human balance, full career route or PR379 finite-wall integration claim.',
    pixelConversion: 'UNMEASURED. Aim error is normalized only.', balanceThresholdsAdopted: false, coefficientsChanged: false });
  console.log('WALL_PRACTICE_MEASURED:32 dates,320 daily rounds,1280 held draws,7 policies,2240 outcomes and exact restored replays;10 finite-grid witnesses;4 existing law runs with2 effective internal-failure controls.');
  console.log('Evidence: ' + out);
} catch (error) {
  primaryError = error;
  writeJson('failure.json', { name: error.name, message: error.message, stack: error.stack });
  throw error;
} finally {
  try {
    writeJson('source-after.json', receipts(new Map([...held.keys()].map(file => [file, fs.readFileSync(path.join(root, file))]))));
    writeJson('engine-inputs-after.json', receipts(new Map([...imported.keys()].map(file => [file, fs.readFileSync(path.join(root, file))]))));
    holds();
  } catch (holdError) {
    writeJson('hold-failure.json', { name: holdError.name, message: holdError.message, stack: holdError.stack });
    if (!primaryError) throw holdError;
  }
}
