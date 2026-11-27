import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

export async function penaltyExample(ignorePicks = false) {
  const plugins = ignorePicks ? [{ name: 'ignore-penalty-calls', setup(builder) {
    builder.onLoad({ filter: /clubManagerPenaltyRoom\.ts$/ }, async ({ path }) => {
      const text = await readFile(path, 'utf8');
      const original = 'shootoutTakerOrder(run.picks, fixture.ids, fixture.keeper)';
      assert.equal(text.split(original).length, 2);
      return { loader: 'ts', contents: text.replace(original, 'run.baseline') };
    });
  } }] : [];
  const bundle = await build({ stdin: { resolveDir: process.cwd(), contents:
    "export { startCareer, nextFixture, playNextEntry, setShootoutOrder } from './src/lib/clubManager'; export * from './src/lib/clubManagerPenaltyRoom'; export { keyedRng } from './src/lib/keyedRng';" },
    bundle: true, write: false, format: 'esm', platform: 'node', plugins });
  const game = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
  const original = Math.random;
  let career;
  try {
    Math.random = game.keyedRng('brentford-camp');
    career = game.startCareer('Brentford');
    while (game.nextFixture(career).kind === 'window') career = game.playNextEntry(career).state;
  } finally { Math.random = original; }
  const fixture = game.penaltyFixture(career);
  const best = [...fixture.players].sort((a, b) => b.rating - a.rating).map(p => p.id);
  const worst = [...best].reverse();
  function play(draw, order, late = false) {
    const run = game.beginPenalties(fixture, draw, late);
    let score = game.penaltyScore(fixture, run);
    for (const id of order) {
      if (score.done) break;
      if (run.picks.includes(id)) continue;
      run.picks.push(id);
      score = game.penaltyScore(fixture, run);
    }
    assert(score.done);
    return { run, score };
  }
  return { career, fixture, best, worst, play, game };
}
