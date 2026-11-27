import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const control = process.env.TRIP_CONTROL;
assert(!control || control === 'boost');
const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: `
export * from './src/lib/conquestRoadTrip';
export * from './src/data/conquestSports';
export { NFL_CONQUEST_MAP } from './src/data/conquestData';
export { NHL_CONQUEST_MAP } from './src/data/conquestDataNhl';
export { MLB_CONQUEST_MAP } from './src/data/conquestDataMlb';` },
  bundle: true, format: 'esm', platform: 'node', write: false,
  plugins: control ? [{ name: 'trip-control', setup(build) {
    build.onLoad({ filter: /conquestRoadTrip\.ts$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8'), anchor = 'boosted ? tripRules[league].boost : 0';
      assert.equal(source.split(anchor).length, 2);
      console.log('Negative control removes the actual coaching boost.');
      return { loader: 'ts', contents: source.replace(anchor, '0') };
    });
  } }] : [],
});
const game = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
for (const league of ['nfl', 'mlb', 'nhl']) {
  const sport = game[league.toUpperCase() + '_IMPERIALISM'], map = game[league.toUpperCase() + '_CONQUEST_MAP'];
  const graph = game.tripNetwork(sport, map);
  const board = run => game.tripBoard(sport, league, graph, run);
  const next = (run, to, call) => ({ ...run, turns: [...run.turns, { to, call }] });
  let paired = 0, flips = 0, crowns = 0, short = 0, reroutes = 0, recoveries = 0;
  for (const team of graph.keys()) for (let seed = 0; seed < 64; seed++) {
    let run = { team, seed, turns: [] }, b = board(run);
    const opening = game.tripChoices(graph, b);
    assert(opening.length);
    assert.equal(board(next(run, team, 'regular')), null);
    const target = opening[seed % opening.length];
    const boosted = board(next(run, target, 'boost')), regular = board(next(run, target, 'regular'));
    paired++;
    assert(boosted.wins >= regular.wins);
    flips += boosted.wins - regular.wins;
    const traveled = board(next(next(run, target, 'boost'), team, 'travel'));
    assert.equal(traveled.at, team);
    assert.equal(traveled.supply, game.tripRules[league].capacity);
    assert.equal(traveled.wins, boosted.wins);
    assert(!game.tripChoices(graph, traveled).includes(target));
    if (game.tripChoices(graph, traveled).join() !== game.tripChoices(graph, boosted).join()) reroutes++;
    assert.equal(board(next(run, target, 'travel')), null);
    while (b.wins < game.TRIP_TARGET && run.turns.length < game.TRIP_DATES) {
      const routes = game.tripChoices(graph, b);
      if (routes.length) {
        routes.sort((a, c) => game.tripOdds(sport, league, team, c, false) - game.tripOdds(sport, league, team, a, false));
        const to = routes[0], call = b.supply && run.turns.length % 2 === 0 ? 'boost' : 'regular';
        if (!b.supply) assert.equal(board(next(run, to, 'boost')), null);
        run = next(run, to, call);
        const after = board(run);
        if (call === 'regular' && b.supply < game.tripRules[league].capacity) {
          const expected = Number(league === 'mlb' || (league === 'nhl' && after.log.at(-1).won));
          assert.equal(after.supply - b.supply, expected);
          recoveries += expected;
        }
      } else {
        const stop = b.stops.find(id => id !== b.at && game.tripChoices(graph, { ...b, at: id }).length) ?? b.stops.find(id => id !== b.at);
        run = next(run, stop, 'travel');
      }
      b = board(run);
      assert(b);
      assert.deepEqual(game.readTrip(sport, league, graph, JSON.stringify(run)).board, b);
      for (const log of b.log.filter(g => g.score)) {
        const [own, opp] = log.score.split(' to ').map(Number);
        assert.equal(own > opp, log.won);
        assert.notEqual(own, opp);
      }
    }
    assert.equal(board(next(run, team, 'travel')), null);
    if (b.wins === game.TRIP_TARGET) crowns++; else short++;
  }
  assert(flips > paired * 0.08, 'Spending a real coaching resource must reverse matched defeats');
  assert(crowns && short && reroutes);
  if (league !== 'nfl') assert(recoveries);
  assert.equal(game.readTrip(sport, league, graph, '{'), null);
  console.log(league.toUpperCase(), JSON.stringify({ paired, flips, crowns, short, reroutes, recoveries }));
}
