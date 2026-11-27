// Run normally, or set SIM_TWO_MINUTE_CONTROL=defense to ignore coverage on every snap.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

let source = await readFile(new URL('../src/lib/twoMinuteDrive.ts', import.meta.url), 'utf8');
const control = process.env.SIM_TWO_MINUTE_CONTROL || '';
assert(['', 'defense'].includes(control), 'Unknown Two-Minute Drive control');
if (control === 'defense') {
  const anchor = 'plays[action].yards[defense(s, d)]';
  assert.equal(source.split(anchor).length, 2, 'Expected exactly one live coverage lookup');
  source = source.replace(anchor, "plays[action].yards['shell']");
  assert(!source.includes(anchor));
  console.log('NEGATIVE CONTROL: all play yardage now uses deep coverage in the in-memory engine.');
}
const js = await transform(source, { loader: 'ts', format: 'esm' });
const { drives, defense, driveStep, fieldGoalYards, kickoff, playoffDrive, playoffLedger, readPlayoff, replayDrive } =
  await import('data:text/javascript;base64,' + Buffer.from(js.code).toString('base64'));
assert.equal(typeof playoffLedger, 'function', 'The production engine must expose a playable playoff run');

// These calls use only the visible read. They never consult the result of a future snap.
const attack = { pressure: 'screen', shell: 'draw', press: 'seam', sideline: 'seam' };
const misread = { pressure: 'seam', shell: 'seam', press: 'out', sideline: 'out' };
function play(scenario, strategy, spend) {
  let d = kickoff(scenario);
  const actions = [];
  while (!d.verdict) {
    assert(actions.length < 40, 'Possession failed to settle');
    const wantKick = scenario.deficit < 3 && fieldGoalYards(d) <= 55;
    const call = spend && d.running && d.timeouts ? 'timeout' : wantKick ? 'kick' : strategy[defense(scenario, d)];
    actions.push(call);
    d = driveStep(scenario, d, call);
    assert(d, 'The chosen action must be legal');
  }
  assert.equal(driveStep(scenario, d, 'out'), null, 'A settled drive cannot gain another snap');
  assert.deepEqual(replayDrive(scenario, actions), d, 'Stored calls reproduce every ending field and clock value');
  return { actions, d };
}

const draws = 9999;
let titles = 0, matchedLosses = 0, exactLedgers = 0, midDriveResumes = 0;
const spentByRound = [0, 0, 0], openings = new Set();
for (let draw = 1; draw <= draws; draw++) {
  const run = { draw, legs: [] };
  let timeouts = 1;
  const finals = [];
  for (let round = 0; round < 3; round++) {
    const scenario = playoffDrive(draw, round, timeouts);
    if (round === 0) openings.add(JSON.stringify([scenario.spot, scenario.seconds, scenario.looks]));
    const spendNow = round === (draw - 1) % 3;
    const good = play(scenario, attack, spendNow), bad = play(scenario, misread, spendNow);
    if (bad.d.verdict === 'loss') {
      const eliminated = { draw, legs: [...run.legs, bad.actions] };
      const ledger = playoffLedger(eliminated);
      assert.equal(ledger.length, round + 1, 'A loss must end the series immediately');
      assert.deepEqual(ledger[round].drive, bad.d);
      assert.equal(readPlayoff(JSON.stringify({ draw, legs: [...eliminated.legs, []] })), null, 'A save cannot advance a loss');
      matchedLosses++;
    }
    if (good.d.verdict !== 'win') break;
    const beforeFinalSnap = good.actions.slice(0, -1);
    const partial = readPlayoff(JSON.stringify({ draw, legs: [...run.legs, beforeFinalSnap] }));
    assert(partial, 'An unfinished possession can be resumed');
    const resumed = playoffLedger(partial)[round].drive;
    assert.equal(resumed.verdict, null);
    assert.deepEqual(driveStep(scenario, resumed, good.actions.at(-1)), good.d);
    midDriveResumes++;
    run.legs.push(good.actions);
    finals.push({ scenario, drive: good.d });
    const spent = good.actions.filter(call => call === 'timeout').length;
    assert.equal(spent, Number(spendNow), 'The designated round spends the one timeout');
    spentByRound[round] += spent;
    timeouts -= spent;
    assert.equal(good.d.timeouts, timeouts, 'Spent timeouts must stay spent');
    if (round === 2) {
      titles++;
      assert.equal(timeouts, 0);
      const restored = readPlayoff(JSON.stringify(run));
      assert.deepEqual(restored, run, 'A signed-out playoff save round-trips with the same actions');
      assert.deepEqual(playoffLedger(restored), finals, 'Reopen the same draw with the exact round starts, remaining timeout and results');
      exactLedgers++;
    }
  }
}
console.log(`Playoff draws ${draws}, distinct opening situations ${openings.size}, titles ${titles}, matched losing possessions ${matchedLosses}, exact saved ledgers ${exactLedgers}.`);
console.log(`Resumed the final snap from ${midDriveResumes} stored possessions.`);
console.log(`Timeout spent in wild card / conference final / championship: ${spentByRound.join(' / ')}.`);
assert(openings.size > 100, 'Sample must contain different field positions, clocks and coverage rotations');
assert.equal(titles, draws, 'Reading the visible defense can win all three games on every offered draw');
assert.equal(matchedLosses, draws * 3, 'A matched misread can lose every leg on the same starting setups');
assert.equal(exactLedgers, draws);
assert.deepEqual(spentByRound, [3333, 3333, 3333]);

