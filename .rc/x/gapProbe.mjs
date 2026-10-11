/* Round 1303 probe (never committed). What reviews of GOALS ONLY do to goals a match, on the shipped goal rate.
 * The generated rates module is handed to the engine with missedFoulReview at 0, so no review ever gives a
 * penalty: that is the game with the goal kind on and the penalty kind off. Each fleet is the bands fleet of
 * scripts/simCmVar.mjs (20 clubs, one season a seed, the same match played with and without reviews).
 *   node .rc/x/gapProbe.mjs 31-36 41-46 ...
 * With KINDS=goal (after step 2) the engine is asked for the goal kind itself, on the generated rates as they are.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bundleCm, playFleet } from '../../scripts/lib/cmVarFleet.mjs';

const root = process.cwd();
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'gap-probe-'));
const generated = fs.readFileSync(path.join(root, 'src/data/clubManagerVarRates.ts'), 'utf8').replaceAll('\r\n', '\n');
const zeroed = generated.replace(/missedFoulReview: [0-9.]+/, 'missedFoulReview: 0');
if (zeroed === generated) throw new Error('gapProbe: the missedFoulReview rate was not found in the generated module');
const mode = process.env.KINDS === 'goal' ? 'kinds' : 'rates';
const cm = await bundleCm(root, folder, mode === 'rates' ? { ratesSource: zeroed } : {});
const r4 = x => Number(x.toFixed(4));
const rows = [];
for (const arg of process.argv.slice(2)) {
  const [a, b] = arg.split('-').map(Number);
  const seeds = Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const fleet = playFleet(cm, { seeds, paired: true, ...(mode === 'kinds' ? { reviews: ['goal'] } : {}) });
  const L = fleet.byKind.league, per = n => n / L.matches;
  const row = { seeds: arg, mode, matches: L.matches, ruledOut: L.ruledOut, ruledOutPerMatch: r4(per(L.ruledOut)), awarded: L.penaltyAwarded,
    goalsOn: r4(per(L.goals)), goalsOff: r4(per(L.goalsOff)), gap: r4((L.goals - L.goalsOff) / L.matches), resultMoved: L.resultMoved,
    resultMovedShare: r4(L.resultMoved / L.matches), matchesWithReview: L.matchesWithReview, penaltiesOn: r4(per(L.penalties)), penaltiesOff: r4(per(L.penaltiesOff)) };
  rows.push(row);
  console.log(`gapProbe ${JSON.stringify(row)}`);
}
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `gap-${process.argv.slice(2).join('_')}.json`), JSON.stringify(rows, null, 2));
const gaps = rows.map(r => r.gap);
console.log(`gapProbe: ${rows.length} fleet(s), goals a match moved by ${gaps.join(' ')} (the family's band is 0.05 either way).`);
