import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const control = process.env.BENCH_ORDER_CONTROL;
if (control) assert.equal(control, 'ignore');
const plugins = control ? [{ name: 'ignore-bench-order', setup(builder) {
  builder.onLoad({ filter: /clubManager\.ts$/ }, async ({ path }) => {
    const source = await readFile(path, 'utf8');
    const call = 'coachQuickMatch(s, opts?.benchOrder)';
    assert.equal(source.split(call).length, 2);
    return { loader: 'ts', contents: source.replace(call, 'coachQuickMatch(s)') };
  });
} }] : [];
const bundle = await build({ stdin: { resolveDir: process.cwd(), contents:
  "export { startCareer, nextFixture, playNextEntry, effectiveXIWithSlots, isAvailable } from './src/lib/clubManager';" },
  bundle: true, platform: 'node', format: 'esm', write: false, plugins });
const game = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
function seeded(seed, play) {
  const original = Math.random;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try { return play(); } finally { Math.random = original; }
}
const career = seeded(151, () => {
  let state = game.startCareer('Brentford');
  while (game.nextFixture(state).kind === 'window') state = game.playNextEntry(state).state;
  return state;
});
const before = JSON.stringify(career);
const xi = game.effectiveXIWithSlots(career).map(slot => slot.p);
const bench = career.squad.filter(p => game.isAvailable(p) && !xi.some(starter => starter.id === p.id));
const off = xi.find(p => p.position === 'ST' && bench.some(sub => sub.position === p.position));
assert(off, 'This fixture needs a starting striker with a reserve.');
const on = bench.find(p => p.position === off.position);
let taken = 0, missed = 0, different = 0;
for (let draw = 1; draw <= 24; draw++) {
  function run(when) {
    const benchOrder = when && { outId: off.id, inId: on.id, window: 'hour', when };
    return seeded(draw, () => game.playNextEntry(career, { skipHalftime: true, benchOrder }).report);
  }
  const ordinary = run();
  for (const when of ['ahead', 'not-ahead']) {
    const report = run(when), receipt = report.events[0] ?? '';
    if (receipt.includes('as instructed')) {
      assert(report.detail.subs.some(sub => sub.on === on.name && sub.off === off.name && sub.minute >= 58 && sub.minute <= 68));
      taken++;
      if (report.homeGoals !== ordinary.homeGoals || report.awayGoals !== ordinary.awayGoals) different++;
    } else if (receipt.includes('score condition missed')) {
      assert.deepEqual({ ...report, events: report.events.slice(1) }, ordinary);
      missed++;
    }
  }
}
console.log('Bench order:', on.name, 'for', off.name);
console.log(taken, 'orders produced their named substitution across 24 fixtures.');
console.log(missed, 'opposite score conditions preserved the ordinary match report.');
console.log(different, 'scorelines changed. The original save was held throughout.');
assert.equal(JSON.stringify(career), before);
assert.equal(missed, 24);
assert(taken > 0 && different > 0);
