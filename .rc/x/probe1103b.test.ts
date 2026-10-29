/* Round 1566 probe, run on the BASE tree (named rows): the Round 1103 hash with the men in counter order. Never committed. */
import { it } from 'vitest';
import { createHash } from 'node:crypto';
import { initNbaLeague, nbaRelease, nbaTipOff, NBA_ROUNDS, simRound, runNbaPlayoffs } from '@/lib/nbaFrontOffice';
import { nbaSeasonAwards, nbaMvpScore, nbaProductionScore, nbaDefenseScore, nbaLiveStats } from '@/lib/nbaSeasonStats';
import { foSeasonPlayers } from '@/lib/foSeasonStats';

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function play(seed: number): { sorted: string; unsorted: string } {
  const rng = mulberry32(seed * 7919 + 17);
  const keep = Math.random;
  Math.random = rng;
  try {
    const lg = initNbaLeague(rng);
    const me = Object.keys(lg.teams)[seed % 30];
    while (lg.teams[me].players.length > 15) {
      const worst = [...lg.teams[me].players].sort((a, b) => a.ovr - b.ovr)[0];
      if (!nbaRelease(lg.teams[me], lg.freeAgents, worst.id)) break;
    }
    nbaTipOff(lg, rng, me);
    for (let r = 1; r < NBA_ROUNDS; r += 1) { simRound(lg, me, rng); lg.round += 1; }
    simRound(lg, me, rng);
    runNbaPlayoffs(lg, rng);
    const awards = nbaSeasonAwards(lg);
    const stats = nbaLiveStats(lg);
    if (!awards || !stats) throw new Error('no lines');
    const men = foSeasonPlayers(stats);
    const counter = (id: string): number => Number(id.slice(id.lastIndexOf('-') + 1));
    const low = Math.min(...men.map(p => counter(p.id)));
    const rel = (id: string): number => counter(id) - low;
    const row = (p: (typeof men)[number]) => [rel(p.id), String(nbaMvpScore(lg, p)), String(nbaProductionScore(p)), String(nbaDefenseScore(p))];
    const told = JSON.stringify(awards, (k, v) => (k === 'id' && typeof v === 'string' ? rel(v) : v));
    const h = (rows: unknown[]) => createHash('sha256').update(told).update(JSON.stringify(rows)).digest('hex');
    return { sorted: h([...men].sort((a, b) => rel(a.id) - rel(b.id)).map(row)), unsorted: h(men.map(row)) };
  } finally {
    Math.random = keep;
  }
}

it('prints the base hashes', () => {
  for (const seed of [11, 23, 37, 41]) {
    const r = play(seed);
    console.log(`PROBE1103 ${seed} sorted ${r.sorted} unsorted ${r.unsorted}`);
  }
});
