import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

let source = await readFile(new URL('../src/lib/stadiumGateControl.ts', import.meta.url), 'utf8');
if (process.env.SIM_GATE_CONTROL) {
  assert.equal(process.env.SIM_GATE_CONTROL, 'sign');
  const anchor = 'lanes[neighbor(gate, call)] += diverted';
  assert.equal(source.split(anchor).length, 2);
  source = source.replace(anchor, 'lanes[gate] += diverted');
  console.log('Negative control sends the diverted fans back to the same gate.');
}
const js = await transform(source, { loader: 'ts', format: 'esm' });
const { arrivals, gateFixtures, gateForecast, gateStep, openGates, readGateRun } =
  await import('data:text/javascript;base64,' + Buffer.from(js.code).toString('base64'));
const total = xs => xs.reduce((a, b) => a + b, 0);
const start = openGates();
const scan = { gate: 0, call: 'scan', late: false };
const forecast = (gate, call) => gateForecast(0, start, gate, call, false).admitted;
assert.equal(forecast(0, 'scan'), 10);
assert.equal(forecast(0, 'right'), 11);
assert.equal(forecast(0, 'left'), 10);
assert.equal(gateStep(0, start, { ...scan, late: true }), null);
assert.equal(gateStep(0, start, { upgrade: 1 }), null);
assert.equal(readGateRun('{"draw":0,"moves":[{"gate":7}]}'), null);
console.log('Opening north gate forecast: scanner admits 10, right diversion 11, left diversion 10.');

// Keep the best legal four-wave route for each fixture, rotation and installed capacity.
const cache = new Map();
function bestNight(draw, s, hold) {
  const key = [s.night, draw >> (s.night * 2) & 3, s.wave, ...s.queue, ...s.capacity, s.seated, hold].join();
  if (cache.has(key)) return cache.get(key);
  let best = { seated: -1, moves: [] };
  for (let gate = 0; gate < 4; gate++) for (const call of ['scan', 'left', 'right']) {
    const move = { gate, call, late: hold && s.wave === 3 };
    const after = gateStep(draw, s, move);
    assert(after);
    const arriving = arrivals(draw, s.night, s.wave);
    assert.equal(after.seated - s.seated + total(after.queue), total(s.queue) + total(arriving));
    const tail = after.phase === 'wave' ? bestNight(draw, after, hold) : { seated: after.seated, moves: [] };
    if (tail.seated > best.seated) best = { seated: tail.seated, moves: [move, ...tail.moves] };
  }
  cache.set(key, best);
  return best;
}
function winningSeason(draw, holdNight, s = start) {
  const night = bestNight(draw, s, s.night === holdNight);
  if (night.seated < gateFixtures[s.night].target) return null;
  const end = night.moves.reduce((before, move) => gateStep(draw, before, move), s);
  if (end.phase === 'done') return night.moves;
  for (let upgrade = 0; upgrade < 4; upgrade++) {
    const move = { upgrade };
    const next = winningSeason(draw, holdNight, gateStep(draw, end, move));
    if (next) return [...night.moves, move, ...next];
  }
  return null;
}
let earlyHolds = 0, lateHolds = 0, losingSeasons = 0;
for (let draw = 0; draw < 64; draw++) {
  const early = winningSeason(draw, 0), late = winningSeason(draw, 2);
  earlyHolds += Number(Boolean(early));
  lateHolds += Number(Boolean(late));
  const moves = late || early || winningSeason(draw, 1);
  assert(moves, 'No winning season for draw ' + draw);
  let s = start;
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (s.phase === 'wave' && s.wave === 3 && s.usedLate) assert.equal(gateStep(draw, s, { ...scan, late: true }), null);
    s = gateStep(draw, s, move);
    assert.deepEqual(readGateRun(JSON.stringify({ draw, moves: moves.slice(0, i + 1) })).state, s);
  }
  assert.equal(s.phase, 'done');
  assert.equal(s.receipts.length, 3);
  assert(s.receipts.every(r => r.seated >= r.target));
  assert.equal(gateStep(draw, s, scan), null);
  const stubborn = moves.map(move => 'upgrade' in move ? { upgrade: 0 } : scan);
  const alternate = readGateRun(JSON.stringify({ draw, moves: stubborn })).state;
  losingSeasons += Number(alternate.receipts.some(r => r.seated < r.target));
}
assert(earlyHolds > 0 && lateHolds > 0);
assert.equal(losingSeasons, 64);
console.log('All 64 schedules met all three targets and restored every winning checkpoint.');
console.log(`Winning schedules with the kickoff held in the opener: ${earlyHolds}. With the hold in the final: ${lateHolds}.`);
console.log(`Scanning the same gate every wave missed a target on ${losingSeasons} of 64 schedules.`);
