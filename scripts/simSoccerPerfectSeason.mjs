import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = path.join(root, 'src');
const control = process.env.SIM_SOCCER_PS_CONTROL;
assert.ok(!control || control === 'flat-odds', 'Known Soccer Perfect Season control');

const { outputFiles } = await build({
  stdin: {
    contents: "export * from '@/lib/soccerPerfectSeason'; export { SOCCER_PS_ROSTER_2026 } from '@/data/soccerPerfectSeasonPool2026';",
    resolveDir: root,
  },
  alias: { '@': src }, bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: control ? [{
    name: 'flatten-soccer-perfect-season-odds',
    setup(builder) {
      builder.onLoad({ filter: /[\\/]soccerPerfectSeason\.ts$/ }, ({ path }) => {
        const original = readFileSync(path, 'utf8');
        const calculation = 'const win = Math.min(1, Math.max(0, weightedStrength / bestStrength) ** 12);';
        assert.equal(original.split(calculation).length, 2, 'One active odds calculation to replace');
        const contents = original.replace(calculation, 'const win = 1;');
        assert.notEqual(contents, original, 'Control changes the bundled engine');
        return { contents, loader: 'ts', resolveDir: src };
      });
    },
  }] : [],
});
const game = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));
const { SOCCER_PS_GAMES, SOCCER_PS_SLOTS, SOCCER_PS_ROSTER_2026, createSoccerRun, applySoccerAction, deriveSoccerRun } = game;

const rosterHash = createHash('sha256').update(JSON.stringify(SOCCER_PS_ROSTER_2026)).digest('hex');
assert.equal(rosterHash, '24ff704e89fa15c5d32a30ac8ea919b5ee06845e06620d37f91d613c790b4dc8', 'Daily roster contents and order are pinned');

const roster = new Map(SOCCER_PS_ROSTER_2026.map(([club, , players]) => [club, players]));
const cards = [...roster.values()].flat();
assert.equal(roster.size, 146);
assert.equal(new Set(cards.map(([id]) => id)).size, 557);
console.log('The pinned pool contains 557 real players at 146 clubs.');
for (const [index, slot] of SOCCER_PS_SLOTS.entries()) {
  const eligible = [...roster.values()].filter(club => club.some(card => card[4] & (1 << index)));
  assert.ok(eligible.length >= 32, slot.key + ' has spare eligible clubs after removals and rerolls');
}

function strengthBounds(order) {
  let reachable = new Map([[0, [0, 0]]]);
  for (const club of order) {
    const next = new Map();
    for (const [occupied, [min, max]] of reachable) {
      for (const [, , , rating, eligibility] of roster.get(club)) {
        for (const [index, slot] of SOCCER_PS_SLOTS.entries()) {
          const bit = 1 << index;
          if ((occupied & bit) || !(eligibility & bit)) continue;
          const mask = occupied | bit;
          const total = rating * slot.weight;
          const [low, high] = next.get(mask) ?? [Infinity, -Infinity];
          next.set(mask, [Math.min(low, min + total), Math.max(high, max + total)]);
        }
      }
    }
    reachable = next;
  }
  return reachable.get((1 << SOCCER_PS_SLOTS.length) - 1);
}

function finish(run, objective) {
  let view = deriveSoccerRun(run);
  while (view.currentClub) {
    assert.ok(view[objective], 'Every open draft has a legal pick');
    run = applySoccerAction(run, { type: 'pick', ...view[objective] });
    assert.ok(run, 'The chosen player and slot stay legal');
    view = deriveSoccerRun(run);
  }
  return view;
}

const samples = 32;
let weakPoints = 0;
let weakWins = 0;
let optimalPaths = 0;
for (let seed = 1; seed <= samples; seed++) {
  const run = seed % 2 === 0 ? createSoccerRun('daily', '2026-11-' + String(seed / 2).padStart(2, '0'))
    : createSoccerRun('unlimited', null, seed);
  const initial = deriveSoccerRun(run);
  const [min, max] = strengthBounds(initial.clubOrder);
  const strongest = finish(run, 'best');
  const weakest = finish(run, 'worst');
  assert.equal(strongest.weightedStrength, max, 'Strongest XI matches independent role allocation');
  assert.equal(weakest.weightedStrength, min, 'Weakest XI matches independent role allocation');
  assert.equal(strongest.season.wins, SOCCER_PS_GAMES);
  assert.equal(strongest.season.score, 100);
  assert.equal(strongest.season.perfect, true);
  weakPoints += weakest.season.points;
  weakWins += weakest.season.wins;
  if (max > min) optimalPaths++;
}
assert.ok(optimalPaths >= 30, 'Most club sequences contain meaningfully different XIs');
console.log('The strongest and weakest choices match the independent slot assignment for every paired draft.');
const gap = 114 - weakPoints / samples;
console.log(`${samples} paired drafts: best 38 wins and 114 points, weakest ${(weakWins / samples).toFixed(2)} wins and ${(weakPoints / samples).toFixed(2)} points on average. Gap ${gap.toFixed(2)} points.`);
assert.ok(gap > 40, 'Expected a mean paired points gap greater than 40');

function sql(file) {
  return readFileSync(path.join(root, 'supabase/migrations', file), 'utf8').replace(/--[^\n]*/g, '');
}
const migration = sql('20261112120000_soccer_perfect_season_cap.sql');
const ceiling = game.scoreSoccerMatches(Array(SOCCER_PS_GAMES).fill('W')).score;
assert.match(migration, new RegExp("insert\\s+into\\s+public\\.game_score_caps[\\s\\S]+?values\\s*\\('soccer-perfect-season',\\s*" + ceiling + ",[\\s\\S]+?on conflict\\s*\\(game\\)\\s+do nothing", 'i'));
const denominators = sql('20260830_leaderboard_score_caps.sql');
const board = sql('20261001220000_round_839_leaderboard_board_plan.sql');
assert.match(denominators, /create or replace view public\.game_denominators as[\s\S]+?coalesce\s*\(\s*c\.max_score,[\s\S]+?from public\.game_score_caps c;/i);
assert.match(board, /den as materialized\s*\(\s*select d\.game, d\.max_score from public\.game_denominators d/i);
assert.match(board, /join den on den\.game = gc\.game/i);
console.log('The staged 100-point cap matches the perfect score and is read by the global leaderboard denominator.');
