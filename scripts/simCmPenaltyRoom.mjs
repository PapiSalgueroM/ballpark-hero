import assert from 'node:assert/strict';
import { penaltyExample } from './lib/cmPenaltyRoomFixture.mjs';

const control = process.env.PENALTY_CONTROL;
if (control) assert.equal(control, 'ignore-picks');
const { career, fixture, best, worst, play, game } = await penaltyExample(Boolean(control));
const saved = JSON.stringify(career);
let reversals = 0;
let example;
for (let draw = 0; draw < 512; draw++) {
  const first = play(draw, best), alternate = play(draw, worst);
  if (first.score.mine > first.score.theirs && alternate.score.mine < alternate.score.theirs) {
    reversals++;
    example ??= { draw, first: [first.score.mine, first.score.theirs], alternate: [alternate.score.mine, alternate.score.theirs] };
  }
  for (const { run, score } of [first, alternate]) {
    assert.deepEqual(game.readPenaltyRun(JSON.stringify(run), fixture), run);
    assert.deepEqual(game.penaltyScore(fixture, run), score);
  }
}
console.log(career.clubName, 'vs', fixture.opponent, '|', reversals, 'wins became losses in 512 matched shootouts.', example ?? '');
assert.notDeepEqual(best, worst);
assert(reversals > 0, 'Ignoring the manager must erase every matched winner reversal.');
assert.equal(JSON.stringify(career), saved);
// Follow the tested list from an actual save into a competitive cup result.
function seeded(key, action) {
  const random = Math.random;
  try { Math.random = game.keyedRng(key); return action(); }
  finally { Math.random = random; }
}
const cup = seeded('penalty-room-cup', () => {
  let state = game.startCareer('Real Madrid');
  const week = state.calendar.findIndex(e => e.type === 'cup');
  assert(week >= 0);
  while (state.week < week) {
    const next = game.playNextEntry(state, { skipHalftime: true, untilWeek: week }).state;
    assert(next.week > state.week);
    state = next;
  }
  return state;
});
const training = game.penaltyFixture(cup);
const trained = game.beginPenalties(training, 4, false);
for (const id of [...training.ids].reverse()) {
  if (game.penaltyScore(training, trained).done) break;
  trained.picks.push(id);
}
const savedOrder = JSON.parse(JSON.stringify(game.setShootoutOrder(cup, trained.picks)));
let competitive = false;
for (let n = 0; n < 80 && !competitive; n++) {
  const { report } = seeded('penalty-room-match/' + n, () => game.playNextEntry(savedOrder, { skipHalftime: true }));
  if (!report?.shootout) continue;
  const { myRatings, cards, injuries, subs } = report.detail;
  const onPitch = training.players.filter(p => myRatings.some(r => r.name === p.name)
    && !cards.some(c => c.id === p.id && c.kind === 'red') && !injuries.some(i => i.id === p.id) && !subs.some(s => s.off === p.name));
  const expected = trained.picks.map(id => onPitch.find(p => p.id === id)?.name).filter(Boolean);
  const taken = report.shootout.kicks.filter(k => k.side === 'me').map(k => k.taker);
  const count = Math.min(expected.length, taken.length);
  assert(count >= 2);
  assert.deepEqual(taken.slice(0, count), expected.slice(0, count));
  console.log(report.competition, 'shootout used', count, 'rehearsed takers still on the pitch:', taken.slice(0, count).join(', '));
  competitive = true;
}
assert(competitive, 'No actual cup shootout reached');
console.log('Penalty Room passed, including 1,024 finished checkpoints and a competitive shootout.');
