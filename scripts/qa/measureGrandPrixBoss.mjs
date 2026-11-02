import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Measurement only. Numerical acceptance margins must follow actual captured headroom.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePaths = ['src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts', 'package.json', 'package-lock.json'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const held = new Map(sourcePaths.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const base = process.env.GP_BOSS_MEASURE_OUT || os.tmpdir();
fs.mkdirSync(base, { recursive: true });
const OUT = fs.mkdtempSync(path.join(base, 'dukb-grand-prix-measure-'));
const bundled = await build({ entryPoints: [path.join(ROOT, 'src/lib/grandPrixBoss.ts')], outfile: path.join(OUT, 'engine.mjs'), bundle: true, platform: 'node', format: 'esm', sourcemap: 'external', metafile: true, alias: { '@': path.join(ROOT, 'src') } });
fs.writeFileSync(path.join(OUT, 'bundle-inputs.json'), JSON.stringify(bundled.metafile, null, 2) + '\n');
const engine = await import(pathToFileURL(path.join(OUT, 'engine.mjs')).href);
const clone = value => JSON.parse(JSON.stringify(value));
let admittedStates = 0;
function admit(state, label) {
  const read = engine.validateSavedCareer(state);
  if (!read.ok) throw new Error('Measurement state refused: ' + label + ':' + JSON.stringify(read));
  admittedStates += 1;
  return read.state;
}
const myDrivers = state => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
function step(state, action) {
  state = admit(state, 'before ' + action.type);
  const next = engine.applyAction(state, { ...action, expectedRevision: state.revision });
  if (!next.ok) throw new Error('Measurement action refused: ' + JSON.stringify({ action, next }));
  return admit(next.state, 'after ' + action.type);
}
function start(seed, { weather = 'dry', compound = 'medium', powerWeight = 0.8, power = 0, aero = 0, lab = true, reliablePlayer = true, unsuitable = false } = {}) {
  let career = engine.createCareer(seed);
  if (lab) {
    // Synthetic physics lab. Rich cash and AI-only reliability do not change the user's quotes.
    career.cash = 1_000_000_000;
    for (const team of career.teams) if (team.id !== career.teamId) team.car.reliability = 100;
    career.calendar[0].powerWeight = powerWeight;
    career.calendar[0].aeroWeight = 1 - powerWeight;
    career.calendar[0].rainChance = weather === 'wet' ? 1 : 0;
  }
  career = admit(career, 'initial generated or synthetic lab');
  const ownCar = () => career.teams.find(team => team.id === career.teamId).car;
  if (lab && reliablePlayer) while (ownCar().reliability < 100) career = step(career, { type: 'upgrade', area: 'reliability' });
  const targets = { power: ownCar().power + power, aero: ownCar().aero + aero };
  for (const area of ['power', 'aero']) while (ownCar()[area] < targets[area]) career = step(career, { type: 'upgrade', area });
  const grid = step(career, { type: 'qualify' });
  return step(grid, { type: 'startRace', setups: myDrivers(grid).map(driver => ({ driverId: driver.id, pace: 'balanced', compound: unsuitable ? 'soft' : lab ? compound : grid.race.weather === 'wet' ? 'wet' : 'medium' })) });
}
function advance(state, pace = 'balanced', pitTo) {
  return step(state, { type: 'raceInterval', orders: myDrivers(state).map(driver => ({ driverId: driver.id, pace, ...(pitTo ? { pitTo } : {}) })) });
}
function snapshot(state) {
  const ids = new Set(myDrivers(state).map(driver => driver.id));
  const entries = state.race.entries.filter(entry => ids.has(entry.driverId));
  return {
    entries: entries.map(entry => ({ driverId: entry.driverId, elapsedMs: entry.elapsedMs, completedLaps: entry.completedLaps, tyreWear: entry.tyreWear, stops: entry.stops, status: entry.status })),
    totalMs: entries.reduce((sum, entry) => sum + entry.elapsedMs, 0),
    meanWear: entries.reduce((sum, entry) => sum + entry.tyreWear, 0) / entries.length,
    retired: entries.filter(entry => entry.status === 'retired').length,
    points: state.results[0]?.classification.filter(entry => entry.teamId === state.teamId).reduce((sum, entry) => sum + entry.points, 0) ?? null,
    classification: state.results[0]?.classification ?? null,
  };
}
function runRace(state, pace) { while (state.phase === 'race') state = advance(state, pace); return state; }
function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const quantile = p => sorted[Math.floor((sorted.length - 1) * p)];
  return { n: values.length, mean: values.reduce((sum, value) => sum + value, 0) / values.length, p10: quantile(0.1), p50: quantile(0.5), p90: quantile(0.9) };
}
const physics = [], risk = [], natural = [];
try {
  for (let seed = 1; seed <= 128; seed += 1) {
    const baseFast = snapshot(advance(start(seed, { powerWeight: 0.8 })));
    const powerFast = snapshot(advance(start(seed, { powerWeight: 0.8, power: 10 })));
    const aeroFast = snapshot(advance(start(seed, { powerWeight: 0.8, aero: 10 })));
    const baseTurns = snapshot(advance(start(seed, { powerWeight: 0.2 })));
    const powerTurns = snapshot(advance(start(seed, { powerWeight: 0.2, power: 10 })));
    const aeroTurns = snapshot(advance(start(seed, { powerWeight: 0.2, aero: 10 })));
    const wet = snapshot(advance(start(seed, { weather: 'wet', compound: 'wet' })));
    const wrongWet = snapshot(advance(start(seed, { weather: 'wet', compound: 'medium' })));
    const push = snapshot(advance(start(seed), 'push'));
    const conserve = snapshot(advance(start(seed), 'conserve'));
    const wornState = advance(start(seed));
    const mine = new Set(myDrivers(wornState).map(driver => driver.id));
    for (const entry of wornState.race.entries) if (mine.has(entry.driverId)) entry.tyreWear = 80;
    const stay = snapshot(advance(clone(wornState)));
    const pit = snapshot(advance(clone(wornState), 'balanced', 'medium'));
    physics.push({ seed, baseFast, powerFast, aeroFast, baseTurns, powerTurns, aeroTurns, wet, wrongWet, push, conserve, stay, pit });
  }
  for (let seed = 1; seed <= 1_024; seed += 1) {
    const initial = start(seed, { reliablePlayer: false });
    const reliability = initial.teams.find(team => team.id === initial.teamId).car.reliability;
    const push = snapshot(runRace(clone(initial), 'push'));
    const conserve = snapshot(runRace(clone(initial), 'conserve'));
    risk.push({ seed, reliability, push, conserve });
  }
  for (let seed = 1; seed <= 128; seed += 1) {
    let aware = start(seed, { lab: false });
    let bad = start(seed, { lab: false, unsuitable: true });
    while (aware.phase === 'race') {
      const orders = myDrivers(aware).map(driver => {
        const entry = aware.race.entries.find(row => row.driverId === driver.id);
        let pitTo;
        if (aware.race.lap > 0 && entry.status === 'running') {
          if (aware.race.weather === 'wet' && entry.compound !== 'wet') pitTo = 'wet';
          else if (aware.race.weather === 'dry' && entry.compound === 'wet') pitTo = 'medium';
          else if (entry.tyreWear > 58) pitTo = aware.race.weather === 'wet' ? 'wet' : 'hard';
        }
        return { driverId: driver.id, pace: 'balanced', ...(pitTo ? { pitTo } : {}) };
      });
      aware = step(aware, { type: 'raceInterval', orders });
    }
    bad = runRace(bad, 'push');
    natural.push({ seed, aware: snapshot(aware), unsuitable: snapshot(bad) });
  }
  const summary = {
    version: 1, purpose: 'measurement only, no balance thresholds asserted', source: Object.fromEntries(held),
    settings: { physicsSeeds: 128, riskSeeds: 1024, naturalSeeds: 128, labReliability: 100, riskReliability: 'original player car held per pair', admittedStates },
    physics: {
      fastTrackPowerGainMs: stats(physics.map(row => row.baseFast.totalMs - row.powerFast.totalMs)),
      fastTrackAeroGainMs: stats(physics.map(row => row.baseFast.totalMs - row.aeroFast.totalMs)),
      technicalPowerGainMs: stats(physics.map(row => row.baseTurns.totalMs - row.powerTurns.totalMs)),
      technicalAeroGainMs: stats(physics.map(row => row.baseTurns.totalMs - row.aeroTurns.totalMs)),
      wetTyreGainMs: stats(physics.map(row => row.wrongWet.totalMs - row.wet.totalMs)),
      pushPaceGainMs: stats(physics.map(row => row.conserve.totalMs - row.push.totalMs)),
      pushExtraWear: stats(physics.map(row => row.push.meanWear - row.conserve.meanWear)),
      pitWornTyreGainMs: stats(physics.map(row => row.stay.totalMs - row.pit.totalMs)),
    },
    risk: { pushRetirements: risk.reduce((sum, row) => sum + row.push.retired, 0), conserveRetirements: risk.reduce((sum, row) => sum + row.conserve.retired, 0), pairedExtra: stats(risk.map(row => row.push.retired - row.conserve.retired)) },
    natural: { awarePoints: stats(natural.map(row => row.aware.points)), unsuitablePoints: stats(natural.map(row => row.unsuitable.points)), pointGain: stats(natural.map(row => row.aware.points - row.unsuitable.points)), awareRetirements: natural.reduce((sum, row) => sum + row.aware.retired, 0), unsuitableRetirements: natural.reduce((sum, row) => sum + row.unsuitable.retired, 0) },
  };
  fs.writeFileSync(path.join(OUT, 'all-pairs.json'), JSON.stringify({ physics, risk, natural }) + '\n');
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  console.log('GrandPrixBoss measurement complete: actual paired physics, risk and natural strategy outputs; numerical readiness margins remain unasserted.');
} finally {
  for (const [file, hash] of held) if (sha(fs.readFileSync(path.join(ROOT, file))) !== hash) throw new Error('Measurement source/package hold failed: ' + file);
  console.log('Grand Prix Boss measurement evidence: ' + OUT);
}
