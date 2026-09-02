/* Round 299: one seeded stream for every stochastic harness.

   The board runs 124 harnesses, and the unseeded ones each flip rarely; run
   the whole population often enough and SOMETHING is red most boards, which
   trains people to rerun until green. Tonight alone: simHalftime's Round 271
   ghost, then simAwardRaces at 47, then simFinance at 1.15x, three different
   harnesses, one cause. The house rule (simBallonDorFairness, Round 226) is
   seed the arms rather than widen the bars, so this module is that rule as
   an import: bring it in as the FIRST import of a harness and every
   Math.random draw in the harness and the engine code it bundles becomes
   deterministic, seeded per harness from its own filename so different
   harnesses still walk different streams.

   A harness that fails WITH its fixed sample is a real conversation about
   the threshold, had once, instead of a coin toss had nightly.

   SIM_SEED=<number> overrides the filename seed to re-measure on a fresh
   stream on purpose (e.g. checking a threshold against ten different
   samples). That is a deliberate act with the number in your shell history,
   not the default. */

import { basename } from 'node:path';

function hashString(s) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const envSeed = Number(process.env.SIM_SEED);
let a = (Number.isFinite(envSeed) ? envSeed : hashString(basename(process.argv[1] || 'harness'))) >>> 0;

Math.random = () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
