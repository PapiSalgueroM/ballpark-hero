import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

let source = await readFile(new URL('../src/lib/nbaClosingTime.ts', import.meta.url), 'utf8');
const control = process.env.SIM_CLOSING_CONTROL ?? '';
assert(['', 'backcourt'].includes(control), 'Unknown Closing Time control');
if (control) {
  const cost = 'state.backcourt ? 4 : 0';
  assert.equal(source.split(cost).length, 2, 'Expected exactly one applied crossing cost');
  source = source.replace(cost, '0');
  console.log('Control applied: the inbound now starts in the frontcourt without a timeout.');
}
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const { startClosing, playClosing, readClosing, closingScore } = await import('data:text/javascript;base64,' + Buffer.from(compiled.code).toString('base64'));
const calls = ['wing','corner','rim','shoot','hold','timeout','trap','foul','deny-rim','deny-corner'];
for (let game = 0; game < 3; game++) {
  const seen = new Set();
  const finishes = new Map();
  const visit = s => {
    if (s.side === 'result') {
      const line = s.receipts[0];
      assert.equal(s.clock, 0);
      assert.equal(line.result, s.home > s.away ? 'Win' : s.home < s.away ? 'Loss' : 'Overtime earned');
      finishes.set(line.result, (finishes.get(line.result) ?? 0) + 1);
      return;
    }
    const key = [s.home,s.away,s.clock,s.shotClock,s.side,s.ball,s.open,s.backcourt,s.timeout,s.replies].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    let legal = 0;
    for (const call of calls) {
      const next = playClosing(s, call);
      if (!next) continue;
      legal++;
      assert(next.clock < s.clock || (call === 'timeout' && s.timeout && !next.timeout && next.clock === s.clock));
      assert(next.shotClock <= Math.min(24, next.clock));
      visit(next);
    }
    assert(legal > 0, 'A live possession needs a playable decision');
  };
  visit(startClosing(game));
  assert(finishes.has('Win') && finishes.has('Loss'));
  console.log('Game', game + 1, 'reachable live states', seen.size, 'terminal decisions', Object.fromEntries(finishes));
}
const moves = ['rim','shoot','deny-rim','corner','shoot','deny-corner','hold','next','deny-corner','hold','next','foul'];
const set = extra => readClosing(JSON.stringify([...moves, ...extra])).state;
const win = set(['timeout','corner','shoot','deny-rim']);
const late = set(['corner']);
assert.deepEqual(win.receipts.map(r => [r.home,r.away]), [[99,96],[88,86],[104,103]]);
assert.equal(closingScore(win.receipts), 100);
assert.deepEqual([late.side, late.home, late.away], ['result', 101, 103]);
assert.equal(closingScore(late.receipts), 67);
console.log('Closing Time passed. The matched five-second inbound finished 104-103 with a timeout and 101-103 without one.');