// Draw 1, same five play calls in the championship. Compare two real winning paths into it.
for (const saveTimeout of [false, true]) {
  const run = { draw: 1, legs: [] };
  for (let round = 0; round < 2; round++) {
    const { scenario } = playoffLedger(run)[round];
    run.legs.push(play(scenario, attack, !saveTimeout && round === 0).actions);
  }
  const finish = ['screen', 'seam', 'screen', 'draw'];
  if (saveTimeout) finish.push('timeout');
  run.legs.push([...finish, 'seam']);
  const decider = playoffLedger(run)[2];
  assert.equal(decider.scenario.timeouts, Number(saveTimeout));
  assert.equal(decider.drive.verdict, saveTimeout ? 'win' : 'loss', 'Saving the timeout must change the championship on matched calls');
  assert.equal(decider.drive.spot, saveTimeout ? 100 : 80);
}
console.log('Draw 1 reached the end zone with the saved timeout. Spending it in the wild card left the same championship plays stranded on the opposing 20.');

const range = drives.find(s => s.id === 'range');
for (const [actions, seconds] of [[['out', 'seam', 'timeout', 'kick'], 13], [['out', 'seam', 'kick'], 5]]) {
  const setup = replayDrive(range, actions.slice(0, 2));
  assert.equal(fieldGoalYards(setup), 54);
  const final = replayDrive(range, actions);
  assert.equal(final.verdict, 'win');
  assert.equal(final.seconds, seconds);
}
const pressure = drives.find(s => s.id === 'pressure');
const repeated = replayDrive(pressure, ['screen', 'screen']);
assert.equal(defense(pressure, repeated), 'press', 'Two screens draw a new coverage');
assert.equal(driveStep(pressure, repeated, 'screen').spot - repeated.spot, 4);
const fourth = drives.find(s => s.id === 'last');
assert.equal(replayDrive(fourth, ['out']).verdict, 'loss');
assert.equal(replayDrive(fourth, ['draw', 'seam', 'kick']).verdict, 'tie');
console.log('54-yard practice kick: 13 seconds left using the timeout, 5 without. Fourth-down turnover and overtime kick both settled.');
console.log('simTwoMinuteDrive: green. All draws have a championship path, a losing alternative and an exact replay. Clock, fourth down and overtime rules held.');
