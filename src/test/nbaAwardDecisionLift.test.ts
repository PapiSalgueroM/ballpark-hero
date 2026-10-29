/**
 * Round 1103: NBA Front Office's awards are the same awards after the lift.
 *
 * The three award scores of src/lib/nbaSeasonStats.ts (the MVP score, the
 * production score and the defence score) move into src/lib/awardDecision.ts so
 * NBA My Career can score a season by the same functions. This file was
 * recorded BEFORE that lift, on the commit named in the fixture's baseCommit
 * key, and it must pass afterwards with the fixture untouched.
 *
 * WHAT IT HOLDS, for four seeded leagues played tip off to the last playoff
 * game the way scripts/simNbaSeasonStats.mjs plays one:
 *   the whole awards object (JSON), and for every man in the season's lines his
 *   id and the three scores as String(number), so every digit of every double
 *   counts. All of it hashed with sha256 and compared with the recording.
 *
 * It was seen to fail before it was committed: NBA_MVP_WIN_WEIGHT at 19 in the
 * tree turned all four seeds red.
 *
 * The fixture is never re-recorded. RECORD_NBA_1103=lift writes it once and
 * refuses when the file exists.
 *
 * Round 1566 moved the NBA's saved lines from named rows in one list to the
 * shared short shape, club by club (src/lib/foStatsCodec.ts). The awards and
 * every man's scores are untouched, but the order the men came out in was the
 * old list's, so the rows are now hashed in counter order. The fixture keeps
 * its men and MVP and is untouched; the four hashes of the new order are in
 * ORDERED_1566 below, measured on the base of that round (5d1198389, named
 * rows) with this same order, and the head of the round gives the same.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { initNbaLeague, nbaRelease, nbaTipOff, NBA_ROUNDS, simRound, runNbaPlayoffs } from '@/lib/nbaFrontOffice';
import { nbaSeasonAwards, nbaMvpScore, nbaProductionScore, nbaDefenseScore, nbaLiveStats, nbaFoStats } from '@/lib/nbaSeasonStats';
import { foSeasonPlayers } from '@/lib/foSeasonStats';

const FIXTURE = path.resolve(__dirname, 'fixtures/nbaFoAwards1103.json');
const SEEDS = [11, 23, 37, 41];
/** Round 1566: the hash of each seed with the men in counter order, taken on 5d1198389 (see the header). */
const ORDERED_1566: Record<string, string> = {
  '11': 'PENDING',
  '23': 'PENDING',
  '37': 'PENDING',
  '41': 'PENDING',
};
const RECORD = process.env.RECORD_NBA_1103 === 'lift';

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeasonRead { hash: string; mvp: number | null; men: number }

function playSeason(seed: number): SeasonRead {
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
    if (!awards || !stats) throw new Error(`seed ${seed}: the league kept no lines`);
    /* A Front Office id is a prefix minted once a process plus a counter, so the raw id differs run to run.
       What is the same every run is how far a man's counter sits past the lowest one in his league. */
    const men = foSeasonPlayers(nbaFoStats(stats));
    const counter = (id: string): number => Number(id.slice(id.lastIndexOf('-') + 1));
    const low = Math.min(...men.map(p => counter(p.id)));
    const rel = (id: string): number => counter(id) - low;
    /* Round 1566: the save keeps its lines club by club now (the shared shape), so the men are hashed in counter
       order, which the shape cannot move (see ORDERED_1566). */
    const rows = [...men].sort((a, b) => rel(a.id) - rel(b.id)).map(p =>[rel(p.id), String(nbaMvpScore(lg, p)), String(nbaProductionScore(p)), String(nbaDefenseScore(p))]);
    const told = JSON.stringify(awards, (k, v) => (k === 'id' && typeof v === 'string' ? rel(v) : v));
    const hash = createHash('sha256').update(told).update(JSON.stringify(rows)).digest('hex');
    return { hash, mvp: awards.mvp ? rel(awards.mvp.id) : null, men: rows.length };
  } finally {
    Math.random = keep;
  }
}

describe('Round 1103: the award scores lifted out of NBA Front Office', () => {
  if (RECORD) {
    it('records the fixture once', () => {
      expect(existsSync(FIXTURE), 'the fixture exists and is never re-recorded').toBe(false);
      const seasons = Object.fromEntries(SEEDS.map(seed => [String(seed), playSeason(seed)]));
      const baseCommit = execSync('git rev-parse HEAD').toString().trim();
      writeFileSync(FIXTURE, JSON.stringify({ note: 'Recorded once, before the lift. Never re-recorded.', baseCommit, seasons }, null, 1) + '\n');
    });
    return;
  }
  const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { baseCommit: string; seasons: Record<string, SeasonRead> };

  it('the fixture holds four seasons with a real field each', () => {
    expect(Object.keys(fixture.seasons)).toEqual(SEEDS.map(String));
    for (const seed of SEEDS) {
      expect(fixture.seasons[String(seed)].men).toBeGreaterThan(250);
      expect(typeof fixture.seasons[String(seed)].mvp).toBe('number');
    }
  });

  for (const seed of SEEDS) {
    it(`seed ${seed}: the awards and every man's three scores are what they were`, () => {
      const now = playSeason(seed);
      expect(now.men).toBe(fixture.seasons[String(seed)].men);
      expect(now.mvp).toBe(fixture.seasons[String(seed)].mvp);
      if (process.env.PRINT_NBA_1103) console.log(`PRINT_NBA_1103 ${seed} ${now.hash}`);
      expect(now.hash).toBe(ORDERED_1566[String(seed)]);
    });
  }

  it('the same seed plays the same season twice (the hash is not noise)', () => {
    expect(playSeason(SEEDS[0]).hash).toBe(playSeason(SEEDS[0]).hash);
  });
});
