/* Actual physical court outcomes with retained effective copied faults. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(self), '..');
const source = 'src/lib/courtLife.ts', testFile = 'src/test/courtLifeEngine.test.ts';
const independent = 'replays neutralized saved movement with identical RNG and immutable inputs';
const controls = {
  early: { from: 'player.stats.attempts++;', to: 'match.score[player.side] += 2; player.stats.attempts++;', test: 'scores only actual downward hoop crossings once per released flight' },
  duplicate: { from: '&& ball.scoredFlightId !== ball.flightId', to: '&& true', test: 'scores only actual downward hoop crossings once per released flight' },
  upward: { from: 'previous.z > COURT_RIM_HEIGHT && ball.z <= COURT_RIM_HEIGHT && ball.vz < 0', to: 'previous.z < COURT_RIM_HEIGHT && ball.z >= COURT_RIM_HEIGHT && ball.vz > 0', test: 'keeps rising shots and passes through the hoop plane scoreless' },
  meter: { from: 'distance(player, courtBasket(player.side)) < 3 ? player.attrs.finishing :', to: 'distance(player, courtBasket(player.side)) < 3 ? player.attrs.shooting :', test: 'shows the same finishing and shooting window used by the physical release' },
  block: { from: 'match.players.filter(player => player.side !== ball.shotSide)', to: 'match.players.filter(player => player.side === ball.shotSide)', test: 'blocks the physical flight at a reachable defending hand' },
  steal: { from: 'loser.stats.turnovers++; stealer.stats.steals++;', to: 'loser.stats.turnovers++;', test: 'resolves an intercepted moving pass as one steal and one turnover' },
  outlet: { from: 'const canMoveBall = !receivedRecently && match.shotClockTicks > 45;', to: 'const canMoveBall = false;', test: 'uses an open forward outlet and physically completes the AI pass' },
  rebound: { from: 'player.stats.rebounds++;', to: 'void player.stats.rebounds;', test: 'turns a missed physical shot into a collected live rebound' },
  assist: { from: 'if (assist) assist.stats.assists++;', to: 'void assist;', test: 'credits an assist only after the received pass becomes an actual basket' },
  clock: { from: "next.shotClockTicks === 0 && next.ball.mode !== 'shot'", to: "next.shotClockTicks === -1 && next.ball.mode !== 'shot'", test: 'changes possession for the clock and actual out of bounds' },
  overtime: { from: 'match.score.home === match.score.away && match.period < 4', to: 'match.score.home === match.score.away && match.period < 5', test: 'ends two halves and at most two overtimes with an explicit tied draw' },
  buzzer: { from: "next.remainingTicks === 0 && next.ball.mode !== 'shot'", to: 'next.remainingTicks === 0', test: 'keeps a released buzzer shot live until its physical outcome' },
  condition: { from: '(.76 + player.stamina * .0024)', to: '1', test: 'makes condition change actual stamina and movement while keeping a playable floor' },
  ai: { from: "if (player.chargeTicks > 0) input.shoot = player.chargeTicks >= 13 ? 'release' : 'none';", to: "if (player.chargeTicks > 0) input.shoot = 'none';", test: 'finishes genuine six AI games with reconciled shots points and active players' },
};
const control = process.env.COURT_LIFE_ENGINE_CONTROL || '';
assert(!control || control === 'all' || control in controls);
const evidence = path.resolve(process.env.COURT_LIFE_ENGINE_ARTIFACTS || path.join(root, 'court-life-artifacts/engine'));
await mkdir(evidence, { recursive: true });
if (process.env.COURT_LIFE_ENGINE_MEASURE === '1') {
  const heldMeasurementInputs = [source, testFile, 'scripts/simCourtLifeEngine.mjs'];
  const measurementHashes = async () => Object.fromEntries(await Promise.all(heldMeasurementInputs.map(async file => [file, createHash('sha256').update(await readFile(path.join(root, file))).digest('hex')])));
  const sourceBefore = await measurementHashes();
  const { build } = await import('esbuild');
  const bundled = await build({ entryPoints: [path.join(root, source)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
  const engine = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
  const spec = id => ({ id, name: id, condition: 100, attrs: { finishing: 65, shooting: 65, passing: 65, defense: 65, conditioning: 65 } });
  const config = seed => ({ id: `measure-${seed}`, seed, home: { id: 'home', name: 'Harbor', chemistry: 50, players: ['h0', 'h1', 'h2'].map(spec) },
    away: { id: 'away', name: 'Foundry', chemistry: 50, players: ['a0', 'a1', 'a2'].map(spec) }, controlledPlayerId: null });
  const armNames = ['baseline', 'weakShooting', 'weakDefense', 'tired', 'idle'];
  const arms = Object.fromEntries(armNames.map(name => [name, []]));
  for (let index = 0; index < 24; index++) for (const arm of armNames) {
    const cfg = config((index + 1) * 104729 + 71);
    for (const player of cfg.home.players) {
      if (arm === 'weakShooting') { player.attrs.shooting = 35; player.attrs.finishing = 35; }
      if (arm === 'weakDefense') player.attrs.defense = 20;
      if (arm === 'tired') player.condition = 15;
    }
    if (arm === 'idle') cfg.controlledPlayerId = 'h0';
    let match = engine.createCourtMatch(cfg), ticks = { home: 0, away: 0 };
    for (let tick = 0; tick < 30000 && match.phase !== 'finished'; tick++) {
      if (match.phase === 'playing') ticks[match.possession]++;
      match = match.phase === 'halftime' ? engine.continueCourtPeriod(match) : engine.stepCourtMatch(match);
    }
    assert.equal(match.phase, 'finished');
    const stats = side => Object.fromEntries(Object.keys(match.players[0].stats).map(key => [key, match.players.filter(player => player.side === side).reduce((sum, player) => sum + player.stats[key], 0)]));
    for (const side of ['home', 'away']) assert.equal(match.score[side], match.events.filter(event => event.kind === 'basket' && event.side === side).reduce((sum, event) => sum + event.points, 0));
    arms[arm].push({ seed: cfg.seed, tick: match.tick, period: match.period, winner: match.result.winner, score: match.score, possessionTicks: ticks,
      home: stats('home'), away: stats('away'), passes: match.events.filter(event => event.kind === 'pass').length });
  }
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const summaries = Object.fromEntries(armNames.map(arm => [arm, { games: arms[arm].length,
    homePoints: mean(arms[arm].map(row => row.score.home)), awayPoints: mean(arms[arm].map(row => row.score.away)),
    homeAttempts: mean(arms[arm].map(row => row.home.attempts)), awayAttempts: mean(arms[arm].map(row => row.away.attempts)),
    homeTurnovers: mean(arms[arm].map(row => row.home.turnovers)), awayTurnovers: mean(arms[arm].map(row => row.away.turnovers)),
    homeRebounds: mean(arms[arm].map(row => row.home.rebounds)), passes: mean(arms[arm].map(row => row.passes)),
    homePossessionShare: mean(arms[arm].map(row => row.possessionTicks.home / (row.possessionTicks.home + row.possessionTicks.away))),
    draws: arms[arm].filter(row => row.winner === 'draw').length } ]));
  const shotProbes = [];
  for (const rating of [35, 85]) for (const scenario of [
    { name: 'open-midrange', length: 4.4, charge: 13, guarded: false },
    { name: 'legal-jump-contest', length: 4.4, charge: 13, guarded: true },
    { name: 'open-long-range', length: 8, charge: 13, guarded: false },
    { name: 'late-midrange', length: 4.4, charge: 23, guarded: false },
  ]) {
    let made = 0, blocked = 0;
    for (let index = 0; index < 256; index++) {
      const cfg = config((index + 1) * 104729 + 71); cfg.controlledPlayerId = 'h0'; cfg.role = { inboundPriority: 1, callPriority: 1 };
      cfg.home.players[0].attrs.shooting = rating; cfg.home.players[0].attrs.finishing = rating;
      let match = engine.createCourtMatch(cfg);
      for (let tick = 0; tick < 18; tick++) match = engine.stepCourtMatch(match);
      match.players.forEach((player, index) => { player.x = 2 + index * 2; player.y = 18; });
      match.players[0].x = 8; match.players[0].y = 1.6 + scenario.length; match.players[0].chargeTicks = scenario.charge;
      if (scenario.guarded) Object.assign(match.players[3], { x: 8, y: 5, z: .7, vz: 1.6, cooldown: 18 });
      match = engine.stepCourtMatch(match, { ...engine.neutralCourtInput(), shoot: 'release' });
      for (let tick = 0; tick < 150 && match.ball.mode === 'shot'; tick++) match = engine.stepCourtMatch(match);
      assert.notEqual(match.ball.mode, 'shot');
      made += match.players[0].stats.made; blocked += match.events.filter(event => event.kind === 'block').length;
    }
    shotProbes.push({ rating, ...scenario, attempts: 256, made, blocked, rate: made / 256 });
  }
  const sourceAfter = await measurementHashes(); assert.deepEqual(sourceAfter, sourceBefore);
  await writeFile(path.join(evidence, 'measurements.json'), JSON.stringify({ sourceBefore, sourceAfter, arms, summaries, shotProbes }, null, 2));
  console.log(JSON.stringify({ summaries, shotProbes }, null, 2));
  console.log('simCourtLifeEngine measurements: 120 full physical games and 2048 actual released shots retained. These are measurements, not uncalibrated balance acceptance.');
  process.exit(0);
}
if (control === 'all') {
  const results = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, COURT_LIFE_ENGINE_CONTROL: name, COURT_LIFE_ENGINE_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 180000, maxBuffer: 24 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} Court Life engine ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCourtLifeEngine')).join('\n') + '\n' : output.slice(-18000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(result => result.passed), 'All normal and mutation outcomes were attempted and passed');
  console.log('simCourtLifeEngine all: fourteen actual physical outcomes and fourteen effective copied faults pass.');
  process.exit(0);
}
const hash = value => createHash('sha256').update(value).digest('hex');
const held = [source, testFile, 'scripts/simCourtLifeEngine.mjs'];
const hashes = async () => Object.fromEntries(await Promise.all(held.map(async file => [file, hash(await readFile(path.join(root, file)))])));
const before = await hashes();
let folder, copy;
try {
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP; delete env.NO_COLOR;
  if (control) {
    const spec = controls[control], original = (await readFile(path.join(root, source), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(original.split(spec.from).length - 1, 1, 'Mutation matches one executable anchor');
    const changed = original.replace(spec.from, spec.to); assert.notEqual(changed, original);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/court-life-engine-')); copy = path.join(folder, 'courtLife.ts');
    await writeFile(copy, changed); await writeFile(path.join(evidence, `${control}-courtLife.ts.txt`), changed);
    await writeFile(path.join(evidence, `${control}-mutation.json`), JSON.stringify({ control, source, ...spec, anchorCount: 1, originalSha256: hash(original), changedSha256: hash(changed) }, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/courtLife': copy });
  }
  const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', `${controls[control].test}|${independent}`);
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 24 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output);
  assert(!run.error && !run.signal, 'Runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 14); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 12);
    const failure = rows.find(row => row.title === controls[control].test); assert.equal(failure?.status, 'failed');
    assert.match(failure.failureMessages.join('\n'), /AssertionError:|Error: expect\(/);
    assert.equal(rows.find(row => row.title === independent)?.status, 'passed');
    console.log(`simCourtLifeEngine ${control}: effective changed source fails its mapped outcome; replay baseline passes; twelve intentionally skipped.`);
  } else { assert.equal(run.status, 0); assert.equal(report.numPassedTests, 14); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0); }
} finally {
  if (copy) await rm(copy, { force: true }); if (folder) await rmdir(folder);
  const after = await hashes(); await writeFile(path.join(evidence, `${control || 'normal'}-integrity.json`), JSON.stringify({ before, after, held: JSON.stringify(before) === JSON.stringify(after) }, null, 2));
  assert.deepEqual(after, before);
}
console.log('simCourtLifeEngine: actual outcome report and three held source hashes retained.');
